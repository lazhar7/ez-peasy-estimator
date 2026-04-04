import type {
  MoveSize,
  TruckSize,
  CrewSize,
  Confidence,
  ItemCategory,
} from "@/types";
import { TYPICAL_CATEGORIES } from "./inventory-data";

// ─── Move size ────────────────────────────────────────────────────────────────

export function getMoveSize(totalCubicFeet: number): MoveSize {
  if (totalCubicFeet < 200) return "Studio";
  if (totalCubicFeet < 500) return "1 Bedroom";
  if (totalCubicFeet < 900) return "2 Bedroom";
  if (totalCubicFeet < 1400) return "3 Bedroom";
  return "3 Bedroom+";
}

// ─── Truck size ───────────────────────────────────────────────────────────────

export function getTruckSize(totalCubicFeet: number): TruckSize {
  // Add 20% buffer for packing and irregularity
  const buffered = totalCubicFeet * 1.2;

  if (buffered <= 500) return "10–12 ft truck";
  if (buffered <= 900) return "16 ft truck";
  if (buffered <= 1100) return "20 ft truck";
  if (buffered <= 1700) return "26 ft truck";
  return "Multiple trucks";
}

// ─── Crew size ────────────────────────────────────────────────────────────────

export function getCrewSize(totalCubicFeet: number, hasSpecialItems: boolean): CrewSize {
  if (totalCubicFeet < 300) return "2 movers";
  if (totalCubicFeet < 700) return "3 movers";
  if (totalCubicFeet < 1400) return "4 movers";
  return "4+ movers";
}

// ─── Labor time ───────────────────────────────────────────────────────────────

export function getLaborTimeRange(totalCubicFeet: number, crewSize: CrewSize): string {
  // Rough heuristic: ~100 cubic feet per mover-hour
  const movers = parseInt(crewSize.replace(/\D/g, ""), 10) || 2;
  const baseHours = totalCubicFeet / (movers * 100);
  const low  = Math.max(2, Math.floor(baseHours));
  const high = Math.ceil(baseHours * 1.4);

  if (low === high) return `${low} hrs`;
  return `${low}–${high} hrs`;
}

// ─── Confidence score ─────────────────────────────────────────────────────────

/**
 * Determine estimate confidence based on:
 * - Whether typical item categories are present
 * - Total item count relative to move size
 */
export function getConfidence(
  categories: Set<ItemCategory>,
  itemCount: number,
  totalCubicFeet: number
): { confidence: Confidence; missingCategories: string[] } {
  const missing: string[] = [];

  for (const cat of TYPICAL_CATEGORIES) {
    if (!categories.has(cat)) {
      missing.push(categoryLabel(cat));
    }
  }

  // For larger moves we expect more items
  const expectedMinItems = totalCubicFeet > 800 ? 10 : totalCubicFeet > 400 ? 6 : 3;

  if (missing.length === 0 && itemCount >= expectedMinItems) {
    return { confidence: "High", missingCategories: [] };
  }
  if (missing.length <= 1 || itemCount >= Math.floor(expectedMinItems * 0.6)) {
    return { confidence: "Medium", missingCategories: missing };
  }
  return { confidence: "Low", missingCategories: missing };
}

function categoryLabel(cat: ItemCategory): string {
  const labels: Record<ItemCategory, string> = {
    box:         "boxes / packed items",
    mattress:    "beds / mattresses",
    seating:     "seating (sofa, chairs)",
    table:       "tables",
    storage:     "dressers / storage",
    appliance:   "appliances",
    electronics: "electronics",
    decor:       "décor / lamps",
    special:     "special items",
    outdoor:     "outdoor items",
    unknown:     "miscellaneous items",
  };
  return labels[cat] ?? cat;
}

// ─── Packing check ────────────────────────────────────────────────────────────

export function needsMoreBoxes(boxCount: number, totalCubicFeet: number): boolean {
  // For a move over 400 cu ft we'd normally expect at least 15–20 boxes
  if (totalCubicFeet > 400 && boxCount < 15) return true;
  if (totalCubicFeet > 200 && boxCount < 8)  return true;
  return false;
}
