import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Globe, Network, Shield, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNoIndex } from "@/hooks/useNoIndex";

const COUNTRIES = ["USA","CHN","RUS","IND","BRA","DEU","FRA","GBR","JPN","CAN","AUS","ZAF","KOR","SAU","ARE","ISR","CHE","SGP","MEX","NGA"];
const AI_TOKENS = ["FET","AGIX","OCEAN","RNDR","GRT","TAO","WLD","NMR","AKT","ARKM"];

export default function ChameleonHub() {
  useNoIndex();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth?redirect=/boardroom/chameleon"); return; }
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin(!!data?.some((r: any) => r.role === "admin"));
    })();
  }, [user, loading, navigate]);

  if (!user || isAdmin === null) return <div className="min-h-screen bg-black" />;
  if (!isAdmin) return (
    <div className="min-h-screen bg-black text-white grid place-items-center p-6">
      <div className="text-center">
        <Shield className="h-10 w-10 mx-auto mb-3 text-red-500" />
        <p className="text-white/70">Behind The Empire. Owner access only.</p>
        <Link to="/" className="mt-4 inline-block underline text-red-400">← Home</Link>
      </div>
    </div>
  );

  const FEE = 0.0001;

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,0,0,0.25), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(255,255,255,0.05), transparent 60%)",
      }} />
      <main className="relative z-10 mx-auto max-w-6xl px-5 pt-10 pb-16">
        <Link to="/boardroom" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white">
          <ArrowLeft className="h-3 w-3" /> Boardroom
        </Link>

        <header className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-950/40 px-3 py-1 text-[10px] uppercase tracking-[0.4em] text-red-300">
            <Coins className="h-3 w-3" /> Blueprint Engine · Prototype
          </div>
          <h1 className="mt-5 font-black tracking-tight leading-[0.9]"
            style={{ fontSize: "clamp(2.5rem, 9vw, 6rem)",
              background: "linear-gradient(180deg, #ffffff 0%, hsl(0 0% 70%) 40%, hsl(0 90% 50%) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              textShadow: "0 0 60px rgba(255,0,0,0.35)" }}>
            CHAMELEON HUB
          </h1>
          <p className="mt-4 text-white/60 text-sm sm:text-base max-w-2xl mx-auto">
            A decentralized, country-agnostic AI-token clearinghouse. Modeled on the World Bank
            and Swiss banking neutrality. Every AI token in the world plugs in here.
            We skim <span className="text-red-300 font-bold">{FEE * 100}%</span> per token processed.
            The Chameleon is a hybrid of every major AI token — when consolidation hits, absorption is trivial.
          </p>
        </header>

        {/* Pillars */}
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          {[
            { icon: Globe, title: "Sovereign-Neutral", desc: "Domiciled outside any single jurisdiction. Multi-treaty compliant." },
            { icon: Network, title: "Universal Ports", desc: "One adapter per country, one per AI token. All routes converge." },
            { icon: Zap, title: "Micro-Skim Economics", desc: "0.0001 per token. At scale, this funds the entire Empire." },
          ].map((p) => (
            <div key={p.title} className="rounded-2xl p-5 border border-red-900/40 bg-gradient-to-br from-black to-red-950/20">
              <p.icon className="h-5 w-5 text-red-400" />
              <h3 className="mt-3 text-sm font-bold uppercase tracking-wider text-white">{p.title}</h3>
              <p className="mt-1 text-xs text-white/60">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Country ports */}
        <section className="mt-12">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">Country Ports — open</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2">
            {COUNTRIES.map((c) => (
              <div key={c} className="rounded-md border border-white/10 bg-white/[0.03] py-2 text-center text-[11px] tracking-widest text-white/80 hover:border-red-500/60 hover:text-red-300 transition">
                {c}
              </div>
            ))}
          </div>
        </section>

        {/* AI token ports */}
        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">AI Token Ports — adapters ready</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-10 gap-2">
            {AI_TOKENS.map((t) => (
              <div key={t} className="rounded-md border border-red-900/40 bg-red-950/20 py-2 text-center text-[11px] font-bold tracking-widest text-red-200">
                {t}
              </div>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section className="mt-12 rounded-2xl border border-red-900/40 bg-black/60 p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-red-300 mb-4">Architecture (v0)</h2>
          <pre className="text-[11px] text-white/70 overflow-x-auto leading-relaxed">{`
   [ Country Port: USA / CHN / RUS / … ]
                │
                ▼
   ┌──────────────────────────────┐
   │   CHAMELEON CLEARING BUS     │  ← skim 0.0001 / token
   │   (sovereign-neutral)        │
   └──────────────────────────────┘
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
   [ FET ]  [ TAO ]  [ AGIX ]  …  any AI token

   Outflow → Empire Treasury (multi-sig, multi-jurisdiction)
`}</pre>
        </section>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
          Activates post-consolidation event. Most likely trigger: major-power conflict.
        </p>
      </main>
    </div>
  );
}
