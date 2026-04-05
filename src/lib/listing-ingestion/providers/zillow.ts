import { RetrievedListing } from "@/types/listing";

const ZILLOW_HOST_PATTERN = /(^|\.)zillow\.com$/i;

type PartialListingData = {
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  price?: number;
  propertyType?: string;
  description?: string;
  stories?: number;
  yearBuilt?: number;
  photos?: string[];
};

export async function retrieveZillowListing(url: string): Promise<RetrievedListing> {
  const normalizedUrl = normalizeZillowUrl(url);

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve Zillow listing: ${response.status}`);
    }

    const html = await response.text();
    const liveListing = parseZillowHtml(normalizedUrl, html);

    if (liveListing.photos.length === 0) {
      return createFallbackListing(normalizedUrl, [
        "Listing HTML was retrieved from Zillow.",
        "No supported listing photo URLs were parsed from the public page payload, so a fallback room/photo profile is being used.",
      ]);
    }

    return {
      ...liveListing,
      retrievalNotes: [
        "Listing HTML was retrieved directly from the Zillow URL.",
        "Listing details and photo candidates were parsed from public metadata and embedded page data.",
      ],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Zillow retrieval error";

    return createFallbackListing(normalizedUrl, [
      "Automatic Zillow retrieval could not be completed from the current environment.",
      `${message}. A structured fallback listing profile is being used so the estimator flow remains Zillow-first.`,
    ]);
  }
}

export function normalizeZillowUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);

  if (!ZILLOW_HOST_PATTERN.test(parsed.hostname)) {
    throw new Error("Only Zillow listing URLs are supported in this flow.");
  }

  parsed.hash = "";
  return parsed.toString();
}

function parseZillowHtml(url: string, html: string): RetrievedListing {
  const jsonLd = collectJsonLdData(html);
  const inlineData = collectInlineListingData(html);
  const mergedPhotos = dedupeUrls([
    ...(jsonLd.photos ?? []),
    ...(inlineData.photos ?? []),
    ...collectPhotoUrlsFromHtml(html),
  ]).slice(0, 18);

  const address =
    jsonLd.address ??
    inlineData.address ??
    readMetaContent(html, "og:title") ??
    "Zillow listing";

  return {
    provider: "zillow",
    retrievalStatus: "live",
    details: {
      provider: "zillow",
      sourceUrl: url,
      address,
      city: jsonLd.city ?? inlineData.city,
      state: jsonLd.state ?? inlineData.state,
      postalCode: jsonLd.postalCode ?? inlineData.postalCode,
      bedrooms: jsonLd.bedrooms ?? inlineData.bedrooms,
      bathrooms: jsonLd.bathrooms ?? inlineData.bathrooms,
      squareFeet: jsonLd.squareFeet ?? inlineData.squareFeet,
      price: jsonLd.price ?? inlineData.price,
      propertyType: jsonLd.propertyType ?? inlineData.propertyType,
      description:
        jsonLd.description ??
        inlineData.description ??
        readMetaContent(html, "description"),
      stories: jsonLd.stories ?? inlineData.stories,
      yearBuilt: jsonLd.yearBuilt ?? inlineData.yearBuilt,
    },
    photos: mergedPhotos.map((photoUrl, index) => ({
      id: `photo-${index + 1}`,
      url: photoUrl,
      caption: inferRoomHint(index),
      roomHint: inferRoomHint(index),
      source: "listing-photo",
    })),
    retrievalNotes: [],
  };
}

function collectJsonLdData(html: string): PartialListingData {
  const scripts = Array.from(
    html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  );

  const aggregate: PartialListingData = {};

  for (const [, scriptBody] of scripts) {
    const parsed = tryParseJson(scriptBody);
    if (!parsed) {
      continue;
    }

    for (const candidate of flattenJsonNodes(parsed)) {
      if (candidate && typeof candidate === "object") {
        aggregate.address ??=
          readString(candidate, ["name"]) ??
          formatPostalAddress(readUnknown(candidate, "address"));
        aggregate.city ??= readString(readUnknown(candidate, "address"), ["addressLocality"]);
        aggregate.state ??= readString(readUnknown(candidate, "address"), ["addressRegion"]);
        aggregate.postalCode ??= readString(readUnknown(candidate, "address"), ["postalCode"]);
        aggregate.bedrooms ??= readNumberish(candidate, ["numberOfRooms", "bedrooms"]);
        aggregate.bathrooms ??= readNumberish(candidate, ["numberOfBathroomsTotal", "bathrooms"]);
        aggregate.squareFeet ??=
          readNumberish(readUnknown(candidate, "floorSize"), ["value"]) ??
          readNumberish(candidate, ["floorSize", "livingArea"]);
        aggregate.price ??= readNumberish(candidate, ["price"]);
        aggregate.propertyType ??= readString(candidate, ["@type", "additionalProperty"]);
        aggregate.description ??= readString(candidate, ["description"]);
        aggregate.yearBuilt ??= readNumberish(candidate, ["yearBuilt"]);
        aggregate.photos = dedupeUrls([
          ...(aggregate.photos ?? []),
          ...collectUrlsFromUnknown(readUnknown(candidate, "image")),
          ...collectUrlsFromUnknown(readUnknown(candidate, "photo")),
        ]);
      }
    }
  }

  return aggregate;
}

function collectInlineListingData(html: string): PartialListingData {
  return {
    address:
      readJsonLikeString(html, /"streetAddress"\s*:\s*"([^"]+)"/) ??
      readJsonLikeString(html, /"address"\s*:\s*"([^"]+)"/),
    city: readJsonLikeString(html, /"addressLocality"\s*:\s*"([^"]+)"/),
    state: readJsonLikeString(html, /"addressRegion"\s*:\s*"([^"]+)"/),
    postalCode: readJsonLikeString(html, /"postalCode"\s*:\s*"([^"]+)"/),
    bedrooms:
      readJsonLikeNumber(html, /"bedrooms"\s*:\s*("?)([\d.]+)\1/) ??
      readJsonLikeNumber(html, /"bd"\s*:\s*("?)([\d.]+)\1/),
    bathrooms:
      readJsonLikeNumber(html, /"bathrooms"\s*:\s*("?)([\d.]+)\1/) ??
      readJsonLikeNumber(html, /"ba"\s*:\s*("?)([\d.]+)\1/),
    squareFeet:
      readJsonLikeNumber(html, /"floorSize"\s*:\s*\{[^}]*"value"\s*:\s*("?)([\d.]+)\1/) ??
      readJsonLikeNumber(html, /"livingArea"\s*:\s*("?)([\d.]+)\1/) ??
      readJsonLikeNumber(html, /"sqft"\s*:\s*("?)([\d,]+)\1/),
    price:
      readJsonLikeNumber(html, /"price"\s*:\s*("?)([\d,]+)\1/) ??
      readJsonLikeNumber(html, /"price"\s*:\s*\{\s*"value"\s*:\s*("?)([\d,]+)\1/),
    propertyType:
      readJsonLikeString(html, /"homeType"\s*:\s*"([^"]+)"/) ??
      readJsonLikeString(html, /"propertyTypeDimension"\s*:\s*"([^"]+)"/),
    description: readJsonLikeString(html, /"description"\s*:\s*"([^"]+)"/),
    yearBuilt: readJsonLikeNumber(html, /"yearBuilt"\s*:\s*("?)([\d]+)\1/),
    stories: readJsonLikeNumber(html, /"stories"\s*:\s*("?)([\d.]+)\1/),
    photos: [
      ...collectQuotedUrls(html, /"originalUrl"\s*:\s*"(https:\/\/[^"]+)"/g),
      ...collectQuotedUrls(html, /"url"\s*:\s*"(https:\/\/photos\.zillowstatic\.com\/[^"]+)"/g),
      ...collectQuotedUrls(html, /"jpeg"\s*:\s*"(https:\/\/[^"]+)"/g),
    ],
  };
}

function createFallbackListing(url: string, retrievalNotes: string[]): RetrievedListing {
  const seed = createSeedFromUrl(url);
  const bedrooms = 2 + (seed % 4);
  const bathrooms = 1.5 + ((seed % 3) * 0.5);
  const squareFeet = 1200 + (seed % 6) * 350;

  return {
    provider: "zillow",
    retrievalStatus: "fallback",
    details: {
      provider: "zillow",
      sourceUrl: url,
      address: "Zillow listing estimate",
      bedrooms,
      bathrooms,
      squareFeet,
      propertyType: squareFeet > 2200 ? "Single family" : "Townhouse / condo",
      description:
        "Fallback listing profile generated from the Zillow URL so the estimator can stay Zillow-first until direct retrieval is fully connected in every environment.",
    },
    photos: [
      { id: "fallback-1", url: "", caption: "Living room", roomHint: "Living Room", source: "fallback" },
      { id: "fallback-2", url: "", caption: "Primary bedroom", roomHint: "Primary Bedroom", source: "fallback" },
      { id: "fallback-3", url: "", caption: "Kitchen and dining", roomHint: "Kitchen", source: "fallback" },
      { id: "fallback-4", url: "", caption: "Garage or storage area", roomHint: "Garage", source: "fallback" },
    ],
    retrievalNotes,
  };
}

function collectPhotoUrlsFromHtml(html: string) {
  const matches = html.match(/https:\/\/photos\.zillowstatic\.com\/[^"'\\\s)]+/g) ?? [];
  return dedupeUrls(matches);
}

function collectQuotedUrls(html: string, regex: RegExp) {
  return Array.from(html.matchAll(regex), (match) => decodeEscapedUrl(match[1] ?? ""));
}

function readMetaContent(html: string, property: string) {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );

  return html.match(pattern)?.[1];
}

function readJsonLikeString(html: string, regex: RegExp) {
  const value = html.match(regex)?.[1];
  return value ? decodeEscapedText(value) : undefined;
}

function readJsonLikeNumber(html: string, regex: RegExp) {
  const match = html.match(regex);
  const value = match?.[2];

  if (!value) {
    return undefined;
  }

  const sanitized = Number(value.replaceAll(",", ""));
  return Number.isFinite(sanitized) ? sanitized : undefined;
}

function inferRoomHint(index: number) {
  const roomSequence = [
    "Living Room",
    "Kitchen",
    "Primary Bedroom",
    "Bedroom",
    "Dining Room",
    "Office",
    "Garage",
    "Patio",
  ];

  return roomSequence[index % roomSequence.length];
}

function createSeedFromUrl(url: string) {
  return Array.from(url).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(decodeEscapedText(value.trim()));
  } catch {
    return null;
  }
}

function flattenJsonNodes(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input.flatMap(flattenJsonNodes);
  }

  if (input && typeof input === "object") {
    const graph = readUnknown(input, "@graph");
    if (Array.isArray(graph)) {
      return graph.flatMap(flattenJsonNodes);
    }

    return [input];
  }

  return [];
}

function readUnknown(input: unknown, key: string) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  return (input as Record<string, unknown>)[key];
}

function readString(input: unknown, keys: string[]) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  for (const key of keys) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      return decodeEscapedText(value);
    }
  }

  return undefined;
}

function readNumberish(input: unknown, keys: string[]) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  for (const key of keys) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replaceAll(",", ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function collectUrlsFromUnknown(input: unknown): string[] {
  if (!input) {
    return [];
  }

  if (typeof input === "string") {
    return [decodeEscapedUrl(input)];
  }

  if (Array.isArray(input)) {
    return dedupeUrls(input.flatMap((entry) => collectUrlsFromUnknown(entry)));
  }

  if (typeof input === "object") {
    return dedupeUrls(
      Object.values(input as Record<string, unknown>).flatMap((entry) =>
        collectUrlsFromUnknown(entry),
      ),
    );
  }

  return [];
}

function formatPostalAddress(input: unknown) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const address = input as Record<string, unknown>;
  const parts = [
    typeof address.streetAddress === "string" ? address.streetAddress : undefined,
    typeof address.addressLocality === "string" ? address.addressLocality : undefined,
    typeof address.addressRegion === "string" ? address.addressRegion : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : undefined;
}

function dedupeUrls(urls: string[]) {
  return Array.from(
    new Set(
      urls
        .map((value) => decodeEscapedUrl(value))
        .filter((value) => value.startsWith("http")),
    ),
  );
}

function decodeEscapedText(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("\\u002F", "/")
    .replaceAll("\\/", "/")
    .replaceAll("\\u0026", "&")
    .replaceAll("\\n", " ")
    .replaceAll("\\t", " ");
}

function decodeEscapedUrl(value: string) {
  return decodeEscapedText(value).replaceAll("%2F", "/");
}
