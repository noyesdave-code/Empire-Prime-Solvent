import { useMemo, useState } from "react";
import { Sparkles, Factory, ChevronDown, ChevronUp } from "lucide-react";
import { FLEET_PRODUCTS, type FleetProduct } from "@/lib/fleetProducts";

type Props = {
  selectedId: string | null;
  onSelect: (p: FleetProduct | null) => void;
};

/**
 * Lets a Unicorn Box buyer pick one of the PGVA Ventures fleet products
 * (PYRON™, HEATSINK™, HARVESTLINK™, WATTSHARE™, BROWNOUT™, SHELFLIFE™,
 * MICROFEED™, SUBKILL™, TAXBACK™, LEAKSENSE™) as the thing Unicorn Box
 * will build a launch package for.
 *
 * The fleet entry remains a single entity owned by PGVA Ventures —
 * choosing one here just routes Unicorn Box to ship a customer-ready
 * launch package against that brand's spec.
 */
export function FleetPicker({ selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(true);
  const active = useMemo(() => FLEET_PRODUCTS.filter((p) => p.stage === "active"), []);
  const concept = useMemo(() => FLEET_PRODUCTS.filter((p) => p.stage === "concept"), []);

  const Card = ({ p }: { p: FleetProduct }) => {
    const selected = selectedId === p.id;
    return (
      <div
        className={`text-left rounded-xl p-3 border transition-all ${
          selected
            ? "border-primary bg-primary/10 shadow-[0_0_18px_hsl(var(--primary)/0.25)]"
            : "border-border bg-card hover:border-primary/50"
        }`}
      >
        <button type="button" onClick={() => onSelect(selected ? null : p)} className="w-full text-left">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h4 className="text-sm font-bold tracking-wide">{p.display}</h4>
            <span
              className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded ${
                p.stage === "active" ? "bg-fluoro-gold/20 text-fluoro-gold" : "bg-muted text-muted-foreground"
              }`}
            >
              {p.stage}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">{p.tagline}</p>
          <p className="text-[10px] mt-1 text-muted-foreground/80">{p.sector}</p>
        </button>
        <a
          href={`/p/${p.id}`}
          className="mt-2 inline-flex items-center justify-center w-full rounded-md bg-gradient-to-r from-fuchsia-500 to-amber-400 text-background text-[11px] font-bold py-1.5 hover:opacity-90"
        >
          Buy / Reserve →
        </a>
      </div>
    );
  };

  return (
    <section className="glass-strong rounded-2xl p-5 md:p-6 space-y-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">
            Build a fleet product <span className="text-muted-foreground font-normal">(optional)</span>
          </h2>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <>
          <p className="text-xs text-muted-foreground -mt-1">
            Skip the blank-canvas intake. Pick a PGVA Ventures fleet product and Unicorn Box™ will ship a launch package
            against its dossier-spec — brand pack, landing copy, outreach, and channel kit. The fleet entry stays a
            single entity owned by PGVA Ventures.
          </p>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-fluoro-gold mb-2">Active development (3)</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {active.map((p) => <Card key={p.id} p={p} />)}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Concept lab (7)</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {concept.map((p) => <Card key={p.id} p={p} />)}
            </div>
          </div>

          {selectedId && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs">
              <Sparkles className="h-3 w-3 inline mr-1 text-primary" />
              <span className="font-semibold">{FLEET_PRODUCTS.find((p) => p.id === selectedId)?.display} selected.</span>{" "}
              We pre-filled the intake below — adjust anything you want, then pick a tier and check out.
            </div>
          )}
        </>
      )}
    </section>
  );
}
