export type InventoryCategory =
  | "Furniture"
  | "Appliance"
  | "Electronics"
  | "Kitchen"
  | "Decor"
  | "Bedroom"
  | "Garage"
  | "Outdoor"
  | "Misc";

export type InventorySourceType =
  | "manual"
  | "zillow-url"
  | "image-analysis"
  | "ai-generated"
  | "inferred-baseline";

export type InventoryItem = {
  id: string;
  area: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  cubicFeetEach: number;
  estimatedWeightEach: number;
  laborHoursEach: number;
  disposalRateEach: number;
  notes: string;
  sourceType: InventorySourceType;
  confidence?: number;
};

export type SourceDescriptor = {
  id: InventorySourceType | "listing-ingestion";
  label: string;
  description: string;
  status: "ready" | "planned";
};

export type EstimatorRates = {
  laborRatePerHour: number;
  truckRatePerCubicFoot: number;
  disposalRateMultiplier: number;
};

export type InventoryTotals = {
  items: number;
  pieceCount: number;
  cubicFeet: number;
  shipmentWeight: number;
  laborHours: number;
  laborHoursLow: number;
  laborHoursHigh: number;
  laborCost: number;
  truckCost: number;
  disposalCost: number;
  averageConfidence: number;
  truckRecommendation: string;
  crewRecommendation: string;
  moveSummary: string;
  grandTotal: number;
};
