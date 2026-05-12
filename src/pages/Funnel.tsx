import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, Sparkles, Package, Rocket, Mail, CheckCircle2, X } from "lucide-react";
import { FLEET_PRODUCTS } from "@/lib/fleetProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/unicorn-empire-logo-clear.png";
import { trackFunnelEvent as sharedTrack, getAttribution, type CtaVariant as SharedCtaVariant } from "@/lib/funnelTracking";

// Bright/fluorescent funnel page — visible on dark background, SEO-friendly.
// 1. Master visitor → intake → checkout → blueprint funnel
// 2. Per-flagship landing → pricing → checkout funnels (KB, Stock-Pulse, Emerald, Marble)
// 3. Consolidated build → outsource → time → fee → customer table
// 4. Internal-link cloud for SEO discoverability of buried product pages
// 5. Lead capture (email) for "Get Blueprint" — writes to funnel_leads + kicks automation
// 6. A/B testing for "Start Checkout" + "Get Blueprint" CTA styles + labels (sticky per visitor)

type FunnelStage = { key: string; label: string; sub: string; color: string };

const MASTER_FUNNEL: FunnelStage[] = [
  { key: "visitor", label: "Visitor lands", sub: "SEO · ads · referral → /", color: "text-fluoro-gold" },
  { key: "intake", label: "Intake (90 sec)", sub: "/unicorn-box/start — 8 questions", color: "text-fluoro" },
  { key: "checkout", label: "Checkout", sub: "$27 / $97 / $297 plan picked", color: "text-fluoro-sapphire" },
  { key: "blueprint", label: "Blueprint delivered", sub: "/unicorn-box/blueprint — turnkey pack in inbox", color: "text-fluoro-maroon" },
  { key: "customer", label: "Customer in hands", sub: "Outsourced build ships in 7–35 days", color: "text-mega-fluoro" },
];

type ProductFunnel = {
  brand: string;
  color: string;
  landing: string;
  pricing: string[];
  checkoutHref: string;
  customerGets: string;
};

const PRODUCT_FUNNELS: ProductFunnel[] = [
  {
    brand: "Knowledge Bank™",
    color: "text-fluoro",
    landing: "/unicorn-box",
    pricing: ["$29/mo Founder", "$99/mo Team (10 seats)", "$499/mo Vault (unlimited)"],
    checkoutHref: "/auth",
    customerGets: "Live recall agent over Slack/Email/Drive/Voice — instant answers from your own knowledge.",
  },
  {
    brand: "Stock-Pulse™",
    color: "text-fluoro-gold",
    landing: "/unicorn-box",
    pricing: ["Free paper-trading", "$39/mo Pro live signals", "$99/mo Elite auto-trader + futures + API"],
    checkoutHref: "/auth",
    customerGets: "Live signal terminal, back-tests, paper wallet, auto-trader API + broker affiliate revenue.",
  },
  {
    brand: "Unicorn Emerald™",
    color: "text-flagship-emerald",
    landing: "/emerald",
    pricing: ["$97/mo Starter", "$297/mo Growth", "$897/mo Scale", "+ % of recovered revenue"],
    checkoutHref: "/emerald",
    customerGets: "Autonomous outreach across 100+ targets daily — CRM, email, calendar, content, win-back, all run by Emerald.",
  },
  {
    brand: "Unicorn Marble™",
    color: "text-flagship-marble",
    landing: "/marble",
    pricing: ["$299/mo licensing", "$4,999 white-glove onboarding (18-mo)"],
    checkoutHref: "/marble",
    customerGets: "Full design system + accessibility floor (44px / AAA / reduced-motion) embedded in your product.",
  },
];

// ---- A/B testing -----------------------------------------------------------

type CtaVariant = "A" | "B";

const CTA_COPY: Record<CtaVariant, { checkout: string; blueprint: string }> = {
  A: { checkout: "Start Checkout", blueprint: "Get Blueprint" },
  B: { checkout: "Build My Empire — $27", blueprint: "Email Me the Blueprint" },
};

function getOrAssignVariant(): CtaVariant {
  if (typeof window === "undefined") return "A";
  try {
    const existing = window.localStorage.getItem("funnel_cta_variant");
    if (existing === "A" || existing === "B") return existing;
    const v: CtaVariant = Math.random() < 0.5 ? "A" : "B";
    window.localStorage.setItem("funnel_cta_variant", v);
    return v;
  } catch {
    return "A";
  }
}

async function trackFunnelEvent(args: {
  event_type:
    | "impression"
    | "click_checkout"
    | "click_blueprint"
    | "lead"
    | "blueprint_sent"
    | "email_entered"
    | "checkout_opened"
    | "checkout_paid";
  stage?: string;
  product?: string;
  variant: SharedCtaVariant;
  tier?: string;
  metadata?: Record<string, unknown>;
}) {
  return sharedTrack(args);
}

// Internal links cloud — surfaces buried product pages for SEO crawl + users
const INTERNAL_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/unicorn-box", label: "Unicorn Box™" },
  { href: "/unicorn-box/start", label: "Unicorn Box Intake" },
  { href: "/unicorn-box/blueprint", label: "Blueprint Generator" },
  { href: "/unicorn-box/manual", label: "Unicorn Box Manual" },
  { href: "/unicorn-box", label: "Knowledge Bank™" },
  { href: "/unicorn-box", label: "Stock-Pulse™" },
  { href: "/emerald", label: "Unicorn Emerald™" },
  { href: "/marble", label: "Unicorn Marble™" },
  { href: "/brand-marks", label: "Brand Marks & Trademarks" },
  { href: "/auth", label: "Sign in / Sign up" },
];

export default function Funnel() {
  const [variant, setVariant] = useState<CtaVariant>("A");
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadStage, setLeadStage] = useState<string>("blueprint");
  const [leadProduct, setLeadProduct] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const variantTrackedRef = useRef(false);

  useEffect(() => {
    setVariant(getOrAssignVariant());
  }, []);

  // Log a single impression per page load with the assigned variant
  useEffect(() => {
    if (variantTrackedRef.current) return;
    variantTrackedRef.current = true;
    trackFunnelEvent({ event_type: "impression", stage: "page_view", variant });
  }, [variant]);

  // Fire a single "exposure" lead-event to the analytics-ish funnel_leads
  // table (skipped — only emails written). Variant tracking happens with each lead.

  // SEO — title, description, OG, canonical, JSON-LD (ItemList + Breadcrumb + FAQ)
  useEffect(() => {
    document.title =
      "Sales Funnel, Build Costs & Blueprint Delivery · Unicorn Corporation";

    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta(
      "description",
      "Conversion funnel + transparent build-cost flow for all 28 Unicorn Corporation products. Get the blueprint emailed instantly — Knowledge Bank, Stock-Pulse, Unicorn Emerald, Unicorn Marble, Unicorn Box.",
    );
    setMeta(
      "keywords",
      "unicorn corporation, unicorn box, knowledge bank, stock pulse, unicorn emerald, unicorn marble, sales funnel, blueprint, build cost, AI builder, conversion funnel",
    );
    setMeta("robots", "index, follow, max-image-preview:large");
    setMeta("og:title", "Unicorn Corporation — Funnel, Build-Costs & Instant Blueprint", "property");
    setMeta(
      "og:description",
      "Visitor → intake → checkout → blueprint. See every product's build economics and get the turnkey blueprint emailed in seconds.",
      "property",
    );
    setMeta("og:type", "website", "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", "Unicorn Corporation — Sales Funnel & Build-Cost Flow");
    setMeta(
      "twitter:description",
      "28 products, one master funnel, instant blueprint delivery.",
    );

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/funnel`);

    // JSON-LD: ItemList of all products + BreadcrumbList + FAQPage
    const ldId = "funnel-jsonld";
    let ld = document.getElementById(ldId);
    if (!ld) {
      ld = document.createElement("script");
      ld.id = ldId;
      (ld as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(ld);
    }
    const origin = window.location.origin;
    ld.textContent = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Unicorn Corporation Fleet Build-Cost Flow",
        itemListElement: FLEET_PRODUCTS.map((p, i) => ({
          "@type": "Product",
          position: i + 1,
          name: p.display,
          description: p.tagline,
          brand: { "@type": "Brand", name: "Unicorn Corporation" },
          offers: { "@type": "Offer", priceCurrency: "USD", description: p.build.total, availability: "https://schema.org/InStock" },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Funnel", item: `${origin}/funnel` },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How fast do I receive my Unicorn Box blueprint?",
            acceptedAnswer: { "@type": "Answer", text: "Instantly. Drop your email on the funnel page or finish intake — the blueprint is generated and emailed within seconds." },
          },
          {
            "@type": "Question",
            name: "What does each product cost to build?",
            acceptedAnswer: { "@type": "Answer", text: "Every product on the fleet shows materials, outsourced build, build time, our fee, and the final customer price in the build-cost table on /funnel." },
          },
          {
            "@type": "Question",
            name: "Which Unicorn product should I start with?",
            acceptedAnswer: { "@type": "Answer", text: "Most founders start with Unicorn Box ($27–$297) for a turnkey blueprint, then layer Knowledge Bank, Stock-Pulse, Emerald, or Marble." },
          },
        ],
      },
    ]);
  }, []);

  const sortedFleet = useMemo(
    () => [...FLEET_PRODUCTS].sort((a, b) => (a.stage === b.stage ? 0 : a.stage === "active" ? -1 : 1)),
    [],
  );

  function openLead(stage: string, product?: string) {
    setLeadStage(stage);
    setLeadProduct(product);
    setSubmitted(false);
    setLeadOpen(true);
    trackFunnelEvent({ event_type: "click_blueprint", stage, product, variant });
  }

  function trackCheckoutClick(stage: string, product?: string) {
    trackFunnelEvent({ event_type: "click_checkout", stage, product, variant });
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    try {
      const attribution = getAttribution();
      const { error } = await supabase.from("funnel_leads").insert({
        email: email.trim().toLowerCase(),
        source: "funnel_page",
        stage: leadStage,
        product_interest: leadProduct ?? null,
        ab_cta_variant: variant,
        user_agent: navigator.userAgent.slice(0, 500),
        referrer: (attribution.referrer ?? document.referrer ?? "").slice(0, 500),
        metadata: { variant_copy: CTA_COPY[variant], attribution },
      });
      if (error) throw error;

      trackFunnelEvent({ event_type: "email_entered", stage: leadStage, product: leadProduct, variant });

      // Fire-and-forget: kick the blueprint generation/automation if available,
      // propagating UTM/referrer attribution into the automation payload.
      try {
        await supabase.functions.invoke("blueprint-generate", {
          body: {
            email: email.trim().toLowerCase(),
            tier: "spark",
            intake: { source: "funnel_lead_capture", stage: leadStage, product: leadProduct ?? null },
            attribution,
            lead_capture_only: true,
          },
        });
      } catch {
        // automation is optional — lead is already saved
      }

      setSubmitted(true);
      trackFunnelEvent({ event_type: "lead", stage: leadStage, product: leadProduct, variant });
      trackFunnelEvent({ event_type: "blueprint_sent", stage: leadStage, product: leadProduct, variant });
      toast({ title: "Blueprint on the way", description: "Check your inbox in the next few minutes." });
    } catch (err: any) {
      toast({
        title: "Couldn't save your email",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const checkoutLabel = CTA_COPY[variant].checkout;
  const blueprintLabel = CTA_COPY[variant].blueprint;

  // Variant B = swapped visual styling (filled blueprint button, outline checkout) — true A/B
  const checkoutBtnClass =
    variant === "A"
      ? "bg-[hsl(var(--emerald-glow))] text-background shadow-[0_0_18px_hsl(var(--emerald)/0.6)] hover:opacity-90"
      : "border-2 border-[hsl(var(--emerald-glow))] bg-background text-fluoro-gold hover:bg-[hsl(var(--emerald-glow))/0.15]";

  const blueprintBtnClass =
    variant === "A"
      ? "border-2 border-[hsl(var(--emerald-glow))] bg-background text-fluoro-gold hover:bg-[hsl(var(--emerald-glow))/0.15]"
      : "bg-fluoro-gold text-background shadow-[0_0_18px_hsl(var(--emerald)/0.6)] hover:opacity-90";

  return (
    <div className="caribbean-accent min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b-2 border-[hsl(var(--emerald-glow))/0.4] bg-background/95 backdrop-blur-md sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Unicorn Corporation logo" className="h-8 w-auto" />
            <span className="font-bold text-fluoro text-sm">Unicorn Corporation</span>
          </Link>
          <nav className="flex items-center gap-2 text-xs">
            <Link to="/" className="px-3 py-1.5 rounded-full text-fluoro hover:bg-secondary">Home</Link>
            <Link to="/unicorn-box" className="px-3 py-1.5 rounded-full text-fluoro-gold hover:bg-secondary">Unicorn Box™</Link>
          </nav>
        </div>
      </header>

      {/* A/B variant indicator (subtle, dev/admin friendly) */}
      <div className="container mx-auto px-4 pt-3">
        <div className="text-[10px] uppercase tracking-widest text-fluoro/60">
          CTA test variant: <span className="font-bold text-fluoro-gold">{variant}</span>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 space-y-10">
        {/* Hero */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-[hsl(var(--emerald-glow))] bg-background px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fluoro shadow-[0_0_24px_hsl(var(--emerald)/0.55)]">
            <Sparkles className="h-3.5 w-3.5" /> Conversion & Build Economics
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-mega-fluoro">
            How the Empire converts a click into a customer.
          </h1>
          <p className="text-lg text-fluoro-white max-w-2xl mx-auto">
            One master funnel powers Unicorn Box. Four flagship funnels run in parallel. Twenty-eight build-cost flows underneath — every product priced for outsourced build + our fee + customer hand-off.
          </p>
          <div className="text-[10px] uppercase tracking-widest text-fluoro/60">
            <Link to="/boardroom/funnel-analytics" className="hover:text-fluoro-gold underline">Admin → A/B Analytics Dashboard</Link>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => openLead("hero")}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black uppercase tracking-wider transition-all ${blueprintBtnClass}`}
            >
              <Mail className="h-4 w-4" /> {blueprintLabel}
            </button>
            <Link
              to="/unicorn-box/start"
              onClick={() => trackCheckoutClick("hero")}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black uppercase tracking-wider transition-all ${checkoutBtnClass}`}
            >
              <Rocket className="h-4 w-4" /> {checkoutLabel}
            </Link>
          </div>
        </section>

        {/* SECTION 1 — Master funnel */}
        <section aria-labelledby="master-funnel">
          <h2 id="master-funnel" className="text-3xl md:text-4xl font-black text-fluoro-gold mb-8 text-center">
            1. Master Funnel — Visitor → Customer
          </h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {MASTER_FUNNEL.map((stage, i) => {
              const widths = ["w-full", "w-[88%]", "w-[74%]", "w-[58%]", "w-[42%]"];
              return (
                <div key={stage.label} className="flex flex-col items-center w-full">
                  <div
                    className={`${widths[i]} rounded-2xl border-2 border-[hsl(var(--emerald-glow))] bg-background px-5 py-4 text-center shadow-[0_0_28px_hsl(var(--emerald)/0.45)]`}
                  >
                    <div className={`text-xs uppercase tracking-widest ${stage.color} font-bold`}>Stage {i + 1}</div>
                    <div className="text-lg md:text-xl font-black text-fluoro-white mt-1">{stage.label}</div>
                    <div className="text-xs text-fluoro mt-1">{stage.sub}</div>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <Link
                        to="/unicorn-box/start"
                        onClick={() => trackCheckoutClick(stage.key)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all ${checkoutBtnClass}`}
                      >
                        <Rocket className="h-3 w-3" /> {checkoutLabel}
                      </Link>
                      <button
                        onClick={() => openLead(stage.key)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all ${blueprintBtnClass}`}
                      >
                        <Package className="h-3 w-3" /> {blueprintLabel}
                      </button>
                    </div>
                  </div>
                  {i < MASTER_FUNNEL.length - 1 && (
                    <ArrowDown className="h-6 w-6 text-fluoro-gold my-1 drop-shadow-[0_0_6px_hsl(var(--emerald-glow))]" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 2 — Per-product flagship funnels */}
        <section aria-labelledby="flagship-funnels">
          <h2 id="flagship-funnels" className="text-3xl md:text-4xl font-black text-fluoro mb-2 text-center">
            2. Flagship Funnels — Landing → Pricing → Checkout
          </h2>
          <p className="text-center text-fluoro-white text-sm mb-8 max-w-2xl mx-auto">
            Knowledge Bank, Stock-Pulse, Emerald, Marble — each runs the same three-step capture flow.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {PRODUCT_FUNNELS.map((p) => (
              <article
                key={p.brand}
                className="rounded-2xl border-2 border-[hsl(var(--emerald-glow))] bg-background p-6 shadow-[0_0_24px_hsl(var(--emerald)/0.4)] flex flex-col"
              >
                <h3 className={`text-2xl font-black ${p.color}`}>{p.brand}</h3>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="rounded-full border-2 border-[hsl(var(--emerald-glow))] text-fluoro-gold w-7 h-7 flex items-center justify-center text-xs font-black shrink-0">1</span>
                    <div>
                      <div className="text-fluoro-white font-bold">Landing</div>
                      <Link to={p.landing} className="text-fluoro underline hover:text-fluoro-gold break-all">
                        {p.landing}
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="rounded-full border-2 border-[hsl(var(--emerald-glow))] text-fluoro-gold w-7 h-7 flex items-center justify-center text-xs font-black shrink-0">2</span>
                    <div>
                      <div className="text-fluoro-white font-bold">Pricing</div>
                      <ul className="mt-1 space-y-0.5">
                        {p.pricing.map((tier) => (
                          <li key={tier} className="text-fluoro text-xs">• {tier}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="rounded-full border-2 border-[hsl(var(--emerald-glow))] text-fluoro-gold w-7 h-7 flex items-center justify-center text-xs font-black shrink-0">3</span>
                    <div className="flex-1">
                      <div className="text-fluoro-white font-bold">Checkout</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Link
                          to={p.checkoutHref}
                          onClick={() => trackCheckoutClick("flagship", p.brand)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-colors ${checkoutBtnClass}`}
                        >
                          {checkoutLabel} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => openLead("flagship", p.brand)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-colors ${blueprintBtnClass}`}
                        >
                          <Mail className="h-3 w-3" /> {blueprintLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[hsl(var(--emerald-glow))/0.3]">
                  <div className="text-xs uppercase tracking-widest text-fluoro-gold font-bold">Customer receives</div>
                  <p className="text-sm text-fluoro-white mt-1">{p.customerGets}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* SECTION 3 — Consolidated build-cost flow for full fleet */}
        <section aria-labelledby="build-flow">
          <h2 id="build-flow" className="text-3xl md:text-4xl font-black text-fluoro-sapphire mb-2 text-center">
            3. Build-Cost Flow — All {FLEET_PRODUCTS.length} Products
          </h2>
          <p className="text-center text-fluoro-white text-sm mb-8 max-w-2xl mx-auto">
            Materials → outsourced build → time → our fee → customer hand-off.
          </p>

          <div className="overflow-x-auto rounded-2xl border-2 border-[hsl(var(--emerald-glow))] bg-background shadow-[0_0_28px_hsl(var(--emerald)/0.4)]">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b-2 border-[hsl(var(--emerald-glow))/0.5] bg-background">
                  <th className="text-left p-3 text-fluoro-gold font-black uppercase tracking-wider">Product</th>
                  <th className="text-left p-3 text-fluoro font-black uppercase tracking-wider">Materials</th>
                  <th className="text-left p-3 text-fluoro font-black uppercase tracking-wider">Outsource Build</th>
                  <th className="text-left p-3 text-fluoro font-black uppercase tracking-wider">Time</th>
                  <th className="text-left p-3 text-fluoro-gold font-black uppercase tracking-wider">Our Fee</th>
                  <th className="text-left p-3 text-mega-fluoro font-black uppercase tracking-wider">Customer Pays</th>
                  <th className="text-left p-3 text-fluoro-gold font-black uppercase tracking-wider">Order</th>
                </tr>
              </thead>
              <tbody>
                {sortedFleet.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-b border-[hsl(var(--emerald-glow))/0.2] ${idx % 2 === 0 ? "bg-background" : "bg-[hsl(var(--emerald)/0.05)]"}`}
                  >
                    <td className="p-3 align-top">
                      <Link to={`/p/${p.id}`} className="font-black text-fluoro-white hover:text-fluoro-gold underline-offset-2 hover:underline">
                        {p.display}
                      </Link>
                      <div className="text-[10px] uppercase tracking-wider text-fluoro mt-0.5">
                        {p.stage === "active" ? "● Active" : "○ Concept"} · {p.valuation}
                      </div>
                    </td>
                    <td className="p-3 align-top text-fluoro-white">{p.build.materials}</td>
                    <td className="p-3 align-top text-fluoro-white">{p.build.outsourceBuild}</td>
                    <td className="p-3 align-top text-fluoro-white">{p.build.buildDays}</td>
                    <td className="p-3 align-top text-fluoro-gold font-bold">{p.build.ourFee}</td>
                    <td className="p-3 align-top text-mega-fluoro font-bold">{p.build.total}</td>
                    <td className="p-3 align-top">
                      <Link
                        to={`/p/${p.id}`}
                        onClick={() => trackCheckoutClick(`row:${p.id}`)}
                        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-400 px-3 py-1.5 text-[11px] font-black text-background hover:opacity-90"
                      >
                        Buy →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 4 — Internal-link cloud (SEO + discoverability) */}
        <section aria-labelledby="explore" className="text-center">
          <h2 id="explore" className="text-2xl md:text-3xl font-black text-fluoro-gold mb-4">
            Explore the entire empire
          </h2>
          <p className="text-fluoro-white text-sm max-w-2xl mx-auto mb-6">
            Every product page, every tool, one click away — so search engines (and humans) can find what's currently buried.
          </p>
          <ul className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {INTERNAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  to={l.href}
                  className="inline-flex items-center rounded-full border-2 border-[hsl(var(--emerald-glow))] bg-background px-4 py-1.5 text-xs font-bold text-fluoro hover:text-fluoro-gold hover:bg-[hsl(var(--emerald-glow))/0.1] transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 py-10">
          <h2 className="text-3xl font-black text-mega-fluoro">Ready to ship?</h2>
          <p className="text-fluoro-white max-w-xl mx-auto">
            Pick the funnel. Pay the fee. Receive your turnkey blueprint or live software within the build window.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/unicorn-box/start"
              onClick={() => trackCheckoutClick("footer")}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black transition-all ${checkoutBtnClass}`}
            >
              <Rocket className="h-4 w-4" /> {checkoutLabel}
            </Link>
            <button
              onClick={() => openLead("footer")}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black transition-all ${blueprintBtnClass}`}
            >
              <Mail className="h-4 w-4" /> {blueprintLabel}
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-[hsl(var(--emerald-glow))/0.3] py-6 mt-6">
        <p className="text-center text-xs text-fluoro">© Unicorn Corporation · PGVA Ventures LLC</p>
      </footer>

      {/* Lead capture modal */}
      {leadOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLeadOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-title"
        >
          <div
            className="relative w-full max-w-md rounded-2xl border-2 border-[hsl(var(--emerald-glow))] bg-background p-6 shadow-[0_0_40px_hsl(var(--emerald)/0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLeadOpen(false)}
              className="absolute top-3 right-3 text-fluoro hover:text-fluoro-gold"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {!submitted ? (
              <>
                <h3 id="lead-title" className="text-2xl font-black text-mega-fluoro">
                  {blueprintLabel}
                </h3>
                <p className="text-fluoro-white text-sm mt-2">
                  Drop your email. We'll send your turnkey Unicorn Box blueprint
                  {leadProduct ? ` (with ${leadProduct} extras)` : ""} and kick off the build automation.
                </p>
                <form onSubmit={submitLead} className="mt-5 space-y-3">
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@empire.com"
                    className="w-full rounded-full border-2 border-[hsl(var(--emerald-glow))] bg-background px-4 py-2.5 text-sm text-fluoro-white placeholder:text-fluoro/50 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--emerald-glow))]"
                    maxLength={255}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--emerald-glow))] text-background px-5 py-2.5 text-sm font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-50 shadow-[0_0_18px_hsl(var(--emerald)/0.6)]"
                  >
                    {submitting ? "Sending…" : (
                      <>
                        <Mail className="h-4 w-4" /> Email me the blueprint
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-fluoro/70 text-center">
                    No spam. One-tap unsubscribe. Stage: {leadStage} · Variant: {variant}
                  </p>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-fluoro-gold mx-auto drop-shadow-[0_0_12px_hsl(var(--emerald-glow))]" />
                <h3 className="text-2xl font-black text-mega-fluoro mt-3">Blueprint en route</h3>
                <p className="text-fluoro-white text-sm mt-2">
                  Check <span className="text-fluoro-gold font-bold">{email}</span> in the next few minutes.
                </p>
                <button
                  onClick={() => setLeadOpen(false)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-[hsl(var(--emerald-glow))] bg-background text-fluoro-gold px-5 py-2 text-xs font-black uppercase tracking-wider hover:bg-[hsl(var(--emerald-glow))/0.15]"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
