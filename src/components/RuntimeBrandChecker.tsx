import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useBrands } from "@/hooks/useBrands";

type Hit = { brand: string; expected: string; foundBare: number };

// Walks the live DOM (current page) and counts bare brand names missing their mark.
function scanDom(brands: { name: string; mark: string }[]): Hit[] {
  const text = document.body?.innerText ?? "";
  const hits: Hit[] = [];
  for (const b of brands) {
    const re = new RegExp(`\\b${b.name.replace(/\s+/g, "\\s+")}(?![™©®])`, "g");
    const matches = text.match(re);
    if (matches && matches.length > 0) {
      hits.push({ brand: b.name, expected: `${b.name}${b.mark}`, foundBare: matches.length });
    }
  }
  return hits;
}

export function RuntimeBrandChecker({ pageLabel = "current page" }: { pageLabel?: string }) {
  const { brands } = useBrands();
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // give the DOM a tick to render
    const t = setTimeout(() => setHits(scanDom(brands)), 100);
    return () => clearTimeout(t);
  }, [brands, tick]);

  if (hits === null) return null;

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Runtime DOM check</div>
          <div className="text-[10px] text-muted-foreground">Scanning rendered text on {pageLabel}.</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setTick(t => t + 1)}>
          <RefreshCw className="h-3 w-3 mr-1" /> Re-check
        </Button>
      </div>
      {hits.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> All brand mentions on this page carry the correct mark.
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-yellow-600">
            <AlertTriangle className="h-4 w-4" /> {hits.length} brand{hits.length === 1 ? "" : "s"} rendered without ™/©:
          </div>
          <ul className="text-xs space-y-0.5 pl-5 list-disc">
            {hits.map(h => (
              <li key={h.brand}>
                <strong>{h.brand}</strong> → expected <code>{h.expected}</code> ({h.foundBare} bare occurrence{h.foundBare === 1 ? "" : "s"})
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
