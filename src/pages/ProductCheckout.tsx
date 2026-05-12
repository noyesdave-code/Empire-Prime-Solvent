import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2, Rocket, ShieldCheck, Sparkles, Package, Clock, Wrench, DollarSign, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/unicorn-empire-logo.png";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { FLEET_PRODUCTS } from "@/lib/fleetProducts";
import { ReserveForm } from "@/components/ReserveForm";
import { EmpireProgress } from "@/components/EmpireProgress";
import {
  trackFunnelEvent,
  getAttribution,
  saveCheckoutDraft,
  loadCheckoutDraft,
  persistIntake,
} from "@/lib/funnelTracking";

const TIERS = [
  {
    id: "spark",
    name: "Reserve",
    price: "$27",
    priceId: "unicorn_blueprint_spark_onetime",
    blurb: "Hold your build slot. Get the spec sheet + launch kit emailed today.",
    cta: "Reserve · $27",
    accent: "from-cyan-500 to-emerald-400",
  },
  {
    id: "founder",
    name: "Build Slot",
    price: "$97",
    priceId: "unicorn_blueprint_founder_onetime",
    blurb: "Full launch package — brand pack, landing page, listings, outreach, content calendar.",
    cta: "Buy Build Slot · $97",
    accent: "from-fuchsia-500 to-amber-400",
    featured: true,
  },
  {
    id: "studio",
    name: "Studio Launch",
    price: "$297",
    priceId: "unicorn_blueprint_studio_onetime",
    blurb: "Full launch + 90-day content engine, 30 blogs, 60 social posts, video scripts, 30-day Q&A.",
    cta: "Studio Launch · $297",
    accent: "from-indigo-500 to-cyan-400",
  },
];

// Hardware fleet step numbers (mirror src/pages/Index.tsx HARDWARE_PRODUCTS).
const HARDWARE_STEP: Record<string, number> = {
  pyron: 4, shelflife: 5, leaksense: 6, microfeed: 7,
  voiceforge: 8, unicornmark: 9, brownout: 10, harvestlink: 11, heatsink: 12,
};

export default function ProductCheckout() {
  const { id } = useParams<{ id: string }>();
  const product = FLEET_PRODUCTS.find((p) => p.id === id);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const draft = loadCheckoutDraft();
  // Validate draft: only resume email if it parses; ignore stale tier IDs and
  // mismatched products (e.g. user switched products since last visit).
  const validTierIds = TIERS.map((t) => t.id);
  const draftTierValid = draft.tier && validTierIds.includes(draft.tier);
  const draftProductMatches = !draft.product_id || draft.product_id === id;
  const safeEmail = draft.email && /.+@.+\..+/.test(draft.email) ? draft.email : "";
  const [email, setEmail] = useState(safeEmail);
  const [selectedTier, setSelectedTier] = useState<string>(
    draftTierValid && draftProductMatches ? (draft.tier as string) : "founder",
  );

  // Persist email + selected tier across refresh / back nav.
  useEffect(() => {
    if (!product) return;
    saveCheckoutDraft({ email, tier: selectedTier, product_id: product.id });
  }, [email, selectedTier, product]);

  // Log a per-product impression once.
  useEffect(() => {
    if (!product) return;
    trackFunnelEvent({ event_type: "impression", stage: "product_page", product: product.id });
  }, [product?.id]);

  if (!product) return <Navigate to="/funnel" replace />;

  const handleEmailBlur = () => {
    if (email && email.includes("@")) {
      trackFunnelEvent({ event_type: "email_entered", stage: "product_page", product: product.id, tier: selectedTier });
    }
  };

  const handleCheckout = async (tier: typeof TIERS[number]) => {
    if (!email || !email.includes("@")) {
      toast({ title: "Email required", description: "We send your build receipt + Blueprint here.", variant: "destructive" });
      return;
    }
    setSelectedTier(tier.id);
    saveCheckoutDraft({ email, tier: tier.id, product_id: product.id });
    setSubmitting(tier.id);
    const attribution = getAttribution();
    try {
      persistIntake({
        tier: tier.id,
        email,
        fleet_id: product.id,
        product_id: product.id,
        product_name: product.name,
        attribution,
        intake: {
          name: "",
          email,
          product_idea: product.tagline,
          product_type: "Not sure — suggest for me",
          audience: `Buyers and partners for ${product.sector.toLowerCase()}.`,
          vibe: "premium, technical, confident",
          brand_name: product.name,
          price_range: "AI recommend",
          goal: "Build to sell",
        },
      });

      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(tier.priceId);
      trackFunnelEvent({
        event_type: "checkout_opened",
        stage: "product_page",
        product: product.id,
        tier: tier.id,
        metadata: { price: tier.price, price_id: tier.priceId },
      });
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: { email },
        customData: {
          tier: tier.id,
          intent: "product_checkout",
          fleet_id: product.id,
          product_name: product.name,
          utm_source: attribution.utm_source ?? "",
          utm_medium: attribution.utm_medium ?? "",
          utm_campaign: attribution.utm_campaign ?? "",
          utm_content: attribution.utm_content ?? "",
          utm_term: attribution.utm_term ?? "",
          referrer: attribution.referrer ?? "",
        },
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/unicorn-box/blueprint?paid=1&product=${encodeURIComponent(product.id)}&tier=${encodeURIComponent(tier.id)}`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e) {
      toast({ title: "Checkout error", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  };

  const flow = [
    { icon: Wrench, label: "Materials", value: product.build.materials },
    { icon: Package, label: "Outsource build", value: product.build.outsourceBuild },
    { icon: Clock, label: "Build time", value: product.build.buildDays },
    { icon: DollarSign, label: "Our fee", value: product.build.ourFee },
    { icon: Truck, label: "Customer total", value: product.build.total },
  ];

  return (
    <main className="caribbean-accent min-h-screen bg-background text-foreground">
      <title>{`${product.display} · Buy / Reserve · Unicorn Box`}</title>
      <meta name="description" content={`${product.display} — ${product.tagline} Reserve a build slot or buy the full launch package.`} />
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-40" />

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-semibold">Unicorn Box™</span>
          </Link>
          <Link to="/funnel" className="text-xs text-muted-foreground hover:text-foreground">All products →</Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 pt-8 pb-4">
        <Link to="/funnel" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> All products
        </Link>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight flex items-baseline gap-3 flex-wrap">
            {HARDWARE_STEP[product.id] && (
              <span className="text-xs font-mono uppercase tracking-widest px-2 py-1 rounded-full border border-primary/50 text-primary">
                Step {HARDWARE_STEP[product.id]}
              </span>
            )}
            <span className="text-gradient-empire">{product.display}</span>
          </h1>
          <span className="text-xs font-mono text-fluoro-gold">{product.valuation}</span>
        </div>
        <p className="mt-2 text-lg text-muted-foreground">{product.tagline}</p>
        <p className="mt-3 text-sm leading-relaxed">{product.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
          <span className="px-2 py-1 rounded bg-primary/15 text-primary">{product.sector}</span>
          <span className="px-2 py-1 rounded bg-fluoro-gold/15 text-fluoro-gold">{product.stage}</span>
        </div>
      </section>

      {/* Free pre-order + live unlock bar (PYRON only — Step 4 capital collection). */}
      {product.id === "pyron" && (
        <section className="mx-auto max-w-4xl px-4 pb-6 space-y-4">
          <EmpireProgress product="pyron" step={4} nextLabel="Step 5 · SHELF LIFE" target={100} />
          <div className="glass-strong rounded-2xl p-5 md:p-6 space-y-3 border border-primary/30">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-fluoro-gold">Free pre-order · No card</p>
              <h2 className="text-xl font-bold mt-1">Reserve a PYRON unit</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Drop your email to lock a unit at launch price. Every reservation moves the unlock bar above
                and funds the next product (SHELF LIFE™). Want to pay now? Use a build slot below.
              </p>
            </div>
            <ReserveForm product="pyron" stage="preorder" mode="reserve" redirectTo="/p/pyron/reserved" />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4 pb-6">
        <div className="glass-strong rounded-2xl p-4 md:p-5">
          <p className="text-[10px] uppercase tracking-widest text-fluoro-gold mb-3">Build → Outsource → Time → Our Fee → Into customer's hands</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {flow.map((f, i) => (
              <div key={f.label} className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  <f.icon className="h-3 w-3" /> Step {i + 1}
                </div>
                <div className="text-[11px] font-semibold text-foreground/80">{f.label}</div>
                <div className="text-sm font-mono mt-0.5">{f.value}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Unicorn Box ships: <span className="text-foreground">{product.uboxDeliverable}</span>
          </p>
        </div>
      </section>

      {/* Checkout panel */}
      <section className="mx-auto max-w-4xl px-4 pb-12">
        <div className="glass-strong rounded-2xl p-5 md:p-7 space-y-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /> Order {product.display}</h2>
              <p className="text-xs text-muted-foreground mt-1">One email. One tier. One tap to credit card. Secure checkout by Paddle.</p>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-fluoro-gold inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> No subscription · Instant delivery
            </span>
          </div>

          <div>
            <Label htmlFor="email">Email (where we send your Blueprint)</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="you@example.com"
              maxLength={200}
              className="h-12 text-base"
            />
            {safeEmail && draftTierValid && draftProductMatches && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Resumed from your last visit · tier <span className="text-fluoro-gold uppercase">{selectedTier}</span>
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.id}
                className={`rounded-2xl p-4 border-2 flex flex-col gap-3 ${
                  t.featured
                    ? "border-fluoro-gold bg-fluoro-gold/5 shadow-[0_0_24px_hsl(var(--primary)/0.25)]"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-bold">{t.name}</h3>
                  <span className="text-2xl font-black">{t.price}</span>
                </div>
                {t.featured && <span className="text-[9px] uppercase tracking-widest text-fluoro-gold">Most popular</span>}
                <p className="text-xs text-muted-foreground flex-1">{t.blurb}</p>
                <Button
                  onClick={() => handleCheckout(t)}
                  disabled={submitting !== null}
                  className={`w-full h-11 text-sm font-bold bg-gradient-to-r ${t.accent} text-background hover:opacity-90`}
                >
                  {submitting === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {submitting === t.id ? "Opening checkout…" : t.cta}
                </Button>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Secure checkout by Paddle (Merchant of Record). One-time payment, no subscription. By continuing you accept our{" "}
            <Link to="/terms" className="underline">Terms</Link>, <Link to="/refund" className="underline">Refund Policy</Link>, and{" "}
            <Link to="/privacy" className="underline">Privacy Notice</Link>.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/unicorn-box/start" className="text-xs text-muted-foreground hover:text-foreground underline">
            Prefer the full intake form (8 questions)? Use the long version →
          </Link>
        </div>
      </section>
    </main>
  );
}
