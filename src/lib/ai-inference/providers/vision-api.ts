import { InventoryCategory } from "@/types/estimator";
import {
  InferenceDebugInfo,
  ListingInferenceInput,
  ProviderInferenceOutput,
  ProviderInventoryRow,
} from "@/types/listing";
import {
  getVisionProviderConfig,
  isVisionProviderConfigured,
  VisionProviderConfig,
} from "@/lib/ai-inference/provider-config";

type VisionProviderRequest = {
  model: string;
  instructions: string;
  input: Array<{
    role: "user";
    content: Array<
      | {
          type: "input_text";
          text: string;
        }
      | {
          type: "input_image";
          image_url: string;
        }
    >;
  }>;
  text: {
    format: {
      type: "json_schema";
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
};

type OpenAIResponsesApiResponse = {
  id?: string;
  status?: string;
  error?: {
    message?: string;
  } | null;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
};

export async function inferInventoryWithVisionProvider(
  input: ListingInferenceInput,
): Promise<ProviderInferenceOutput> {
  const config = getVisionProviderConfig();

  if (!isVisionProviderConfigured(config)) {
    throw new VisionProviderError(
      "provider-config",
      "Vision mode is enabled, but the OpenAI provider is not fully configured. Check AI_VISION_ENDPOINT, AI_VISION_API_KEY or OPENAI_API_KEY, and AI_VISION_MODEL.",
    );
  }

  if (config.provider !== "openai") {
    throw new VisionProviderError(
      "provider-config",
      `Unsupported vision provider: ${config.provider}.`,
    );
  }

  const photoInputs = input.listing.photos
    .filter((photo) => Boolean(photo.url))
    .slice(0, config.maxPhotos);

  if (photoInputs.length === 0) {
    throw new VisionProviderError(
      "missing-photos",
      "No live Zillow photo URLs were available for real OpenAI vision inference.",
    );
  }

  const requestBody = buildOpenAIVisionRequest(input, photoInputs, config);

  const response = await fetch(config.endpoint!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey!}`,
      "x-ai-model": config.model!,
    },
    body: JSON.stringify(requestBody),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw classifyOpenAIHttpError(response.status, errorText);
  }

  const payload = (await response.json()) as OpenAIResponsesApiResponse;

  if (payload.error?.message) {
    throw new VisionProviderError(
      "provider-response",
      `OpenAI Responses API returned an application error: ${payload.error.message}`,
    );
  }

  const contentText = extractOutputText(payload);

  if (!contentText) {
    throw new VisionProviderError(
      "provider-response",
      "OpenAI Responses API returned no structured output text.",
    );
  }

  const parsed = safeJsonParse(contentText);

  if (!parsed) {
    throw new VisionProviderError(
      "provider-response",
      "OpenAI Responses API returned invalid JSON for the structured inventory response.",
    );
  }

  const inventoryRows = normalizeInventoryRows(
    (parsed as Record<string, unknown>).inventoryRows,
  );

  if (inventoryRows.length === 0) {
    throw new VisionProviderError(
      "provider-response",
      "OpenAI vision provider returned no usable normalized inventory rows.",
    );
  }

  const debug = buildVisionDebugInfo({
    input,
    inventoryRows,
    providerStatus: "success",
    providerUsed: "openai-responses",
    providerRequested: `${config.provider}:${config.mode}`,
    modelUsed: config.model,
    sentPhotoCount: photoInputs.length,
    providerNotes: [
      ...normalizeStringList((parsed as Record<string, unknown>).providerNotes, []),
      `OpenAI Responses API request completed with model ${config.model}.`,
      `Processed ${photoInputs.length} listing photo URL${photoInputs.length === 1 ? "" : "s"}.`,
    ],
    overallConfidence: normalizeConfidence(
      (parsed as Record<string, unknown>).overallConfidence,
      0.62,
    ),
    debugEnabled: config.debug,
  });

  return {
    providerId: "openai-responses",
    mode: "vision",
    inventoryRows,
    overallConfidence: debug.overallConfidence,
    assumptions: normalizeStringList(
      (parsed as Record<string, unknown>).assumptions,
      [
        "OpenAI vision estimated inventory from listing photos and listing details.",
      ],
    ),
    narrative: normalizeRequiredString(
      (parsed as Record<string, unknown>).narrative,
      `OpenAI Responses API generated the initial inventory from listing details and ${photoInputs.length} photo URLs.`,
    ),
    providerNotes: [
      ...debug.providerNotes,
    ],
    usedPhotoCount: photoInputs.length,
    debug,
  };
}

export function getVisionProviderAvailability(config: VisionProviderConfig = getVisionProviderConfig()) {
  return {
    configured: isVisionProviderConfigured(config),
    mode: config.mode,
    provider: config.provider,
    endpoint: config.endpoint,
    model: config.model,
  };
}

function buildOpenAIVisionRequest(
  input: ListingInferenceInput,
  photoInputs: ListingInferenceInput["listing"]["photos"],
  config: VisionProviderConfig,
): VisionProviderRequest {
  const listing = input.listing.details;
  const bedroomCount = Math.max(0, Math.round(listing.bedrooms ?? 0));
  const bathroomCount = Math.max(0, Math.round(listing.bathrooms ?? 0));
  const squareFeet = Math.max(0, Math.round(listing.squareFeet ?? 0));
  const listingSummary = [
    `Address: ${listing.address}`,
    listing.propertyType ? `Property type: ${listing.propertyType}` : null,
    bedroomCount > 0 ? `Bedrooms: ${bedroomCount}` : null,
    bathroomCount > 0 ? `Bathrooms: ${bathroomCount}` : null,
    squareFeet > 0 ? `Square feet: ${squareFeet}` : null,
    listing.stories ? `Stories: ${listing.stories}` : null,
    listing.yearBuilt ? `Year built: ${listing.yearBuilt}` : null,
    listing.description ? `Description: ${listing.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const roomCues = photoInputs
    .map(
      (photo, index) =>
        `Photo ${index + 1}: caption="${photo.caption}" room_hint="${
          photo.roomHint ?? "unknown"
        }" url="${photo.url}"`,
    )
    .join("\n");

  const estimatorGuidance = buildEstimatorGuidance({
    bedroomCount,
    squareFeet,
    propertyType: listing.propertyType,
    livePhotoCount: photoInputs.length,
  });

  return {
    model: config.model!,
    instructions:
      [
        "You are acting as an experienced household moving estimator, not a simple object detector.",
        "Estimate a probable full-home moving inventory from listing photos and home details.",
        "Use visible evidence first, then fill in likely standard household contents conservatively but realistically when rooms are only partially shown or not shown at all.",
        "Do not output an unrealistically sparse inventory for a normally furnished home.",
        "Think in terms of what usually moves out of a lived-in house: full bedroom sets, seating groups, dining furniture, office furniture, rugs, lamps, side tables, laundry appliances when justified, garage storage, and common boxed household contents.",
        "If the home is larger, has multiple bedrooms, or clearly has more rooms than are fully shown, infer likely baseline furniture coverage room by room.",
        "Avoid extreme minimalism unless the listing clearly looks vacant, staged-only, or unusually sparse.",
        "Keep confidence honest. Lower confidence when you infer hidden or only partially visible contents.",
        "Notes should clearly distinguish visible evidence from probable inferred contents.",
        "Return only structured JSON matching the provided schema.",
      ].join(" "),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Generate a probable moving inventory estimate from this Zillow listing.",
              "Think like a moving estimator doing a first-pass cube survey, not just an image tagger.",
              "Use the listing details, room hints, and visible furniture in the photos.",
              "Account directionally for hidden contents like closets, dressers, side tables, lamps, rugs, laundry items, office furniture, garage storage, basement items, and items not fully visible in listing photos.",
              "For each likely bedroom in a furnished home, consider whether a bed set, dresser, nightstands, lamps, rug, and boxes are likely present unless the listing strongly suggests otherwise.",
              "For living spaces, consider sofas, chairs, coffee tables, side tables, media consoles, lamps, rugs, and decor when justified by the photos.",
              "For dining and kitchen areas, consider dining tables, chairs, bar stools, kitchen boxes, pantry contents, and small furniture when justified.",
              "For offices, dens, bonus rooms, laundry rooms, garages, and outdoor areas, include probable furniture or storage if the home size and photos support it.",
              "Be conservative but do not undercount obvious household contents for a home of this size.",
              "Prefer a fuller, realistic first-pass move estimate over a sparse object list.",
              "Return JSON only.",
              "",
              "Listing details:",
              listingSummary,
              "",
              "Estimator guidance:",
              estimatorGuidance,
              "",
              "Photo room cues:",
              roomCues,
            ].join("\n"),
          },
          ...photoInputs.map((photo) => ({
            type: "input_image" as const,
            image_url: photo.url,
          })),
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "inventory_inference",
        strict: true,
        schema: INVENTORY_RESPONSE_SCHEMA,
      },
    },
  };
}

function buildEstimatorGuidance({
  bedroomCount,
  squareFeet,
  propertyType,
  livePhotoCount,
}: {
  bedroomCount: number;
  squareFeet: number;
  propertyType?: string;
  livePhotoCount: number;
}) {
  const guidance = [
    bedroomCount > 0
      ? `Expected baseline coverage: plan for approximately ${bedroomCount} furnished bedroom area${bedroomCount === 1 ? "" : "s"} unless the photos strongly indicate otherwise.`
      : "Expected baseline coverage: estimate at least one primary sleeping area if the home appears occupied.",
    squareFeet >= 2800
      ? "Large-home guidance: this size often includes multiple fully furnished bedrooms, larger living areas, more side furniture, more decor, more boxed contents, and more garage/storage overflow."
      : squareFeet >= 1800
        ? "Mid-size home guidance: expect a reasonably complete household with multiple bedroom sets, living room furniture, dining furniture, office or flex-space items, and moderate boxed contents."
        : "Smaller-home guidance: still assume a realistic lived-in baseline rather than just the few objects explicitly visible.",
    propertyType
      ? `Property-type guidance: use ${propertyType} as context for likely furniture density and storage areas.`
      : null,
    livePhotoCount <= 4
      ? "Limited-photo guidance: because only a small number of live listing photos are available, infer missing but standard room contents more actively while keeping confidence moderate."
      : "Photo-coverage guidance: use the visible photos to anchor likely whole-home coverage, not just directly detected objects.",
    "Include common supporting items when justified: nightstands, lamps, rugs, side tables, media pieces, boxed clothes/linen contents, and common storage items.",
    "If laundry appliances are likely present in a home of this type and size, include them when justified even if the laundry area is not clearly photographed.",
  ].filter(Boolean);

  return guidance.join("\n");
}

function extractOutputText(payload: OpenAIResponsesApiResponse) {
  const texts =
    payload.output?.flatMap((item) =>
      item.content?.flatMap((contentItem) =>
        contentItem.type === "output_text" && contentItem.text
          ? [contentItem.text]
          : [],
      ) ?? [],
    ) ?? [];

  return texts.join("\n").trim();
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function normalizeInventoryRows(input: unknown): ProviderInventoryRow[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((row) => normalizeInventoryRow(row))
    .filter((row): row is ProviderInventoryRow => Boolean(row));
}

function normalizeInventoryRow(input: unknown): ProviderInventoryRow | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const row = input as Record<string, unknown>;
  const name = normalizeString(row.name, "");

  if (!name) {
    return null;
  }

  return {
    externalId: normalizeString(row.externalId, undefined),
    area: normalizeRequiredString(row.area, "Unassigned"),
    name,
    category: normalizeCategory(row.category),
    quantity: normalizeNonNegativeNumber(row.quantity, 1),
    cubicFeetEach: normalizeNonNegativeNumber(row.cubicFeetEach, 0),
    estimatedWeightEach: normalizeNonNegativeNumber(row.estimatedWeightEach, 0),
    laborHoursEach: normalizeNonNegativeNumber(row.laborHoursEach, 0),
    disposalRateEach: normalizeNonNegativeNumber(row.disposalRateEach, 0),
    notes: normalizeRequiredString(row.notes, ""),
    sourceType: "ai-generated",
    confidence: normalizeConfidence(row.confidence, 0.55),
  };
}

function normalizeCategory(value: unknown): ProviderInventoryRow["category"] {
  const allowed = new Set<InventoryCategory>([
    "Furniture",
    "Appliance",
    "Electronics",
    "Kitchen",
    "Decor",
    "Bedroom",
    "Garage",
    "Outdoor",
    "Misc",
  ]);

  const normalized = normalizeRequiredString(value, "Misc");
  return allowed.has(normalized as InventoryCategory)
    ? (normalized as InventoryCategory)
    : "Misc";
}

function normalizeString(value: unknown, fallback: string | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeRequiredString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeConfidence(value: unknown, fallback: number) {
  const parsed = normalizeNonNegativeNumber(value, fallback);
  return Math.min(parsed, 1);
}

function buildVisionDebugInfo({
  input,
  inventoryRows,
  providerStatus,
  providerRequested,
  providerUsed,
  modelUsed,
  sentPhotoCount,
  providerNotes,
  overallConfidence,
  debugEnabled,
  failureStage,
  failureReason,
}: {
  input: ListingInferenceInput;
  inventoryRows: ProviderInventoryRow[];
  providerStatus: InferenceDebugInfo["providerStatus"];
  providerRequested: string;
  providerUsed: string;
  modelUsed?: string;
  sentPhotoCount: number;
  providerNotes: string[];
  overallConfidence: number;
  debugEnabled: boolean;
  failureStage?: InferenceDebugInfo["failureStage"];
  failureReason?: string;
}): InferenceDebugInfo {
  const extractedPhotoCount = input.listing.photos.filter(
    (photo) => photo.source === "listing-photo",
  ).length;

  return {
    debugEnabled,
    zillowPhotoExtractionStatus:
      extractedPhotoCount > 0 ? "live" : "fallback",
    extractedPhotoCount,
    sentPhotoCount,
    providerRequested,
    providerUsed,
    modelUsed,
    providerStatus,
    failureStage,
    failureReason,
    normalizedInventoryRows: inventoryRows,
    providerNotes,
    overallConfidence,
  };
}

function classifyOpenAIHttpError(status: number, errorText: string) {
  const message = errorText.slice(0, 300);

  if (status === 401 || status === 403) {
    return new VisionProviderError(
      "provider-auth",
      `OpenAI authentication failed with status ${status}. Check OPENAI_API_KEY or AI_VISION_API_KEY. ${message}`,
    );
  }

  if (status === 400 || status === 422) {
    return new VisionProviderError(
      "provider-response",
      `OpenAI rejected the vision request with status ${status}. This usually means the request shape, model, or image inputs were not accepted. ${message}`,
    );
  }

  if (status >= 500) {
    return new VisionProviderError(
      "provider-network",
      `OpenAI server error ${status}. ${message}`,
    );
  }

  return new VisionProviderError(
    "provider-network",
    `OpenAI vision request failed with status ${status}. ${message}`,
  );
}

export class VisionProviderError extends Error {
  constructor(
    public readonly stage: InferenceDebugInfo["failureStage"],
    message: string,
  ) {
    super(message);
    this.name = "VisionProviderError";
  }
}

const INVENTORY_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    inventoryRows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          externalId: { type: "string" },
          area: { type: "string" },
          name: { type: "string" },
          category: {
            type: "string",
            enum: [
              "Furniture",
              "Appliance",
              "Electronics",
              "Kitchen",
              "Decor",
              "Bedroom",
              "Garage",
              "Outdoor",
              "Misc",
            ],
          },
          quantity: { type: "number" },
          cubicFeetEach: { type: "number" },
          estimatedWeightEach: { type: "number" },
          laborHoursEach: { type: "number" },
          disposalRateEach: { type: "number" },
          notes: { type: "string" },
          confidence: { type: "number" },
        },
        required: [
          "area",
          "name",
          "category",
          "quantity",
          "cubicFeetEach",
          "estimatedWeightEach",
          "laborHoursEach",
          "disposalRateEach",
          "notes",
          "confidence",
        ],
        additionalProperties: false,
      },
    },
    overallConfidence: { type: "number" },
    assumptions: {
      type: "array",
      items: { type: "string" },
    },
    narrative: { type: "string" },
    providerNotes: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "inventoryRows",
    "overallConfidence",
    "assumptions",
    "narrative",
    "providerNotes",
  ],
  additionalProperties: false,
} as const;
