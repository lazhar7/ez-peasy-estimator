import { createInventoryId } from "@/lib/estimator";
import { expandInventoryToBaseline } from "@/lib/ai-inference/post-process-baseline";
import { getVisionProviderConfig } from "@/lib/ai-inference/provider-config";
import { inferInventoryWithHeuristicProvider } from "@/lib/ai-inference/providers/heuristic";
import {
  inferInventoryWithVisionProvider,
  VisionProviderError,
} from "@/lib/ai-inference/providers/vision-api";
import {
  InferenceDebugInfo,
  ListingInferenceInput,
  ListingInferenceResult,
  ProviderInferenceOutput,
} from "@/types/listing";

export async function inferInventoryFromListing(
  input: ListingInferenceInput,
): Promise<ListingInferenceResult> {
  const config = getVisionProviderConfig();
  const livePhotoCount = input.listing.photos.filter(
    (photo) => photo.source === "listing-photo",
  ).length;

  let providerOutput: ProviderInferenceOutput;

  if (config.mode === "vision") {
    try {
      providerOutput = await inferInventoryWithVisionProvider(input);
    } catch (error) {
      const fallback = await inferInventoryWithHeuristicProvider(input);
      const classified = classifyFallbackError(error, input, config.debug, livePhotoCount);
      providerOutput = {
        ...fallback,
        providerNotes: [
          classified.failureReason ?? "Real vision provider was requested but not used.",
          ...fallback.providerNotes,
        ],
        debug: {
          ...classified,
          normalizedInventoryRows: fallback.inventoryRows,
          providerNotes: [
            classified.failureReason ?? "Real vision provider was requested but not used.",
            ...fallback.providerNotes,
          ],
          overallConfidence: fallback.overallConfidence,
        },
      };
    }
  } else {
    providerOutput = await inferInventoryWithHeuristicProvider(input);
    if (config.debug) {
      providerOutput.debug = {
        debugEnabled: true,
        zillowPhotoExtractionStatus: livePhotoCount > 0 ? "live" : "fallback",
        extractedPhotoCount: livePhotoCount,
        sentPhotoCount: 0,
        providerRequested: "heuristic",
        providerUsed: "heuristic-fallback",
        modelUsed: undefined,
        providerStatus: "not-requested",
        normalizedInventoryRows: providerOutput.inventoryRows,
        providerNotes: providerOutput.providerNotes,
        overallConfidence: providerOutput.overallConfidence,
      };
    }
  }

  const expanded = expandInventoryToBaseline({
    listing: input.listing,
    inventoryRows: providerOutput.inventoryRows,
    providerNotes: providerOutput.providerNotes,
  });

  providerOutput = {
    ...providerOutput,
    inventoryRows: expanded.inventoryRows,
    providerNotes: expanded.providerNotes,
    debug: providerOutput.debug
      ? {
          ...providerOutput.debug,
          normalizedInventoryRows: expanded.inventoryRows,
          providerNotes: expanded.providerNotes,
        }
      : undefined,
  };

  const generatedInventory = providerOutput.inventoryRows.map((row, index) => ({
    ...row,
    id: row.externalId || createInventoryId(`${providerOutput.mode}-${index}`),
  }));

  return {
    generatedInventory,
    overallConfidence: providerOutput.overallConfidence,
    assumptions: providerOutput.assumptions,
    narrative: providerOutput.narrative,
    providerId: providerOutput.providerId,
    mode: providerOutput.mode,
    providerNotes: providerOutput.providerNotes,
    usedPhotoCount: providerOutput.usedPhotoCount,
    debug: providerOutput.debug,
    pipeline: [
      {
        stage: "listing-fetch",
        label: "Listing fetch",
        status: input.listing.retrievalStatus === "live" ? "live" : "fallback",
        detail:
          input.listing.retrievalStatus === "live"
            ? "The app retrieved Zillow listing HTML and parsed public listing fields."
            : "The app could not complete Zillow retrieval in the current environment, so it generated a structured fallback listing profile from the URL.",
      },
      {
        stage: "photo-collection",
        label: "Photo collection",
        status: input.listing.photos.some((photo) => photo.source === "listing-photo")
          ? "live"
          : "fallback",
        detail: input.listing.photos.some((photo) => photo.source === "listing-photo")
          ? `Collected ${input.listing.photos.filter((photo) => photo.source === "listing-photo").length} listing photo candidates from Zillow page data.`
          : "No live listing photo URLs were available, so fallback room cues were used instead.",
      },
      {
        stage: "inventory-inference",
        label: "Inventory inference",
        status: providerOutput.mode === "vision" ? "live" : "heuristic",
        detail:
          providerOutput.mode === "vision"
            ? `A provider-based vision pipeline generated editable inventory rows using listing details and ${providerOutput.usedPhotoCount} live photo URLs.`
            : "A heuristic fallback provider generated editable inventory rows from listing details and room/photo cues.",
      },
    ],
  };
}

function classifyFallbackError(
  error: unknown,
  input: ListingInferenceInput,
  debugEnabled: boolean,
  livePhotoCount: number,
): Omit<InferenceDebugInfo, "normalizedInventoryRows" | "providerNotes" | "overallConfidence"> {
  const failureReason =
    error instanceof Error
      ? error.message
      : "Real vision provider failed for an unknown reason.";
  const failureStage =
    error instanceof VisionProviderError
      ? error.stage
      : input.listing.retrievalStatus === "fallback"
        ? "zillow-retrieval"
        : "provider-network";

  return {
    debugEnabled,
    zillowPhotoExtractionStatus: livePhotoCount > 0 ? "live" : "fallback",
    extractedPhotoCount: livePhotoCount,
    sentPhotoCount: failureStage === "missing-photos" ? 0 : livePhotoCount,
    providerRequested: "openai:vision",
    providerUsed: "heuristic-fallback",
    modelUsed: getVisionProviderConfig().model,
    providerStatus: "fallback",
    failureStage,
    failureReason,
  };
}
