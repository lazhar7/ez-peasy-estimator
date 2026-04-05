import { createInventoryId } from "@/lib/estimator";
import {
  ListingInferenceInput,
  ListingPhoto,
  ProviderInferenceOutput,
  ProviderInventoryRow,
} from "@/types/listing";

const PHOTO_ROOM_INVENTORY = {
  "Living Room": [
    {
      area: "Living Room",
      name: "Sofa",
      category: "Furniture",
      quantity: 1,
      cubicFeetEach: 65,
      estimatedWeightEach: 180,
      laborHoursEach: 0.8,
      disposalRateEach: 42,
      notes: "Heuristic fallback inferred from living room seating and common staging patterns",
      sourceType: "ai-generated",
      confidence: 0.73,
    },
    {
      area: "Living Room",
      name: "Coffee table",
      category: "Furniture",
      quantity: 1,
      cubicFeetEach: 12,
      estimatedWeightEach: 45,
      laborHoursEach: 0.2,
      disposalRateEach: 10,
      notes: "Heuristic fallback inferred from living room layout",
      sourceType: "ai-generated",
      confidence: 0.67,
    },
    {
      area: "Living Room",
      name: "TV stand or media console",
      category: "Electronics",
      quantity: 1,
      cubicFeetEach: 18,
      estimatedWeightEach: 60,
      laborHoursEach: 0.25,
      disposalRateEach: 12,
      notes: "Heuristic fallback inferred from visible entertainment area",
      sourceType: "ai-generated",
      confidence: 0.61,
    },
  ],
  Kitchen: [
    {
      area: "Kitchen",
      name: "Kitchen boxes",
      category: "Kitchen",
      quantity: 12,
      cubicFeetEach: 3,
      estimatedWeightEach: 22,
      laborHoursEach: 0.08,
      disposalRateEach: 3,
      notes: "Heuristic fallback inferred from cabinet count and kitchen square footage",
      sourceType: "ai-generated",
      confidence: 0.71,
    },
    {
      area: "Kitchen",
      name: "Dining set",
      category: "Kitchen",
      quantity: 1,
      cubicFeetEach: 30,
      estimatedWeightEach: 95,
      laborHoursEach: 0.45,
      disposalRateEach: 18,
      notes: "Heuristic fallback inferred from dining area presence",
      sourceType: "ai-generated",
      confidence: 0.64,
    },
  ],
  "Primary Bedroom": [
    {
      area: "Primary Bedroom",
      name: "King or queen bed set",
      category: "Bedroom",
      quantity: 1,
      cubicFeetEach: 50,
      estimatedWeightEach: 170,
      laborHoursEach: 0.6,
      disposalRateEach: 32,
      notes: "Heuristic fallback inferred from primary bedroom photo coverage",
      sourceType: "ai-generated",
      confidence: 0.72,
    },
    {
      area: "Primary Bedroom",
      name: "Dresser",
      category: "Bedroom",
      quantity: 1,
      cubicFeetEach: 24,
      estimatedWeightEach: 110,
      laborHoursEach: 0.35,
      disposalRateEach: 18,
      notes: "Heuristic fallback inferred from bedroom furniture density",
      sourceType: "ai-generated",
      confidence: 0.63,
    },
  ],
  Bedroom: [
    {
      area: "Bedroom",
      name: "Bedroom set",
      category: "Bedroom",
      quantity: 1,
      cubicFeetEach: 34,
      estimatedWeightEach: 120,
      laborHoursEach: 0.45,
      disposalRateEach: 25,
      notes: "Heuristic fallback inferred from secondary bedroom photo coverage",
      sourceType: "ai-generated",
      confidence: 0.66,
    },
  ],
  "Dining Room": [
    {
      area: "Dining Room",
      name: "Dining table and chairs",
      category: "Kitchen",
      quantity: 1,
      cubicFeetEach: 36,
      estimatedWeightEach: 120,
      laborHoursEach: 0.5,
      disposalRateEach: 22,
      notes: "Heuristic fallback inferred from dining room staging",
      sourceType: "ai-generated",
      confidence: 0.68,
    },
  ],
  Office: [
    {
      area: "Office",
      name: "Desk and chair",
      category: "Furniture",
      quantity: 1,
      cubicFeetEach: 20,
      estimatedWeightEach: 70,
      laborHoursEach: 0.35,
      disposalRateEach: 15,
      notes: "Heuristic fallback inferred from office setup",
      sourceType: "ai-generated",
      confidence: 0.62,
    },
  ],
  Garage: [
    {
      area: "Garage",
      name: "Garage storage",
      category: "Garage",
      quantity: 10,
      cubicFeetEach: 5,
      estimatedWeightEach: 24,
      laborHoursEach: 0.12,
      disposalRateEach: 4,
      notes: "Heuristic fallback inferred from garage or storage visibility",
      sourceType: "ai-generated",
      confidence: 0.55,
    },
  ],
  Patio: [
    {
      area: "Outdoor",
      name: "Patio furniture",
      category: "Outdoor",
      quantity: 1,
      cubicFeetEach: 24,
      estimatedWeightEach: 75,
      laborHoursEach: 0.35,
      disposalRateEach: 18,
      notes: "Heuristic fallback inferred from outdoor living area",
      sourceType: "ai-generated",
      confidence: 0.57,
    },
  ],
} as const;

type SupportedRoomHint = keyof typeof PHOTO_ROOM_INVENTORY;

export async function inferInventoryWithHeuristicProvider(
  input: ListingInferenceInput,
): Promise<ProviderInferenceOutput> {
  const { listing } = input;
  const inferred: ProviderInventoryRow[] = [];
  const livePhotos = listing.photos.filter((photo) => photo.source === "listing-photo");

  for (const photo of listing.photos) {
    const roomHint = normalizeRoomHint(photo);
    const templates = PHOTO_ROOM_INVENTORY[roomHint] ?? [];

    for (const template of templates) {
      inferred.push({
        ...template,
        externalId: createInventoryId("heuristic"),
        notes: `${template.notes}. Source photo: ${photo.caption}.`,
      });
    }
  }

  const bedroomCount = Math.max(0, Math.round(listing.details.bedrooms ?? 0));

  if (bedroomCount >= 3) {
    inferred.push({
      externalId: createInventoryId("heuristic"),
      area: "Bedrooms",
      name: "Additional bedroom boxes",
      category: "Bedroom",
      quantity: bedroomCount * 6,
      cubicFeetEach: 3,
      estimatedWeightEach: 18,
      laborHoursEach: 0.06,
      disposalRateEach: 3,
      notes: "Heuristic fallback inferred from total bedroom count and likely closet contents",
      sourceType: "ai-generated",
      confidence: 0.54,
    });
  }

  if ((listing.details.squareFeet ?? 0) >= 2200) {
    inferred.push({
      externalId: createInventoryId("heuristic"),
      area: "Whole Home",
      name: "Overflow decor and misc boxes",
      category: "Decor",
      quantity: 10,
      cubicFeetEach: 3,
      estimatedWeightEach: 16,
      laborHoursEach: 0.05,
      disposalRateEach: 2,
      notes: "Heuristic fallback inferred from larger square footage and likely hidden contents",
      sourceType: "ai-generated",
      confidence: 0.49,
    });
  }

  const inventoryRows = mergeDuplicateItems(inferred);
  const overallConfidence =
    inventoryRows.length > 0
      ? inventoryRows.reduce((sum, item) => sum + (item.confidence ?? 0.6), 0) /
        inventoryRows.length
      : 0.45;

  return {
    providerId: "heuristic-fallback",
    mode: "heuristic",
    inventoryRows,
    overallConfidence,
    assumptions: [
      "Visible rooms and listing photos drive the first-pass inventory guess.",
      "Bedrooms, square footage, and property type increase likely hidden box and storage counts.",
      "Closets, garages, basements, and storage rooms can materially increase the final move volume.",
    ],
    narrative:
      "The heuristic fallback provider maps listing details and room/photo cues into probable inventory rows for review and editing.",
    providerNotes: [
      livePhotos.length > 0
        ? `Used ${livePhotos.length} live listing photo URLs as room cues.`
        : "No live photo URLs were available, so fallback room cues were used.",
      "This mode does not run true image understanding or object detection.",
    ],
    usedPhotoCount: livePhotos.length,
  };
}

function normalizeRoomHint(photo: ListingPhoto): SupportedRoomHint {
  const hint = photo.roomHint?.toLowerCase() ?? photo.caption.toLowerCase();

  if (hint.includes("primary")) {
    return "Primary Bedroom";
  }

  if (hint.includes("bedroom")) {
    return "Bedroom";
  }

  if (hint.includes("kitchen")) {
    return "Kitchen";
  }

  if (hint.includes("dining")) {
    return "Dining Room";
  }

  if (hint.includes("office")) {
    return "Office";
  }

  if (hint.includes("garage")) {
    return "Garage";
  }

  if (hint.includes("patio") || hint.includes("outdoor")) {
    return "Patio";
  }

  return "Living Room";
}

function mergeDuplicateItems(
  items: ProviderInventoryRow[],
) {
  const merged = new Map<string, ProviderInventoryRow>();

  for (const item of items) {
    const key = `${item.area}-${item.name}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, item);
      continue;
    }

    const totalQuantity = existing.quantity + item.quantity;
    const blendedConfidence =
      ((existing.confidence ?? 0.6) * existing.quantity +
        (item.confidence ?? 0.6) * item.quantity) /
      totalQuantity;

    merged.set(key, {
      ...existing,
      quantity: totalQuantity,
      confidence: blendedConfidence,
      notes: `${existing.notes} ${item.notes}`.trim(),
    });
  }

  return Array.from(merged.values());
}
