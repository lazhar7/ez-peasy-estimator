import { ProviderInventoryRow, RetrievedListing } from "@/types/listing";

type BaselineExpansionResult = {
  inventoryRows: ProviderInventoryRow[];
  providerNotes: string[];
};

type BaselineTemplate = {
  key: string;
  row: ProviderInventoryRow;
};

export function expandInventoryToBaseline({
  listing,
  inventoryRows,
  providerNotes,
}: {
  listing: RetrievedListing;
  inventoryRows: ProviderInventoryRow[];
  providerNotes: string[];
}): BaselineExpansionResult {
  const currentCubicFeet = getTotalCubicFeet(inventoryRows);
  const minimumTarget = getMinimumBaselineCubicFeet(listing);

  if (currentCubicFeet >= minimumTarget) {
    return { inventoryRows, providerNotes };
  }

  const additions = buildBaselineAdditions(listing, inventoryRows, minimumTarget);

  if (additions.length === 0) {
    return { inventoryRows, providerNotes };
  }

  return {
    inventoryRows: [...inventoryRows, ...additions],
    providerNotes: [
      ...providerNotes,
      "Baseline inventory was expanded based on home size to avoid underestimation.",
    ],
  };
}

function buildBaselineAdditions(
  listing: RetrievedListing,
  inventoryRows: ProviderInventoryRow[],
  minimumTarget: number,
) {
  const additions: ProviderInventoryRow[] = [];
  const workingRows = [...inventoryRows];
  const existingRoomKeys = new Set(
    workingRows.map((row) => `${row.area.toLowerCase()}::${row.name.toLowerCase()}`),
  );
  const bedroomCount = Math.max(1, Math.round(listing.details.bedrooms ?? estimateBedroomsFromSquareFeet(listing.details.squareFeet ?? 0)));
  const targetPrimaryBedrooms = Math.max(1, Math.min(bedroomCount, 4));

  const templates: BaselineTemplate[] = [];

  for (let index = 0; index < targetPrimaryBedrooms; index += 1) {
    const area = index === 0 ? "Primary Bedroom" : `Bedroom ${index + 1}`;
    templates.push(
      baselineItem(`${area}-bed`, {
        area,
        name: index === 0 ? "Primary bed set" : "Bedroom set",
        category: "Bedroom",
        quantity: 1,
        cubicFeetEach: index === 0 ? 58 : 42,
        estimatedWeightEach: index === 0 ? 190 : 140,
        laborHoursEach: index === 0 ? 0.75 : 0.55,
        disposalRateEach: index === 0 ? 38 : 28,
        notes: "Baseline expansion inferred from home size and likely furnished bedroom coverage.",
        sourceType: "inferred-baseline",
        confidence: 0.38,
      }),
      baselineItem(`${area}-dresser`, {
        area,
        name: "Dresser",
        category: "Bedroom",
        quantity: 1,
        cubicFeetEach: 24,
        estimatedWeightEach: 110,
        laborHoursEach: 0.35,
        disposalRateEach: 18,
        notes: "Baseline expansion inferred from expected bedroom furniture.",
        sourceType: "inferred-baseline",
        confidence: 0.34,
      }),
      baselineItem(`${area}-nightstands`, {
        area,
        name: "Nightstands",
        category: "Bedroom",
        quantity: 2,
        cubicFeetEach: 6,
        estimatedWeightEach: 22,
        laborHoursEach: 0.1,
        disposalRateEach: 5,
        notes: "Baseline expansion inferred from standard bedroom setup.",
        sourceType: "inferred-baseline",
        confidence: 0.32,
      }),
    );
  }

  templates.push(
    baselineItem("living-sofa", {
      area: "Living Room",
      name: "Additional sofa or sectional seating",
      category: "Furniture",
      quantity: 1,
      cubicFeetEach: 70,
      estimatedWeightEach: 190,
      laborHoursEach: 0.85,
      disposalRateEach: 42,
      notes: "Baseline expansion inferred from expected main living room seating.",
      sourceType: "inferred-baseline",
      confidence: 0.36,
    }),
    baselineItem("living-seating", {
      area: "Living Room",
      name: "Accent seating",
      category: "Furniture",
      quantity: 2,
      cubicFeetEach: 16,
      estimatedWeightEach: 32,
      laborHoursEach: 0.18,
      disposalRateEach: 8,
      notes: "Baseline expansion inferred from likely living room completeness.",
      sourceType: "inferred-baseline",
      confidence: 0.33,
    }),
    baselineItem("dining-set", {
      area: "Dining Room",
      name: "Dining set",
      category: "Kitchen",
      quantity: 1,
      cubicFeetEach: 36,
      estimatedWeightEach: 120,
      laborHoursEach: 0.5,
      disposalRateEach: 22,
      notes: "Baseline expansion inferred from likely dining coverage.",
      sourceType: "inferred-baseline",
      confidence: 0.36,
    }),
    baselineItem("office-set", {
      area: "Office",
      name: "Desk and chair",
      category: "Furniture",
      quantity: 1,
      cubicFeetEach: 22,
      estimatedWeightEach: 72,
      laborHoursEach: 0.35,
      disposalRateEach: 16,
      notes: "Baseline expansion inferred from larger-home flex space or office use.",
      sourceType: "inferred-baseline",
      confidence: 0.28,
    }),
    baselineItem("laundry-pair", {
      area: "Laundry",
      name: "Washer and dryer pair",
      category: "Appliance",
      quantity: 1,
      cubicFeetEach: 34,
      estimatedWeightEach: 320,
      laborHoursEach: 0.65,
      disposalRateEach: 40,
      notes: "Baseline expansion inferred from likely laundry appliances in a lived-in home.",
      sourceType: "inferred-baseline",
      confidence: 0.26,
    }),
    baselineItem("garage-storage", {
      area: "Garage",
      name: "Garage and storage items",
      category: "Garage",
      quantity: 12,
      cubicFeetEach: 5,
      estimatedWeightEach: 24,
      laborHoursEach: 0.12,
      disposalRateEach: 4,
      notes: "Baseline expansion inferred from common garage and overflow storage contents.",
      sourceType: "inferred-baseline",
      confidence: 0.27,
    }),
    baselineItem("misc-boxes", {
      area: "Whole Home",
      name: "Miscellaneous household boxes",
      category: "Decor",
      quantity: getBoxCountForHome(listing),
      cubicFeetEach: 3,
      estimatedWeightEach: 18,
      laborHoursEach: 0.06,
      disposalRateEach: 3,
      notes: "Baseline expansion inferred from closets, linens, decor, pantry contents, and general household overflow.",
      sourceType: "inferred-baseline",
      confidence: 0.3,
    }),
  );

  for (const template of templates) {
    const rowKey = `${template.row.area.toLowerCase()}::${template.row.name.toLowerCase()}`;
    if (existingRoomKeys.has(rowKey)) {
      continue;
    }

    additions.push(template.row);
    workingRows.push(template.row);
    existingRoomKeys.add(rowKey);

    if (getTotalCubicFeet(workingRows) >= minimumTarget) {
      break;
    }
  }

  if (getTotalCubicFeet(workingRows) < minimumTarget) {
    additions.push({
      area: "Whole Home",
      name: "Additional baseline boxes and small furnishings",
      category: "Misc",
      quantity: Math.max(4, Math.ceil((minimumTarget - getTotalCubicFeet(workingRows)) / 6)),
      cubicFeetEach: 6,
      estimatedWeightEach: 28,
      laborHoursEach: 0.08,
      disposalRateEach: 4,
      notes: "Baseline expansion added to close the remaining gap to a realistic minimum home-size inventory.",
      sourceType: "inferred-baseline",
      confidence: 0.24,
    });
  }

  return additions;
}

function getMinimumBaselineCubicFeet(listing: RetrievedListing) {
  const bedrooms = Math.max(
    1,
    Math.round(listing.details.bedrooms ?? estimateBedroomsFromSquareFeet(listing.details.squareFeet ?? 0)),
  );
  const squareFeet = Math.max(0, Math.round(listing.details.squareFeet ?? 0));
  const propertyType = (listing.details.propertyType ?? "").toLowerCase();

  if (bedrooms <= 2) {
    return interpolateBaseline(squareFeet, 800, 1800, 300, 500);
  }

  if (bedrooms === 3) {
    return interpolateBaseline(squareFeet, 1400, 2600, 600, 900);
  }

  let baseline = interpolateBaseline(squareFeet, 2200, 4200, 900, 1400);

  if (propertyType.includes("single")) {
    baseline += 50;
  }

  return baseline;
}

function interpolateBaseline(
  value: number,
  minValue: number,
  maxValue: number,
  minBaseline: number,
  maxBaseline: number,
) {
  if (value <= minValue) {
    return minBaseline;
  }

  if (value >= maxValue) {
    return maxBaseline;
  }

  const ratio = (value - minValue) / (maxValue - minValue);
  return Math.round(minBaseline + ratio * (maxBaseline - minBaseline));
}

function estimateBedroomsFromSquareFeet(squareFeet: number) {
  if (squareFeet >= 2800) {
    return 4;
  }
  if (squareFeet >= 1800) {
    return 3;
  }
  return 2;
}

function getBoxCountForHome(listing: RetrievedListing) {
  const bedrooms = Math.max(1, Math.round(listing.details.bedrooms ?? 2));
  const squareFeet = Math.max(0, Math.round(listing.details.squareFeet ?? 0));

  if (bedrooms >= 4 || squareFeet >= 3000) {
    return 22;
  }
  if (bedrooms === 3 || squareFeet >= 1800) {
    return 16;
  }
  return 10;
}

function getTotalCubicFeet(rows: ProviderInventoryRow[]) {
  return rows.reduce((sum, row) => sum + row.quantity * row.cubicFeetEach, 0);
}

function baselineItem(key: string, row: ProviderInventoryRow): BaselineTemplate {
  return { key, row };
}
