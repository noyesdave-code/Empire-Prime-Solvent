// Single source of truth for all brand names + their marks.
// Reuse `BRAND.<key>` everywhere instead of hardcoding strings.

export type BrandMark = "™" | "©" | "®";

export type BrandEntry = {
  key: string;
  name: string;        // bare name without mark
  mark: BrandMark;
  display: string;     // name + mark (use this in JSX)
  category: "corporation" | "flagship" | "product" | "developing";
  notes?: string;
};

export const BRAND_REGISTRY: BrandEntry[] = [
  // Corporation / entity
  { key: "pgva", name: "PGVA Ventures", mark: "©", display: "PGVA Ventures©", category: "corporation",
    notes: "Founder/holding entity. Use © (copyright on the entity name)." },

  // Flagship platform
  { key: "uab", name: "Unicorn AI Builder", mark: "™", display: "Unicorn AI Builder™", category: "flagship",
    notes: "Top-level platform brand." },

  // Products
  { key: "ubox", name: "Unicorn Box", mark: "™", display: "Unicorn Box™", category: "product",
    notes: "$97/mo solo-founder business builder." },
  { key: "pod", name: "Personal Pod", mark: "™", display: "Personal Pod™", category: "product",
    notes: "Steel-supply living pod product line (waitlist + tier cascade)." },
  { key: "pulse", name: "Pulse", mark: "™", display: "Pulse™", category: "product",
    notes: "Pulse health/ops signal feature." },

  // Developing brands
  { key: "pyron", name: "PYRON", mark: "™", display: "PYRON™", category: "developing",
    notes: "Investor-tier unit-economics brand." },
];

export const BRAND = Object.fromEntries(
  BRAND_REGISTRY.map(b => [b.key, b.display])
) as Record<string, string>;

// Quick lookup of all bare names (for the scanner)
export const BRAND_BARE_NAMES = BRAND_REGISTRY.map(b => b.name);

// Site-wide policy ↓ rendered on /brand-marks
export const BRAND_POLICY = {
  rules: [
    { mark: "™", when: "Use on all product, flagship, and developing brand names (Unicorn AI Builder™, Unicorn Box™, Personal Pod™, Pulse™, PYRON™)." },
    { mark: "©", when: "Use on the corporation/entity name (PGVA Ventures©) and on full-page footers (e.g. © 2026 PGVA Ventures. All rights reserved.)." },
    { mark: "®", when: "Reserved for future use — only after a brand is officially registered with the USPTO. Do not apply preemptively." },
  ],
  whereApplied: [
    "Every visible page in the app (landing, Boardroom, Manual, Empire pages, legal pages).",
    "Every email subject + body that references a brand name.",
    "Every PDF / artifact generated under /mnt/documents/.",
    "Every meta tag (<title>, og:title, og:description) — yes, the mark renders in browser tabs.",
    "Bare names are allowed only inside code identifiers, file paths, URL slugs, and analytics events.",
  ],
  contactLinks: {
    support: "mailto:support@unicornaibuilder.com",
    status: "https://unicornaibuilder.lovable.app/",
  },
};
