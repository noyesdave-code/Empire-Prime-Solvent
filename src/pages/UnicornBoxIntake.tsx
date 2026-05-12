import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/unicorn-empire-logo.png";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { z } from "zod";
import { FleetPicker } from "@/components/FleetPicker";
import type { FleetProduct } from "@/lib/fleetProducts";
import { persistIntake, getAttribution, trackFunnelEvent } from "@/lib/funnelTracking";

const TIERS = [
  { id: "spark",   name: "Spark",   price: "$27",  priceId: "unicorn_blueprint_spark_onetime",
    bullets: ["1 product", "AI brand pack", "1 Shopify-ready listing", "7-day content calendar", "Setup checklist"] },
  { id: "founder", name: "Founder", price: "$97",  priceId: "unicorn_blueprint_founder_onetime",
    bullets: ["3 product variants", "Full brand kit", "10 listings", "30-day calendar + 10 blog drafts", "Printful + Shopify wiring guide", "1 revision pass"], featured: true },
  { id: "studio",  name: "Studio",  price: "$297", priceId: "unicorn_blueprint_studio_onetime",
    bullets: ["6-product line", "Premium brand kit", "30 listings", "90-day calendar + 30 blogs + 60 social", "Video script pack", "30 days email Q&A"] },
];

const intakeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  product_idea: z.string().trim().min(5).max(280),
  product_type: z.string().min(1),
  audience: z.string().trim().min(5).max(280),
  vibe: z.string().trim().min(3).max(100),
  brand_name: z.string().trim().max(60),
  price_range: z.string().min(1),
  goal: z.string().min(1),
});

const PRODUCT_TYPES = ["Apparel (t-shirt, hoodie)", "Mug / drinkware", "Poster / wall art", "Sticker / decal", "Accessory (hat, bag, pin)", "Not sure — suggest for me"];
const PRICE_RANGES = ["$15–25", "$25–50", "$50+", "AI recommend"];
const GOALS = ["Side income", "Replace day job", "Build to sell"];

export default function UnicornBoxIntake() {
  const navigate = useNavigate();
  const [tier, setTier] = useState<string>("founder");
  const [submitting, setSubmitting] = useState(false);
  const [fleetId, setFleetId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", product_idea: "", product_type: PRODUCT_TYPES[0],
    audience: "", vibe: "", brand_name: "", price_range: PRICE_RANGES[0], goal: GOALS[0],
  });

  const handleFleetSelect = (p: FleetProduct | null) => {
    if (!p) { setFleetId(null); return; }
    setFleetId(p.id);
    // Prefill the intake against the dossier spec — user can still edit anything.
    setForm((f) => ({
      ...f,
      product_idea: p.tagline,
      product_type: "Not sure — suggest for me",
      brand_name: p.name,
      vibe: "premium, technical, confident",
      audience: `Buyers and partners for ${p.sector.toLowerCase()} — see ${p.display} dossier.`,
    }));
  };

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCheckout = async () => {
    const parsed = intakeSchema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast({ title: "Check your answers", description: first.message, variant: "destructive" });
      return;
    }
    const selected = TIERS.find((t) => t.id === tier)!;
    setSubmitting(true);
    try {
      const attribution = getAttribution();
      // Stash intake in both session + localStorage so the success page survives any redirect quirks.
      persistIntake({ tier, intake: form, email: form.email, fleet_id: fleetId, attribution });

      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(selected.priceId);
      trackFunnelEvent({ event_type: "email_entered", stage: "intake_form", product: fleetId ?? undefined, tier });
      trackFunnelEvent({ event_type: "checkout_opened", stage: "intake_form", product: fleetId ?? undefined, tier });
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: { email: form.email },
        customData: {
          tier,
          intent: "blueprint",
          fleet_id: fleetId ?? "",
          utm_source: attribution.utm_source ?? "",
          utm_medium: attribution.utm_medium ?? "",
          utm_campaign: attribution.utm_campaign ?? "",
          utm_content: attribution.utm_content ?? "",
          utm_term: attribution.utm_term ?? "",
          referrer: attribution.referrer ?? "",
        },
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/unicorn-box/blueprint?paid=1&tier=${encodeURIComponent(tier)}${fleetId ? `&product=${encodeURIComponent(fleetId)}` : ""}`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e) {
      toast({ title: "Checkout error", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="caribbean-accent min-h-screen bg-background text-foreground">
      <title>Unicorn Box™ Blueprint · 90-second intake</title>
      <meta name="description" content="Tell Unicorn AI about your product idea. Get a complete launch Blueprint — brand pack, listings, content calendar, blog drafts." />
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-40" />

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-semibold">Unicorn Box™</span>
          </Link>
          <Link to="/unicorn-box/manual" className="text-xs text-muted-foreground hover:text-foreground">Read the Manual →</Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pt-10 pb-6 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight">
          Get your <span className="text-gradient-empire">launch Blueprint</span> in minutes
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Answer 8 quick questions. Pick a tier. Pay once. Unicorn AI generates a complete, executable plan you can ship to Shopify + Printful today.
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-widest text-fluoro-gold inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> One-time payment · No subscription · Delivered instantly
        </p>
      </section>

      {/* Fleet picker — PGVA Ventures hardware/consumer fleet, sellable through Unicorn Box */}
      <section className="mx-auto max-w-5xl px-4 pb-6">
        <FleetPicker selectedId={fleetId} onSelect={handleFleetSelect} />
      </section>

      {/* Tier picker */}
      <section className="mx-auto max-w-5xl px-4 pb-8">
        <div className="grid gap-3 md:grid-cols-3">
          {TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTier(t.id)}
              className={`text-left rounded-2xl p-5 border-2 transition-all ${
                tier === t.id ? "border-primary bg-primary/10 shadow-[0_0_24px_hsl(var(--primary)/0.3)]" : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-xl font-bold">{t.name}</h3>
                <span className="text-2xl font-black">{t.price}</span>
              </div>
              {t.featured && <span className="inline-block mb-2 text-[10px] uppercase tracking-widest text-fluoro-gold">Most popular</span>}
              <ul className="text-xs space-y-1 text-muted-foreground">
                {t.bullets.map((b) => <li key={b}>· {b}</li>)}
              </ul>
            </button>
          ))}
        </div>
      </section>

      {/* Intake form */}
      <section className="mx-auto max-w-2xl px-4 pb-10">
        <div className="glass-strong rounded-2xl p-6 md:p-8 space-y-5">
          <h2 className="text-lg font-semibold">Tell us about your idea</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={form.name} onChange={update("name")} placeholder="Jane Doe" maxLength={80} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" maxLength={200} />
            </div>
          </div>

          <div>
            <Label htmlFor="product_idea">Product idea (one sentence)</Label>
            <Textarea id="product_idea" value={form.product_idea} onChange={update("product_idea")} rows={2} maxLength={280}
              placeholder="A cheeky enamel mug for night-shift nurses." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="product_type">Product type</Label>
              <select id="product_type" value={form.product_type} onChange={update("product_type")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {PRODUCT_TYPES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="price_range">Price comfort</Label>
              <select id="price_range" value={form.price_range} onChange={update("price_range")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {PRICE_RANGES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="audience">Who buys this? (one sentence)</Label>
            <Textarea id="audience" value={form.audience} onChange={update("audience")} rows={2} maxLength={280}
              placeholder="Burnt-out healthcare workers who need humor with their caffeine." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="vibe">Vibe (3 adjectives)</Label>
              <Input id="vibe" value={form.vibe} onChange={update("vibe")} placeholder="dark, witty, retro" maxLength={100} />
            </div>
            <div>
              <Label htmlFor="brand_name">Brand name (or leave blank)</Label>
              <Input id="brand_name" value={form.brand_name} onChange={update("brand_name")} placeholder="AI suggest 5 options" maxLength={60} />
            </div>
          </div>

          <div>
            <Label htmlFor="goal">Your goal</Label>
            <select id="goal" value={form.goal} onChange={update("goal")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {GOALS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>

          <Button onClick={handleCheckout} disabled={submitting} className="w-full h-12 text-base">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Pay {TIERS.find((t) => t.id === tier)!.price} & generate Blueprint
          </Button>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Secure checkout by Paddle (Merchant of Record). One-time payment, no subscription. By continuing you accept our{" "}
            <Link to="/terms" className="underline">Terms</Link>, <Link to="/refund" className="underline">Refund Policy</Link>, and{" "}
            <Link to="/privacy" className="underline">Privacy Notice</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
