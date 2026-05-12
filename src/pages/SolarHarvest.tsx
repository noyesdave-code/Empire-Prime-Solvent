import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Rocket, Sun, Zap, Droplets, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNoIndex } from "@/hooks/useNoIndex";

export default function SolarHarvest() {
  useNoIndex();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth?redirect=/boardroom/solar-harvest"); return; }
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

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,80,0,0.25), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(255,0,0,0.15), transparent 60%)",
      }} />
      <main className="relative z-10 mx-auto max-w-6xl px-5 pt-10 pb-16">
        <Link to="/boardroom" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white">
          <ArrowLeft className="h-3 w-3" /> Boardroom
        </Link>

        <header className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-950/40 px-3 py-1 text-[10px] uppercase tracking-[0.4em] text-red-300">
            <Sun className="h-3 w-3" /> Solar Radiation Farming · R&amp;D
          </div>
          <h1 className="mt-5 font-black tracking-tight leading-[0.9]"
            style={{ fontSize: "clamp(2.5rem, 9vw, 6rem)",
              background: "linear-gradient(180deg, #ffffff 0%, hsl(0 0% 70%) 40%, hsl(0 90% 50%) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              textShadow: "0 0 60px rgba(255,80,0,0.35)" }}>
            HELIONET
          </h1>
          <p className="mt-4 text-white/60 text-sm sm:text-base max-w-2xl mx-auto">
            A cheap rocket lobs an AI drone-swarm net sunward. The net unfurls, self-guides
            via radiation-attraction sensing, absorbs micron-scale terawatts, and beams
            energy back to Earth. First customer: our own data centers. End game: solve
            global electricity and water-pumping shortages.
          </p>
        </header>

        {/* Stages */}
        <div className="mt-12 grid md:grid-cols-4 gap-4">
          {[
            { icon: Rocket, n: "01", t: "Cheap Launch", d: "Sub-orbital booster, expendable. Sub-$2M per shot." },
            { icon: Sun, n: "02", t: "Net Deploy", d: "Drone swarm unfurls — fisherman's net analog." },
            { icon: Zap, n: "03", t: "Absorb & Beam", d: "Drones swim radiation gradient. Microwave/laser downlink." },
            { icon: Droplets, n: "04", t: "Power & Water", d: "Empire data center first. Then sell electricity & desalinated water." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl p-5 border border-red-900/40 bg-gradient-to-br from-black to-red-950/20">
              <div className="flex items-center justify-between">
                <s.icon className="h-5 w-5 text-red-400" />
                <span className="text-[10px] tracking-widest text-white/40">{s.n}</span>
              </div>
              <h3 className="mt-3 text-sm font-bold uppercase tracking-wider text-white">{s.t}</h3>
              <p className="mt-1 text-xs text-white/60">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Render description */}
        <section className="mt-12 rounded-2xl border border-red-900/40 bg-black/60 p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-red-300 mb-4">Concept Render</h2>
          <pre className="text-[10px] text-white/70 overflow-x-auto leading-relaxed">{`
                                ☼  SUN
                              ╱│╲
                             ╱ │ ╲    ← radiation gradient
                            ╱  │  ╲
                       ┌──────────────┐
                       │  DRONE NET   │  ← self-guides up the gradient
                       │ ▲▲▲▲▲▲▲▲▲▲▲▲ │     absorbs μ-terawatts
                       └──────┬───────┘
                              │  microwave/laser downlink
                              ▼
                       ╔══════════════╗
                       ║ EARTH RECEIVER║ → Empire DC → Grid → Water
                       ╚══════════════╝
`}</pre>
        </section>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
          Funds DoD contracts, Pods, Heatsink, and the Chameleon Hub. Think big.
        </p>
      </main>
    </div>
  );
}
