import { FLEET_PRODUCTS } from "@/lib/fleetProducts";
import { Card } from "@/components/ui/card";
import { Factory, ExternalLink } from "lucide-react";

/**
 * Admin-only fleet directory shown inside the Boardroom.
 * Read-only ledger of every PGVA Ventures fleet product (Tier 3 dossier),
 * each available as a build option inside Unicorn Box™ — single entity
 * per product, no duplication.
 */
export function FleetDirectory() {
  const active = FLEET_PRODUCTS.filter((p) => p.stage === "active");
  const concept = FLEET_PRODUCTS.filter((p) => p.stage === "concept");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Factory className="h-4 w-4" /> PGVA Ventures Fleet · Tier 3 Hardware/Consumer
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {FLEET_PRODUCTS.length} brands. Each is sellable through Unicorn Box™ as a build slot — entity ownership stays with PGVA Ventures.
          </p>
        </div>
        <a
          href="/unicorn-box/start"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Open Unicorn Box intake <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <Section title={`Active development (${active.length})`} accent="text-fluoro-gold">
        {active.map((p) => (
          <FleetCard key={p.id} p={p} />
        ))}
      </Section>

      <Section title={`Concept lab (${concept.length})`} accent="text-muted-foreground">
        {concept.map((p) => (
          <FleetCard key={p.id} p={p} />
        ))}
      </Section>

      <p className="text-[10px] text-muted-foreground">
        Source: <code>pgva-investor-portfolio.pdf</code> · canonical data in <code>src/lib/fleetProducts.ts</code>.
      </p>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`text-[10px] uppercase tracking-widest mb-2 ${accent}`}>{title}</p>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function FleetCard({ p }: { p: (typeof FLEET_PRODUCTS)[number] }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold tracking-wide">{p.display}</h3>
        <span className="text-[10px] font-mono text-muted-foreground">{p.valuation}</span>
      </div>
      <p className="text-xs">{p.tagline}</p>
      <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground/70">Sector:</span> {p.sector}</p>
      <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground/70">Moat:</span> {p.moat}</p>
      <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-2"><span className="font-semibold text-foreground/70">Unicorn Box ships:</span> {p.uboxDeliverable}</p>
      <a
        href={`/p/${p.id}`}
        className="mt-1 inline-flex items-center justify-center w-full rounded-md bg-primary text-primary-foreground text-xs font-bold py-2 hover:opacity-90"
      >
        Buy / Reserve {p.display} →
      </a>
    </Card>
  );
}
