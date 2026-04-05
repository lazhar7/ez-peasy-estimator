import {
  EstimatorRates,
  InventoryItem,
  InventorySourceType,
  InventoryTotals,
  SourceDescriptor,
} from "@/types/estimator";

export const DEFAULT_RATES: EstimatorRates = {
  laborRatePerHour: 85,
  truckRatePerCubicFoot: 6.5,
  disposalRateMultiplier: 1,
};

export const VISION_ESTIMATE_DISCLAIMER =
  "AI generated estimated inventory based on listing photos and home details. Final volume and weight may vary depending on hidden contents, closets, storage, garage items, basement items, and items not visible in listing photos.";

export const HEURISTIC_ESTIMATE_DISCLAIMER =
  "Estimated inventory generated from listing details, listing photos, and room cues using a heuristic fallback model. Final volume and weight may vary depending on hidden contents, closets, storage, garage items, basement items, and items not visible in listing photos.";

export const SOURCE_DESCRIPTORS: SourceDescriptor[] = [
  {
    id: "zillow-url",
    label: "Zillow URL intake",
    description:
      "Primary flow: paste a Zillow listing URL and let the app pull available home details and listing photos first.",
    status: "ready",
  },
  {
    id: "listing-ingestion",
    label: "Listing ingestion layer",
    description:
      "Modular server-side architecture for provider retrieval, listing normalization, and future photo expansion.",
    status: "ready",
  },
  {
    id: "manual",
    label: "Manual fallback",
    description:
      "Keep the inventory editable and usable even when the listing retrieval is partial or you want to start from scratch.",
    status: "ready",
  },
  {
    id: "image-analysis",
    label: "AI photo analysis",
    description:
      "Abstraction is ready so richer image reasoning can be swapped in without rewriting the estimator UI.",
    status: "ready",
  },
];

export const CATEGORY_OPTIONS = [
  "Furniture",
  "Appliance",
  "Electronics",
  "Kitchen",
  "Decor",
  "Bedroom",
  "Garage",
  "Outdoor",
  "Misc",
] as const;

const STARTER_ITEMS: Array<Omit<InventoryItem, "id">> = [
  {
    area: "Living Room",
    name: "3-seat sofa",
    category: "Furniture",
    quantity: 1,
    cubicFeetEach: 65,
    estimatedWeightEach: 180,
    laborHoursEach: 0.8,
    disposalRateEach: 45,
    notes: "Main floor, standard carry distance",
    sourceType: "manual",
    confidence: 0.99,
  },
  {
    area: "Living Room",
    name: "Accent chair",
    category: "Furniture",
    quantity: 2,
    cubicFeetEach: 18,
    estimatedWeightEach: 35,
    laborHoursEach: 0.3,
    disposalRateEach: 18,
    notes: "",
    sourceType: "manual",
    confidence: 0.99,
  },
  {
    area: "Bedroom",
    name: "Queen mattress set",
    category: "Bedroom",
    quantity: 1,
    cubicFeetEach: 42,
    estimatedWeightEach: 150,
    laborHoursEach: 0.5,
    disposalRateEach: 35,
    notes: "Mattress + box spring",
    sourceType: "manual",
    confidence: 0.99,
  },
  {
    area: "Kitchen",
    name: "Dining table",
    category: "Kitchen",
    quantity: 1,
    cubicFeetEach: 30,
    estimatedWeightEach: 95,
    laborHoursEach: 0.4,
    disposalRateEach: 20,
    notes: "Seats four",
    sourceType: "manual",
    confidence: 0.99,
  },
  {
    area: "Garage",
    name: "Storage totes",
    category: "Garage",
    quantity: 8,
    cubicFeetEach: 4,
    estimatedWeightEach: 18,
    laborHoursEach: 0.08,
    disposalRateEach: 4,
    notes: "Mixed household contents",
    sourceType: "manual",
    confidence: 0.94,
  },
];

export function createStarterInventory(): InventoryItem[] {
  return STARTER_ITEMS.map((item, index) => ({
    ...item,
    id: `seed-${index}`,
  }));
}

export function createBlankItem(
  sourceType: InventorySourceType = "manual",
): InventoryItem {
  return {
    id: createInventoryId("row"),
    area: "Unassigned",
    name: "",
    category: "Misc",
    quantity: 1,
    cubicFeetEach: 0,
    estimatedWeightEach: 0,
    laborHoursEach: 0,
    disposalRateEach: 0,
    notes: "",
    sourceType,
    confidence: sourceType === "manual" ? 1 : 0.5,
  };
}

export function calculateTotals(
  items: InventoryItem[],
  rates: EstimatorRates,
): InventoryTotals {
  const pieceCount = items.reduce((sum, item) => sum + sanitizeNumber(item.quantity), 0);
  const cubicFeet = items.reduce(
    (sum, item) => sum + sanitizeNumber(item.quantity) * sanitizeNumber(item.cubicFeetEach),
    0,
  );
  const shipmentWeight = items.reduce(
    (sum, item) =>
      sum + sanitizeNumber(item.quantity) * sanitizeNumber(item.estimatedWeightEach),
    0,
  );
  const laborHours = items.reduce(
    (sum, item) => sum + sanitizeNumber(item.quantity) * sanitizeNumber(item.laborHoursEach),
    0,
  );
  const disposalCost = items.reduce(
    (sum, item) =>
      sum +
      sanitizeNumber(item.quantity) *
        sanitizeNumber(item.disposalRateEach) *
        sanitizeNumber(rates.disposalRateMultiplier),
    0,
  );
  const weightedConfidence = items.reduce(
    (sum, item) =>
      sum + sanitizeNumber(item.quantity) * normalizeConfidence(item.confidence ?? 0.85),
    0,
  );
  const averageConfidence = pieceCount > 0 ? weightedConfidence / pieceCount : 0;
  const laborRangeMultiplier = averageConfidence >= 0.82 ? 0.15 : 0.22;
  const laborCost = laborHours * sanitizeNumber(rates.laborRatePerHour);
  const truckCost = cubicFeet * sanitizeNumber(rates.truckRatePerCubicFoot);
  const laborHoursLow = laborHours * (1 - laborRangeMultiplier);
  const laborHoursHigh = laborHours * (1 + laborRangeMultiplier);
  const truckRecommendation = getTruckRecommendation(cubicFeet, shipmentWeight);
  const crewRecommendation = getCrewRecommendation(laborHours, cubicFeet);

  return {
    items: items.length,
    pieceCount,
    cubicFeet,
    shipmentWeight,
    laborHours,
    laborHoursLow,
    laborHoursHigh,
    laborCost,
    truckCost,
    disposalCost,
    averageConfidence,
    truckRecommendation,
    crewRecommendation,
    moveSummary: buildMoveSummary(truckRecommendation, crewRecommendation, laborHoursLow, laborHoursHigh),
    grandTotal: laborCost + truckCost + disposalCost,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(normalizeConfidence(value));
}

function getTruckRecommendation(cubicFeet: number, shipmentWeight: number) {
  if (cubicFeet <= 250 && shipmentWeight <= 3000) {
    return "Cargo van or 16 ft box truck";
  }

  if (cubicFeet <= 650 && shipmentWeight <= 7000) {
    return "20-26 ft box truck";
  }

  if (cubicFeet <= 1200 && shipmentWeight <= 12000) {
    return "26 ft truck plus overflow trailer";
  }

  return "Multiple trucks or semi coordination review";
}

function getCrewRecommendation(laborHours: number, cubicFeet: number) {
  if (laborHours <= 6 && cubicFeet <= 300) {
    return "2 movers";
  }

  if (laborHours <= 14 && cubicFeet <= 900) {
    return "3 movers";
  }

  return "4 movers";
}

function buildMoveSummary(
  truckRecommendation: string,
  crewRecommendation: string,
  laborHoursLow: number,
  laborHoursHigh: number,
) {
  return `${truckRecommendation} with ${crewRecommendation.toLowerCase()} and an estimated ${formatNumber(
    laborHoursLow,
  )}-${formatNumber(laborHoursHigh)} labor-hour window.`;
}

function normalizeConfidence(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function sanitizeNumber(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

export function createInventoryId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
