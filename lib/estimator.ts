import type { EstimateResult, ItemCategory } from "@/types";
import { parseInventory } from "./parser";
import {
  getMoveSize,
  getTruckSize,
  getCrewSize,
  getLaborTimeRange,
  getConfidence,
  needsMoreBoxes,
} from "./recommendations";

/**
 * Main estimation engine.
 * Takes raw inventory text, runs the full pipeline, and returns a typed result.
 */
export function runEstimate(rawInput: string): EstimateResult {
  const { items, hasMultiStop } = parseInventory(rawInput);

  // ── Totals ────────────────────────────────────────────────────────────────
  let totalCubicFeet = 0;
  let totalWeightLbs = 0;
  const categories = new Set<ItemCategory>();
  const specialItemNames: string[] = [];
  let boxCount = 0;

  for (const item of items) {
    totalCubicFeet += item.totalCubicFeet;
    totalWeightLbs  += item.totalWeightLbs;
    categories.add(item.category);

    if (item.isSpecial) {
      specialItemNames.push(item.label);
    }
    if (item.category === "box") {
      boxCount += item.qty;
    }
  }

  // Round per spec
  totalCubicFeet = Math.round(totalCubicFeet);
  totalWeightLbs = Math.round(totalWeightLbs / 10) * 10;
  const totalWeightTons = Math.round((totalWeightLbs / 2000) * 100) / 100;

  // ── Recommendations ───────────────────────────────────────────────────────
  const moveSize   = getMoveSize(totalCubicFeet);
  const truckSize  = getTruckSize(totalCubicFeet);
  const crewSize   = getCrewSize(totalCubicFeet, specialItemNames.length > 0);
  const laborTimeRange = getLaborTimeRange(totalCubicFeet, crewSize);

  const { confidence, missingCategories } = getConfidence(
    categories,
    items.length,
    totalCubicFeet
  );

  const hasMoreBoxes = needsMoreBoxes(boxCount, totalCubicFeet);

  return {
    items,
    totalCubicFeet,
    totalWeightLbs,
    totalWeightTons,
    moveSize,
    truckSize,
    crewSize,
    laborTimeRange,
    confidence,
    hasSpecialItems: specialItemNames.length > 0,
    specialItemNames,
    hasMultiStop,
    missingCategories,
    needsMoreBoxes: hasMoreBoxes,
    boxCount,
    itemCount: items.length,
  };
}
