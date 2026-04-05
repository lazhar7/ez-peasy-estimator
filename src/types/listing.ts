import { InventoryItem } from "@/types/estimator";

export type ListingProviderId = "zillow";

export type ListingPhoto = {
  id: string;
  url: string;
  caption: string;
  roomHint?: string;
  source: "listing-photo" | "fallback";
};

export type ListingDetails = {
  provider: ListingProviderId;
  sourceUrl: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  stories?: number;
  yearBuilt?: number;
  propertyType?: string;
  description?: string;
};

export type RetrievedListing = {
  provider: ListingProviderId;
  retrievalStatus: "live" | "fallback";
  details: ListingDetails;
  photos: ListingPhoto[];
  retrievalNotes: string[];
};

export type ListingInferenceInput = {
  listing: RetrievedListing;
};

export type ListingInferenceProviderId =
  | "heuristic-fallback"
  | "openai-responses";

export type ListingInferenceMode = "heuristic" | "vision";

export type PipelineStageStatus = {
  stage: "listing-fetch" | "photo-collection" | "inventory-inference";
  label: string;
  status: "live" | "heuristic" | "fallback";
  detail: string;
};

export type ProviderInventoryRow = Omit<InventoryItem, "id"> & {
  externalId?: string;
};

export type ProviderInferenceOutput = {
  providerId: ListingInferenceProviderId;
  mode: ListingInferenceMode;
  inventoryRows: ProviderInventoryRow[];
  overallConfidence: number;
  assumptions: string[];
  narrative: string;
  providerNotes: string[];
  usedPhotoCount: number;
  debug?: InferenceDebugInfo;
};

export type InferenceDebugInfo = {
  debugEnabled: boolean;
  zillowPhotoExtractionStatus: "live" | "fallback";
  extractedPhotoCount: number;
  sentPhotoCount: number;
  providerRequested: string;
  providerUsed: string;
  modelUsed?: string;
  providerStatus: "success" | "fallback" | "not-requested";
  failureStage?: "zillow-retrieval" | "missing-photos" | "provider-config" | "provider-auth" | "provider-response" | "provider-network";
  failureReason?: string;
  normalizedInventoryRows: ProviderInventoryRow[];
  providerNotes: string[];
  overallConfidence: number;
};

export type ListingInferenceResult = {
  generatedInventory: InventoryItem[];
  overallConfidence: number;
  assumptions: string[];
  narrative: string;
  pipeline: PipelineStageStatus[];
  providerId: ListingInferenceProviderId;
  mode: ListingInferenceMode;
  providerNotes: string[];
  usedPhotoCount: number;
  debug?: InferenceDebugInfo;
};

export type ZillowIngestionResponse = {
  listing: RetrievedListing;
  inference: ListingInferenceResult;
  disclaimer: string;
  debugEnabled?: boolean;
};
