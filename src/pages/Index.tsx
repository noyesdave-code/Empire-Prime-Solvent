import { Link } from "react-router-dom";
import { LogIn, LogOut } from "lucide-react";
import { AniChat } from "@/components/AniChat";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <main
      className="min-h-screen relative overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(ellipse at top, hsl(0 85% 18%) 0%, hsl(0 0% 0%) 55%, hsl(0 0% 0%) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 15% 85%, hsl(0 90% 30% / 0.18), transparent 55%), radial-gradient(circle at 85% 15%, hsl(0 90% 25% / 0.15), transparent 55%)",
        }}
      />

      {/* HERO — Empire pushed to top */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-6 md:pt-10 pb-4 text-center">
        <h1
          className="text-5xl md:text-7xl font-black tracking-tight"
          style={{
            background:
              "linear-gradient(180deg, #ffffff 0%, #ffffff 25%, hsl(0 100% 70%) 60%, hsl(0 100% 60%) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 18px hsl(0 100% 55% / 0.85)) drop-shadow(0 0 40px hsl(0 100% 50% / 0.5))",
          }}
        >
          The Empire
        </h1>
      </section>

      {/* SINGLE LARGE CHAT — ~3/4 page */}
      <section className="relative z-10 mx-auto max-w-6xl px-3 md:px-6 pb-3">
        <div className="mx-auto" style={{ width: "min(100%, 1100px)" }}>
          <AniChat />
        </div>
      </section>

      {/* IDE CTA — code, run in microVM, publish */}
      <section className="relative z-10 flex justify-center pb-4">
        <Link
          to="/ide"
          className="group inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs sm:text-sm text-white/85 hover:text-white transition"
          style={{
            background: "linear-gradient(135deg, hsl(0 0% 6%), hsl(0 60% 12%))",
            border: "1px solid hsl(0 90% 45% / 0.55)",
            boxShadow: "0 0 22px hsl(0 90% 40% / 0.35)",
          }}
        >
          <span className="uppercase tracking-[0.2em] text-[10px]" style={{ color: "hsl(0 90% 60%)" }}>New</span>
          Want to code, run in a microVM &amp; publish? → Open the Empire IDE
        </Link>
      </section>

      {/* SIGN IN — center, below chat, above footer */}
      <section className="relative z-10 flex justify-center pb-6">
        {user ? (
          <Button
            onClick={() => signOut()}
            variant="outline"
            size="sm"
            className="border-red-900/70 bg-black/60 text-white/80 hover:bg-red-950/40 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-red-900/70 bg-black/60 text-white/80 hover:bg-red-950/40 hover:text-white"
          >
            <Link to="/auth">
              <LogIn className="h-3.5 w-3.5 mr-1.5" /> Sign in
            </Link>
          </Button>
        )}
      </section>

      {/* LEGAL FOOTER */}
      <footer className="relative z-10 border-t border-red-950/60 bg-black/60">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-[11px] text-white/40 space-y-1">
          <div>© {new Date().getFullYear()} PGVA Ventures LLC. All rights reserved.</div>
          <div className="flex justify-center gap-4">
            <Link to="/terms" className="hover:text-white/70">Terms</Link>
            <Link to="/privacy" className="hover:text-white/70">Privacy</Link>
            <Link to="/refund" className="hover:text-white/70">Refund</Link>
          </div>
          <div className="text-white/30">
            The Empire and Ani are properties of PGVA Ventures LLC. Unauthorized use is prohibited.
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
