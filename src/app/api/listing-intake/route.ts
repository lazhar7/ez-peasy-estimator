import { NextRequest, NextResponse } from "next/server";
import { getVisionProviderConfig } from "@/lib/ai-inference/provider-config";
import { inferInventoryFromListing } from "@/lib/ai-inference/listing-inventory";
import {
  HEURISTIC_ESTIMATE_DISCLAIMER,
  VISION_ESTIMATE_DISCLAIMER,
} from "@/lib/estimator";
import { ingestListingFromUrl } from "@/lib/listing-ingestion";

export async function POST(request: NextRequest) {
  try {
    const config = getVisionProviderConfig();
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json(
        { error: "A Zillow listing URL is required." },
        { status: 400 },
      );
    }

    const listing = await ingestListingFromUrl(url);
    const inference = await inferInventoryFromListing({ listing });

    return NextResponse.json({
      listing,
      inference,
      debugEnabled: config.debug,
      disclaimer:
        inference.mode === "vision"
          ? VISION_ESTIMATE_DISCLAIMER
          : HEURISTIC_ESTIMATE_DISCLAIMER,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected listing intake error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
