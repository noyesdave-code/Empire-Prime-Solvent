import { useBrands } from "@/hooks/useBrands";

export function IpTrademarksSection() {
  const { brands } = useBrands();
  return (
    <>
      <h2>IP &amp; Trademarks</h2>
      <p>
        The following marks are owned by PGVA Ventures© LLC and are used to identify our corporation, flagship platform, products, and developing brands. All rights reserved. Use of these marks without written permission is prohibited.
      </p>
      <ul>
        {brands.map(b => (
          <li key={b.key}>
            <strong>{b.display}</strong>
            {b.notes ? ` — ${b.notes}` : ""}
            <span className="text-xs text-muted-foreground"> ({b.category})</span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        ™ denotes a trademark claim. © denotes copyright on the entity name and associated original works. ® is reserved for federally registered marks only.
      </p>
    </>
  );
}
