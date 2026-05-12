import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, Package, Sparkles, Crown, LogIn, LogOut, Settings, X } from "lucide-react";
import logo from "@/assets/unicorn-empire-logo-clear.png";
import { AskUnicorn } from "@/components/AskUnicorn";
import { SubscribeButton } from "@/components/SubscribeButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { FLEET_PRODUCTS, type FleetProduct } from "@/lib/fleetProducts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Match veil tier visuals: 6 tiers, 3×2 grid, Founder = popular (gold).
const TIERS: { name: string; price: string; desc: string; priceId: string; popular?: boolean }[] = [
  { name: "Sparks",   price: "$5",   desc: "Daily AI prompts",        priceId: "sparks_monthly" },
  { name: "Pony",     price: "$7",   desc: "Starter brand",           priceId: "pony_monthly" },
  { name: "Founder",  price: "$27",  desc: "Solo OS",                 priceId: "founder_monthly", popular: true },
  { name: "Stallion", price: "$19",  desc: "Revenue automations",     priceId: "stallion_monthly" },
  { name: "Pro",      price: "$147", desc: "AI ad engine",            priceId: "pro_monthly" },
  { name: "Agency",   price: "$497", desc: "White-glove · multi",     priceId: "agency_monthly" },
];

const CORE_PRODUCTS = [
  { name: "AI Storefront", desc: "Auto-built shop in your niche, ready to take orders." },
  { name: "Daily Content Engine", desc: "Posts, emails, and ad creatives shipped every day." },
  { name: "Founder-SMS Hotline", desc: "Voice and text concierge for the operator." },
  { name: "Blueprint Generator", desc: "8-question intake → full launch dossier." },
];

const VEIL_TEXT = { color: "hsl(0 0% 100%)", WebkitTextFillColor: "hsl(0 0% 100%)" } as const;

const UnicornBoxLanding = () => {
  const { user, signOut } = useAuth();
  const { isActive, tier } = useSubscription();
  const [active, setActive] = useState<FleetProduct | null>(null);

  const openPortal = async () => {
    const popup = window.open("about:blank", "_blank");
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error || !data?.url) {
      popup?.close();
      return toast.error(error?.message || "Could not open portal");
    }
    if (popup) popup.location.href = data.url;
    else window.location.href = data.url;
  };

  return (
    <main className="caribbean-accent min-h-screen bg-background text-foreground grid-bg relative overflow-hidden">
      <title>Unicorn Box™ — Solo Founder OS</title>
      <meta
        name="description"
        content="Unicorn Box™ is the solo-founder OS: AI storefront, daily content, SMS hotline, and 10 buildable Fleet products — from $9/mo."
      />

      {/* ambient glow — matches veil */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

      {/* NAV */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Unicorn Box" className="h-10 w-10 object-contain drop-shadow-[0_0_12px_hsl(var(--emerald)/0.6)]" />
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Unicorn</p>
            <p className="text-sm font-semibold tracking-wider">BOX™</p>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-xs">
          <Link to="/" className="px-3 py-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">Empire</Link>
          <Link to="/emerald" className="px-3 py-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">Emerald</Link>
          <Link to="/marble" className="px-3 py-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">Marble</Link>
          <Link to="/unicorn-box/manual" className="px-3 py-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">Manual</Link>
        </nav>
        <div className="flex items-center gap-2 text-xs">
          {user ? (
            <>
              {isActive && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-3 py-1 text-[10px] uppercase tracking-wider">
                  <Crown className="h-3 w-3" /> {tier.replace("unicorn_", "")}
                </span>
              )}
              {isActive && (
                <Button onClick={openPortal} variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Settings className="h-3.5 w-3.5 mr-1" /> Manage
                </Button>
              )}
              <Button onClick={() => signOut()} variant="ghost" size="sm">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to="/auth"><LogIn className="h-3.5 w-3.5 mr-1" /> Sign in</Link>
            </Button>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-2 pb-6 text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-fluoro-white">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Solo-Founder Operating System
        </div>
        <Package className="relative h-16 w-16 md:h-20 md:w-20 mx-auto text-primary drop-shadow-[0_0_24px_hsl(var(--emerald)/0.7)]" />
        <h1 className="mt-2 text-balance text-4xl font-black leading-[1.02] md:text-6xl text-mega-fluoro">
          Unicorn Box™
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-fluoro font-medium">
          One operator. <span className="font-bold" style={VEIL_TEXT}>Ten Fleet products.</span> A complete launch dossier, storefront, and content engine — shipped in a single week.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-[hsl(185_100%_55%)] hover:brightness-110 text-[hsl(195_90%_12%)] border-0 shadow-lg font-bold">
            <Link to="/unicorn-box/start">Build my Box <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-[hsl(185_100%_65%)] text-fluoro-white hover:bg-[hsl(185_100%_65%/0.15)]">
            <Link to="/unicorn-box/manual">Read the Manual</Link>
          </Button>
        </div>
      </section>

      {/* ASK UNICORN */}
      <AskUnicorn />

      {/* CORE PRODUCTS */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-6 pb-10">
        <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          What's inside the Box
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_PRODUCTS.map((p) => (
            <article
              key={p.name}
              className="veil-card glass rounded-2xl p-6 transition-transform hover:-translate-y-1 ring-1 ring-primary/40"
              style={VEIL_TEXT}
            >
              <Sparkles className="h-5 w-5 mb-3 text-primary" />
              <h3 className="text-lg font-black text-fluoro-white" style={VEIL_TEXT}>{p.name}</h3>
              <p className="mt-2 text-sm text-fluoro-white/90" style={VEIL_TEXT}>{p.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FLEET */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-8">
        <div className="mb-6 flex justify-center">
          <ArrowDown className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="mb-2 text-center text-xs uppercase tracking-[0.3em] text-fluoro-white/80">
          The Fleet — buildable through Unicorn Box
        </p>
        <h2 className="mb-3 text-center text-2xl md:text-3xl font-black text-mega-fluoro">
          {FLEET_PRODUCTS.length} PGVA-owned brands you can launch
        </h2>
        <p className="mb-8 text-center text-xs text-fluoro-white/80">
          Tap any product for the full dossier brief — including outsourced materials, build time, our fee, and the turnkey customer price.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {FLEET_PRODUCTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActive(f)}
              className="veil-card veil-product-card glass rounded-xl p-4 text-left transition-all hover:-translate-y-1 border-2 border-primary/40"
              style={VEIL_TEXT}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-black text-fluoro-white tracking-wide" style={VEIL_TEXT}>{f.display}</p>
                <span
                  className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-[hsl(185_100%_65%)]"
                  style={VEIL_TEXT}
                >
                  {f.stage}
                </span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-fluoro-white/80" style={VEIL_TEXT}>{f.sector}</p>
              <p className="mt-3 text-xs text-fluoro-white/90 leading-snug line-clamp-3" style={VEIL_TEXT}>{f.tagline}</p>
              <p className="mt-3 text-[10px] font-bold text-fluoro-white" style={VEIL_TEXT}>
                View details →
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* PRODUCT DETAIL DIALOG */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-xl bg-card border-[hsl(185_100%_65%)/0.5] max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-2xl font-black text-foreground">{active.display}</DialogTitle>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-[hsl(185_100%_65%)] text-foreground">
                    {active.stage}
                  </span>
                </div>
                <DialogDescription className="text-foreground/85 text-sm pt-1 italic">
                  {active.tagline}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-sm text-foreground/90 leading-relaxed">{active.description}</p>
                <Field label="Sector" value={active.sector} />
                <Field label="Moat" value={active.moat} />
                <Field label="24-month valuation target" value={active.valuation} />
                <Field label="Unicorn Box ships" value={active.uboxDeliverable} />

                <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 mt-2">
                  <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2">
                    Build cost calculator
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <CostRow label="Outsourced materials" value={active.build.materials} />
                    <CostRow label="Outsourced build" value={active.build.outsourceBuild} />
                    <CostRow label="Approx. build time" value={active.build.buildDays} />
                    <CostRow label="Unicorn Box fee" value={active.build.ourFee} />
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary/30 flex items-baseline justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-foreground/70 font-semibold">
                      Customer price
                    </span>
                    <span className="text-base font-black text-primary">{active.build.total}</span>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                  Source: PGVA investor portfolio dossier · entity owned by PGVA Ventures LLC dba Unicorn Corporation. Estimates rounded; final quote confirmed at intake.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button asChild className="flex-1 bg-[hsl(185_100%_55%)] hover:brightness-110 text-[hsl(195_90%_12%)] font-bold">
                  <Link to={`/unicorn-box/start?fleet=${active.id}`}>
                    Build {active.name} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setActive(null)} className="border-[hsl(185_100%_65%)]">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* COMPANY */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-6">
        <div className="glass-strong rounded-3xl p-6 md:p-10 text-center ring-1 ring-primary/30">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">
            About the company
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-mega-fluoro mb-4">
            PGVA Ventures LLC <span className="text-fluoro-white/70 font-medium">dba</span> Unicorn Corporation
          </h2>
          <p className="text-sm md:text-base text-fluoro-white/90 leading-relaxed max-w-3xl mx-auto" style={VEIL_TEXT}>
            Unicorn Corporation is the operating arm of PGVA Ventures LLC — a Commonwealth-of-Virginia
            holding company building a portfolio of consumer-AI, hardware-adjacent SaaS, and industrial
            products. Each Fleet brand is a single owned entity; Unicorn Box™ is the launch and
            fulfilment layer that turns those entities into customer-ready products by outsourcing
            materials and build, applying our service fee, and shipping a turnkey result.
          </p>
          <p className="text-[11px] text-muted-foreground mt-4">
            Confidential · Prepared for the founder · PGVA Ventures LLC, Commonwealth of Virginia
          </p>
        </div>
      </section>

      {/* TIERS — veil-style 3×2 neon grid */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 pb-12">
        <p className="mb-2 text-center text-xs uppercase tracking-[0.3em] text-fluoro-white/80">
          Pricing — six tiers · one ladder
        </p>
        <h2 className="mb-6 text-center text-2xl md:text-3xl font-black text-mega-fluoro">
          Start at $9. Upgrade anytime.
        </h2>
        <div className="grid w-full grid-cols-2 sm:grid-cols-3 gap-2.5">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="relative rounded-lg p-3 text-center bg-card flex flex-col"
              style={{
                border: t.popular ? "3px solid hsl(50 100% 60%)" : "3px solid hsl(185 100% 60%)",
                boxShadow: t.popular
                  ? "0 0 0 1px hsl(50 100% 70%) inset, 0 0 14px hsl(50 100% 60% / 0.55)"
                  : "0 0 0 1px hsl(185 100% 70%) inset",
              }}
            >
              {t.popular && (
                <span
                  className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap"
                  style={{ background: "hsl(50 100% 60%)", color: "hsl(195 90% 12%)" }}
                >
                  Popular
                </span>
              )}
              <p className="text-xs font-bold" style={VEIL_TEXT}>{t.name}</p>
              <p className="text-xl font-black leading-none mt-1" style={VEIL_TEXT}>
                {t.price}<span className="text-[10px]" style={{ color: "hsl(0 0% 100% / 0.85)" }}>/mo</span>
              </p>
              <p className="text-[10px] mt-1 mb-2" style={{ color: "hsl(0 0% 100% / 0.8)" }}>{t.desc}</p>
              <SubscribeButton
                priceId={t.priceId}
                label="Go"
                variant="outline"
                className="mt-auto h-7 w-full px-1 text-[11px] border-2 text-white"
              />
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-border/40 px-6 py-8 text-center text-xs text-muted-foreground space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <span className="text-muted-foreground/40">·</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <span className="text-muted-foreground/40">·</span>
          <Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link>
        </div>
        <div>© {new Date().getFullYear()} PGVA Ventures© LLC · Unicorn Box™ · All rights reserved</div>
      </footer>
    </main>
  );
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground mt-0.5">{value}</span>
    </div>
  );
}

export default UnicornBoxLanding;
