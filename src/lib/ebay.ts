// eBay Partner Network affiliate link builder.
// Paste your Campaign ID below (from https://partnernetwork.ebay.com → Campaigns).
// Once set, every call to ebayAffiliateLink() returns a tracked URL.
// Until then, links fall back to a normal eBay search (still works, no commission).

export const EBAY_CAMPAIGN_ID = "5339151162"; // poke-pulse campaign (active)
export const EBAY_DEFAULT_CAMPAIGN_ID = "5339151161"; // default/empire-wide
export const EBAY_CUSTOM_TAG = "unicorn-empire";

/**
 * Build an eBay affiliate (rover) link for any product/card search query.
 * Works for: Pokémon cards, MTG, sports cards, sealed product, anything on eBay.
 */
export function ebayAffiliateLink(query: string, opts?: { customId?: string }): string {
  const search = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
  if (!EBAY_CAMPAIGN_ID) return search;

  const rover = new URL("https://rover.ebay.com/rover/1/711-53200-19255-0/1");
  rover.searchParams.set("icep_ff3", "9");
  rover.searchParams.set("pub", "5575378759"); // EPN publisher root
  rover.searchParams.set("toolid", "10001");
  rover.searchParams.set("campid", EBAY_CAMPAIGN_ID);
  rover.searchParams.set("customid", opts?.customId ?? EBAY_CUSTOM_TAG);
  rover.searchParams.set("mpre", search);
  return rover.toString();
}
