import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BRAND_REGISTRY } from "@/lib/brand";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

// Pull every source file at build time so we can scan for bare brand names.
const SOURCES = import.meta.glob("/src/**/*.{tsx,ts}", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

type Hit = { file: string; line: number; brand: string; snippet: string };

function scan(): Hit[] {
  const hits: Hit[] = [];
  const SKIP = /\/(lib\/brand\.ts|components\/BrandAudit\.tsx|pages\/BrandMarks\.tsx)$/;
  for (const [file, src] of Object.entries(SOURCES)) {
    if (SKIP.test(file)) continue;
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      // Skip imports, comments, JSX prop names
      const trimmed = line.trim();
      if (trimmed.startsWith("import ") || trimmed.startsWith("//")) return;
      for (const b of BRAND_REGISTRY) {
        // Match bare name not already followed by ™/©/®
        const re = new RegExp(`\\b${b.name.replace(/\s+/g, "\\s+")}(?![™©®\\w])`, "g");
        let m: RegExpExecArray | null;
        while ((m = re.exec(line)) !== null) {
          // Skip if it's inside a code identifier-style context (URL/route slug)
          const ctx = line.slice(Math.max(0, m.index - 1), m.index + b.name.length + 1);
          if (/["'`/.][a-zA-Z]/.test(ctx) && !line.includes(">")) continue;
          hits.push({
            file: file.replace("/src/", "src/"),
            line: i + 1,
            brand: b.name,
            snippet: line.trim().slice(0, 140),
          });
        }
      }
    });
  }
  return hits;
}

export function BrandAudit() {
  const [version, setVersion] = useState(0);
  const hits = useMemo(() => scan(), [version]);
  const byBrand = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hits) m.set(h.brand, (m.get(h.brand) ?? 0) + 1);
    return m;
  }, [hits]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Brand Marks Audit</h2>
          <p className="text-xs text-muted-foreground">
            Scans every <code>.ts/.tsx</code> source file for brand names missing ™/©. Source of truth: <code>src/lib/brand.ts</code>.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setVersion(v => v + 1)}>
          <RefreshCw className="h-3 w-3 mr-1" /> Re-scan
        </Button>
      </div>

      {hits.length === 0 ? (
        <Card className="p-3 flex items-center gap-2 border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm">All clear — every brand mention carries the correct mark.</span>
        </Card>
      ) : (
        <>
          <Card className="p-3 border-yellow-500/30 bg-yellow-500/5 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
            <span className="text-sm">
              <strong>{hits.length}</strong> bare brand mention{hits.length === 1 ? "" : "s"} found across{" "}
              <strong>{new Set(hits.map(h => h.file)).size}</strong> file{new Set(hits.map(h => h.file)).size === 1 ? "" : "s"}.
            </span>
          </Card>

          <div className="flex flex-wrap gap-1">
            {Array.from(byBrand.entries()).map(([brand, n]) => (
              <code key={brand} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border">
                {brand}: {n}
              </code>
            ))}
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1 font-mono">file:line</th>
                    <th className="text-left px-2 py-1">brand</th>
                    <th className="text-left px-2 py-1">snippet</th>
                  </tr>
                </thead>
                <tbody>
                  {hits.map((h, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="px-2 py-1 font-mono text-[10px] whitespace-nowrap">{h.file}:{h.line}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{h.brand}</td>
                      <td className="px-2 py-1 font-mono text-[10px] text-muted-foreground">{h.snippet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
