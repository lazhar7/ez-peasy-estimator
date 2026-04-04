// ─── Core item types ────────────────────────────────────────────────────────

export interface ItemSpec {
  cubicFeet: number;
  weightLbs: number;
  /** Free-text category for smart-check grouping */
  category: ItemCategory;
  /** True for items requiring special handling */
  special?: boolean;
}

export type ItemCategory =
  | "box"
  | "mattress"
  | "seating"
  | "table"
  | "storage"
  | "appliance"
  | "electronics"
  | "decor"
  | "special"
  | "outdoor"
  | "unknown";

// ─── Parsed inventory line ───────────────────────────────────────────────────

export interface ParsedItem {
  rawText: string;
  qty: number;
  label: string;        // Human-friendly display name
  cubicFeetEach: number;
  weightLbsEach: number;
  totalCubicFeet: number;
  totalWeightLbs: number;
  category: ItemCategory;
  isCustomEstimate: boolean;
  isSpecial: boolean;
}

// ─── Estimate output ─────────────────────────────────────────────────────────

export type MoveSize = "Studio" | "1 Bedroom" | "2 Bedroom" | "3 Bedroom" | "3 Bedroom+";
export type TruckSize = "10–12 ft truck" | "16 ft truck" | "20 ft truck" | "26 ft truck" | "Multiple trucks";
export type CrewSize = "2 movers" | "3 movers" | "4 movers" | "4+ movers";
export type Confidence = "High" | "Medium" | "Low";

export interface EstimateResult {
  items: ParsedItem[];
  totalCubicFeet: number;
  totalWeightLbs: number;
  totalWeightTons: number;
  moveSize: MoveSize;
  truckSize: TruckSize;
  crewSize: CrewSize;
  laborTimeRange: string;
  confidence: Confidence;
  hasSpecialItems: boolean;
  specialItemNames: string[];
  hasMultiStop: boolean;
  missingCategories: string[];
  needsMoreBoxes: boolean;
  boxCount: number;
  itemCount: number;
}
