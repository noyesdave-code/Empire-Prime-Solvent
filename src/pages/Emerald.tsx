import { Link } from "react-router-dom";
import { ArrowLeft, Gem, Brain, TrendingUp, Bot, Sparkles, Crown } from "lucide-react";
import logo from "@/assets/unicorn-empire-logo.png";
import { ReserveForm } from "@/components/ReserveForm";
import { AskUnicorn } from "@/components/AskUnicorn";

const FEATURES = [
  { icon: Brain, title: "Trend Prediction AI", desc: "Hourly scans across 50+ data sources predict winning niches before competitors notice." },
  { icon: TrendingUp, title: "Revenue Automation", desc: "Subscriptions, upsells, affiliate, and agency plans deployed on autopilot." },
  { icon: Bot, title: "Business Builder AI", desc: "Spins up a complete vertical — landing page, pricing, content engine — in under an hour." },
];

const Emerald = () => (
  <main className="caribbean-accent min-h-screen bg-background text-foreground">
    <title>Unicorn Emerald · AI Revenue OS — Unicorn Empire</title>
    <meta name="description" content="Unicorn Emerald is the flagship AI Revenue Operating System: trend prediction, revenue automation, and self-building businesses at scale." />

    <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
    <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-40" />

    <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-sm font-semibold">Unicorn Holdings</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-xs">
          <Link to="/" className="px-3 py-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground">Empire</Link>
          <span className="px-3 py-1.5 rounded-full bg-primary/15 text-primary font-medium">Emerald</span>
          <Link to="/marble" className="px-3 py-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground">Marble</Link>
          <Link to="/unicorn-box" className="px-3 py-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground">Unicorn Box™</Link>
        </nav>
      </div>
    </header>

    <section className="mx-auto max-w-5xl px-6 pt-10 pb-8 text-center">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-3 w-3" /> Back to Empire
      </Link>
      <Gem className="h-12 w-12 text-primary mx-auto mb-6 animate-float" />
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Tier 1 · Flagship Pillar</p>
      <h1 className="text-5xl md:text-7xl font-bold leading-tight">
        Unicorn <span className="text-gradient-emerald">Emerald</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
        The AI Revenue Operating System. Predicts trends, builds businesses, and compounds revenue — all without
        human intervention.
      </p>
      <div className="mx-auto mt-8 max-w-md text-left">
        <p className="text-[10px] uppercase tracking-[0.25em] text-fluoro-gold mb-2 text-center">Step 13 · Concept — not yet for sale</p>
        <ReserveForm product="emerald" stage="waitlist" mode="waitlist" cta="Join waitlist · Free" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">No charge today. We email you the moment Emerald activates.</p>
    </section>

    <section className="mx-auto max-w-6xl px-6 pb-10">
      <div className="grid gap-5 md:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <article key={f.title} className="glass rounded-2xl p-6 ring-1 ring-primary/20 hover:-translate-y-1 transition-transform">
              <Icon className="h-6 w-6 text-primary mb-4" />
              <h3 className="text-xl font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </article>
          );
        })}
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-6 pb-12">
      <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">Continue exploring</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/" className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform">
          <Crown className="h-5 w-5 text-accent mb-3" />
          <h3 className="text-xl font-bold text-gradient-empire">Empire</h3>
        </Link>
        <Link to="/marble" className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform">
          <Sparkles className="h-5 w-5 text-foreground/70 mb-3" />
          <h3 className="text-xl font-bold text-gradient-marble">Marble</h3>
        </Link>
        <Link to="/unicorn-box" className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform">
          <img src={logo} alt="" className="h-6 w-6 rounded mb-3" />
          <h3 className="text-xl font-bold">Unicorn Box™</h3>
        </Link>
      </div>
    </section>
    <AskUnicorn />
  </main>
);

export default Emerald;
