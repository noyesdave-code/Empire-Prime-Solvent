import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { BRAND_POLICY } from "@/lib/brand";
import { useBrands } from "@/hooks/useBrands";
import { RuntimeBrandChecker } from "@/components/RuntimeBrandChecker";
import { ArrowLeft } from "lucide-react";

export default function BrandMarks() {
  const { brands } = useBrands();
  const grouped = {
    corporation: brands.filter(b => b.category === "corporation"),
    flagship: brands.filter(b => b.category === "flagship"),
    product: brands.filter(b => b.category === "product"),
    developing: brands.filter(b => b.category === "developing"),
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Home
          </Link>
          <h1 className="text-3xl font-bold mt-2">Brand Marks Policy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Single source of truth for trademark (™) and copyright (©) usage across PGVA Ventures© properties.
          </p>
        </div>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">When to use which mark</h2>
          <div className="space-y-2">
            {BRAND_POLICY.rules.map(r => (
              <Card key={r.mark} className="p-3">
                <div className="font-mono text-lg text-primary">{r.mark}</div>
                <p className="text-sm">{r.when}</p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Where the marks must appear</h2>
          <Card className="p-3">
            <ul className="text-sm space-y-1 list-disc pl-4">
              {BRAND_POLICY.whereApplied.map(w => <li key={w}>{w}</li>)}
            </ul>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Brand Registry</h2>
          {(["corporation", "flagship", "product", "developing"] as const).map(cat => (
            <div key={cat} className="mb-4">
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-1">{cat}</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {grouped[cat].map(b => (
                  <Card key={b.key} className="p-3">
                    <div className="text-base font-semibold">{b.display}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">key: {b.key} · bare: {b.name}</div>
                    {b.notes && <p className="text-xs text-muted-foreground mt-1">{b.notes}</p>}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Canonical contact links</h2>
          <Card className="p-3 text-sm space-y-1">
            <div>Support: <a className="text-primary underline" href={BRAND_POLICY.contactLinks.support}>{BRAND_POLICY.contactLinks.support}</a></div>
            <div>Status: <a className="text-primary underline" href={BRAND_POLICY.contactLinks.status} target="_blank" rel="noreferrer">{BRAND_POLICY.contactLinks.status}</a></div>
            <p className="text-xs text-muted-foreground pt-1">Never link to legacy <code>ai-builder-noyesdave.replit.app</code> URLs.</p>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Live page check</h2>
          <RuntimeBrandChecker pageLabel="/brand-marks" />
        </section>

        <footer className="pt-6 border-t border-border/40 text-xs text-muted-foreground">
          © 2026 PGVA Ventures©. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
