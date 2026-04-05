import { retrieveZillowListing } from "@/lib/listing-ingestion/providers/zillow";
import { RetrievedListing } from "@/types/listing";

export async function ingestListingFromUrl(url: string): Promise<RetrievedListing> {
  const parsed = new URL(url);

  if (parsed.hostname.includes("zillow.com")) {
    return retrieveZillowListing(url);
  }

  throw new Error("Unsupported listing provider. Paste a Zillow listing URL.");
}
