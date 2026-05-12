import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Crown } from "lucide-react";

const OWNER_EMAIL = "noyes.dave@gmail.com";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const routeAfterAuth = async (user: User | null | undefined) => {
    if (!user) { navigate("/", { replace: true }); return; }
    if (user.email?.toLowerCase() === OWNER_EMAIL) {
      navigate("/boardroom", { replace: true });
      return;
    }

    try {
      let roles: { role: string }[] | null = null;
      let roleError: unknown = null;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        roles = data;
        roleError = error;
        if (error || roles?.some((r) => r.role === "admin")) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (roleError) console.warn("[auth] role lookup error:", roleError);
      const isAdmin = !!roles?.some((r) => r.role === "admin");
      navigate(isAdmin ? "/boardroom" : "/", { replace: true });
    } catch (e) {
      console.error("[auth] routeAfterAuth failed:", e);
      navigate("/", { replace: true });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeAfterAuth(data.session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        routeAfterAuth(session.user);
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're in.");
        await routeAfterAuth(data.user);
      } else if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        await routeAfterAuth(data.user);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for a reset link.");
        setMode("signin");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const generic =
        mode === "signup"
          ? "If that email isn't already registered, we've created your account. Check your inbox."
          : mode === "forgot"
          ? "If that email is registered, a reset link has been sent."
          : "Invalid email or password.";
      toast.error(generic);
    } finally {
      setLoading(false);
    }
  };

  const signInGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) {
      console.error("Google sign-in error:", error);
      toast.error("Sign-in failed. Please try again.");
    }
  };

  return (
    <main
      className="min-h-screen relative overflow-hidden text-white flex items-center justify-center px-4 py-10"
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

      <div
        className="relative z-10 w-full max-w-md rounded-3xl p-8 backdrop-blur-sm"
        style={{
          background: "linear-gradient(135deg, hsl(0 0% 4% / 0.85), hsl(0 50% 8% / 0.85))",
          border: "1px solid hsl(0 90% 45% / 0.45)",
          boxShadow: "0 0 40px hsl(0 90% 35% / 0.35)",
        }}
      >
        <Link to="/" className="flex flex-col items-center justify-center gap-2 mb-6">
          <h1
            className="text-4xl font-black tracking-tight"
            style={{
              background:
                "linear-gradient(180deg, #ffffff 0%, #ffffff 25%, hsl(0 100% 70%) 60%, hsl(0 100% 60%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 12px hsl(0 100% 55% / 0.75))",
            }}
          >
            The Empire
          </h1>
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">
            PGVA Ventures
          </span>
        </Link>

        <h2 className="text-xl font-bold text-center text-white mb-1">
          {mode === "signup" ? "Join the Empire" : mode === "forgot" ? "Reset Password" : "Welcome Back"}
        </h2>
        <p className="text-center text-sm text-white/60 mb-6">
          {mode === "signup" ? "Create your account" : mode === "forgot" ? "We'll email you a link" : "Sign in to continue"}
        </p>

        {mode !== "forgot" && (
          <>
            <Button
              type="button"
              onClick={signInGoogle}
              variant="outline"
              className="w-full mb-4 border-red-900/70 bg-black/60 text-white hover:bg-red-950/40 hover:text-white"
            >
              <Crown className="mr-2 h-4 w-4" /> Continue with Google
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-red-950/60" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black px-2 text-white/50">or</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-white/80">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Founder Name"
                className="bg-black/60 border-red-950/70 text-white placeholder:text-white/30"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@empire.com"
              className="bg-black/60 border-red-950/70 text-white placeholder:text-white/30"
            />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/80">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/60 border-red-950/70 text-white"
              />
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold"
            style={{
              background: "linear-gradient(135deg, hsl(0 90% 40%), hsl(0 80% 25%))",
              boxShadow: "0 0 22px hsl(0 90% 40% / 0.5)",
            }}
          >
            {loading ? "..." : mode === "signup" ? "Create Account" : mode === "forgot" ? "Send Reset Link" : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm space-y-2">
          {mode === "signin" && (
            <>
              <button onClick={() => setMode("forgot")} className="text-white/50 hover:text-white block w-full">Forgot password?</button>
              <button onClick={() => setMode("signup")} className="text-red-400 hover:text-red-300 hover:underline">Don't have an account? Sign up</button>
            </>
          )}
          {mode === "signup" && (
            <button onClick={() => setMode("signin")} className="text-red-400 hover:text-red-300 hover:underline">Already have an account? Sign in</button>
          )}
          {mode === "forgot" && (
            <button onClick={() => setMode("signin")} className="text-red-400 hover:text-red-300 hover:underline">Back to sign in</button>
          )}
        </div>

        <p className="mt-6 text-[10px] text-center text-white/40">
          By continuing, you agree to our <Link to="/terms" className="underline hover:text-white/70">Terms</Link>, <Link to="/refund" className="underline hover:text-white/70">Refund Policy</Link>, and <Link to="/privacy" className="underline hover:text-white/70">Privacy</Link>.
        </p>
      </div>
    </main>
  );
}
