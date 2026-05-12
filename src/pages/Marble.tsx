import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Activity, DollarSign, Rocket, Building2, Crown, Gem } from "lucide-react";
import logo from "@/assets/unicorn-empire-logo.png";
import { ReserveForm } from "@/components/ReserveForm";
import { AskUnicorn } from "@/components/AskUnicorn";

const FEATURES = [
  { icon: Activity, title: "Live Scoreboard", desc: "Bloomberg-style real-time scoreboard for every business in the portfolio." },
  { icon: DollarSign, title: "Revenue AI", desc: "Optimises pricing, upsells, and lifetime value across every channel." },
  { icon: Rocket, title: "Growth AI", desc: "SEO, social, paid ads, and email — orchestrated as one growth engine." },
  { icon: Building2, title: "Business AI", desc: "Operates each vertical end-to-end: support, fulfillment, ops, finance." },
];

const Marble = () => (
  <main className="caribbean-accent min-h-screen bg-background text-foreground">
    <title>Unicorn Marble · Premium Black/Glass Edition — Unicorn Empire</title>
    <meta name="description" content="Unicorn Marble is the premium edition: live scoreboard, revenue AI, growth AI, and business AI in one black-and-glass interface." />

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
          <Link to="/emerald" className="px-3 py-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground">Emerald</Link>
          <span className="px-3 py-1.5 rounded-full bg-white/10 text-foreground font-medium">Marble</span>
          <Link to="/unicorn-box" className="px-3 py-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground">Unicorn Box™</Link>
        </nav>
      </div>
    </header>

    <section className="mx-auto max-w-5xl px-6 pt-10 pb-8 text-center">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-3 w-3" /> Back to Empire
      </Link>
      <Sparkles className="h-12 w-12 text-foreground mx-auto mb-6 animate-float" />
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Tier 1 · Flagship Pillar</p>
      <h1 className="text-5xl md:text-7xl font-bold leading-tight">
        Unicorn <span className="text-gradient-marble">Marble</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
        Premium black-and-glass edition of the Empire stack. Built for operators running multiple businesses on a single
        live scoreboard.
      </p>
      <div className="mx-auto mt-8 max-w-md text-left">
        <p className="text-[10px] uppercase tracking-[0.25em] text-fluoro-gold mb-2 text-center">Step 14 · Concept — not yet for sale</p>
        <ReserveForm product="marble" stage="waitlist" mode="waitlist" cta="Join waitlist · Free" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">No charge today. We email you the moment Marble activates.</p>
    </section>

    <section className="mx-auto max-w-6xl px-6 pb-10">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <article key={f.title} className="glass-strong rounded-2xl p-6 hover:-translate-y-1 transition-transform">
              <Icon className="h-6 w-6 text-foreground/80 mb-4" />
              <h3 className="text-lg font-bold">{f.title}</h3>
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
        <Link to="/emerald" className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform">
          <Gem className="h-5 w-5 text-primary mb-3" />
          <h3 className="text-xl font-bold text-gradient-emerald">Emerald</h3>
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

export default Marble;
