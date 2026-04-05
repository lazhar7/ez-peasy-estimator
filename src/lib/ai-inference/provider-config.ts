import { ListingInferenceMode } from "@/types/listing";

export type VisionProviderConfig = {
  mode: ListingInferenceMode;
  provider: "openai";
  endpoint?: string;
  apiKey?: string;
  model?: string;
  maxPhotos: number;
  debug: boolean;
};

export function getVisionProviderConfig(): VisionProviderConfig {
  const mode = normalizeMode(process.env.AI_INFERENCE_PROVIDER);
  const provider = normalizeProvider(process.env.AI_VISION_PROVIDER);
  const baseUrl =
    process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const endpoint =
    process.env.AI_VISION_ENDPOINT?.trim() || `${baseUrl.replace(/\/$/, "")}/responses`;
  const maxPhotos = normalizeMaxPhotos(process.env.AI_VISION_MAX_PHOTOS);

  return {
    mode,
    provider,
    endpoint,
    apiKey:
      process.env.AI_VISION_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      undefined,
    model: process.env.AI_VISION_MODEL?.trim() || "gpt-4.1-mini",
    maxPhotos,
    debug: normalizeDebug(process.env.AI_INFERENCE_DEBUG),
  };
}

export function isVisionProviderConfigured(config: VisionProviderConfig) {
  return Boolean(config.endpoint && config.apiKey && config.model);
}

function normalizeMode(value: string | undefined): ListingInferenceMode {
  return value === "vision" ? "vision" : "heuristic";
}

function normalizeProvider(value: string | undefined): "openai" {
  return value === "openai" || value === undefined ? "openai" : "openai";
}

function normalizeMaxPhotos(value: string | undefined) {
  const parsed = value ? Number(value) : 8;
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 12) : 8;
}

function normalizeDebug(value: string | undefined) {
  return value === "1" || value === "true";
}
