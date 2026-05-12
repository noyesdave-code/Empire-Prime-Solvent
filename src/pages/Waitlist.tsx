import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import logo from "@/assets/unicorn-empire-logo.png";
import { ReserveForm } from "@/components/ReserveForm";
import { trackFunnelEvent } from "@/lib/funnelTracking";

const PRODUCT_COPY: Record<string, { name: string; step?: number; tag: string; blurb: string }> = {
  emerald:    { name: "Unicorn Emerald", step: 13, tag: "Concept", blurb: "AI Revenue OS — trend prediction, revenue automation, self-building businesses. Activates after Step 12." },
  marble:     { name: "Unicorn Marble",  step: 14, tag: "Concept", blurb: "Premium black-and-glass operator dashboard. Unlocks after the Emerald activation." },
  pyron:      { name: "PYRON™",          step: 4,  tag: "Building", blurb: "Self-charging supercapacitor phone case. Reserve a unit free — we email you when production starts." },
  shelflife:  { name: "SHELF LIFE™",     step: 5,  tag: "Queued",  blurb: "Smart pantry freshness sensor." },
  leaksense:  { name: "LEAKSENSE™",      step: 6,  tag: "Queued",  blurb: "Whole-property water leak guardian." },
  microfeed:  { name: "MICROFEED™",      step: 7,  tag: "Queued",  blurb: "Automated micro-livestock feeder." },
  voiceforge: { name: "VOICEFORGE™",     step: 8,  tag: "Locked",  blurb: "Personal voice-clone puck." },
  unicornmark:{ name: "UNICORN MARK™",   step: 9,  tag: "Locked",  blurb: "Hardware identity token for the fleet." },
  brownout:   { name: "BROWNOUT™",       step: 10, tag: "Locked",  blurb: "Whole-home brownout shield." },
  harvestlink:{ name: "HARVESTLINK™",    step: 11, tag: "Locked",  blurb: "Edge AI for small & mid-size farms." },
  heatsink:   { name: "HEATSINK™",       step: 12, tag: "Locked",  blurb: "Passive datacenter thermal regulation." },
};

export default function Waitlist() {
  const [params] = useSearchParams();
  const productKey = (params.get("product") || "emerald").toLowerCase();
  const info = PRODUCT_COPY[productKey] || PRODUCT_COPY.emerald;
  const isReserve = productKey === "pyron";

  useEffect(() => {
    trackFunnelEvent({ event_type: "impression", stage: "waitlist", product: productKey });
  }, [productKey]);

  return (
    <main className="caribbean-accent min-h-screen bg-background text-foreground">
      <title>{`${info.name} · ${isReserve ? "Pre-order" : "Waitlist"} · Unicorn Empire`}</title>
      <meta name="description" content={`Join the ${info.name} ${isReserve ? "pre-order" : "waitlist"}. Free, no card required.`} />
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-40" />

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-semibold">Unicorn Empire</span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">All products →</Link>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 pt-12 pb-16">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3 w-3" /> Back to Empire
        </Link>

        <div className="glass-strong rounded-2xl p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
            <Lock className="h-3 w-3 text-fluoro-gold" />
            <span className="text-fluoro-gold">
              {info.step ? `Step ${info.step} · ` : ""}{info.tag}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black">
            {isReserve ? `Pre-order ${info.name}` : `Join the ${info.name} waitlist`}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{info.blurb}</p>

          <ReserveForm
            product={productKey}
            stage={isReserve ? "preorder" : "waitlist"}
            mode={isReserve ? "reserve" : "waitlist"}
          />

          <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-3">
            Want to buy something <em>today</em>?
            {" "}<Link to="/funnel" className="underline hover:text-foreground">Sparks AI · $9</Link>
            {" · "}<Link to="/unicorn-box" className="underline hover:text-foreground">Unicorn Box™ · from $27</Link>
            {" · "}<Link to="/p/pyron" className="underline hover:text-foreground">PYRON build slot</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
