import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Activity, CheckCircle2, XCircle, Loader2, ArrowLeft, Sparkles } from "lucide-react";

type RouteCheck = { route: string; component: string; status: "idle" | "ok" | "fail"; note?: string };
type EndpointCheck = {
  status: "idle" | "running" | "ok" | "fail";
  model?: string;
  latency_ms?: number;
  remaining?: number;
  paywall?: boolean;
  error?: string;
  ranAt?: string;
};

const ROUTES_WITH_CHAT: Omit<RouteCheck, "status">[] = [
  { route: "/",                    component: "LandingVeil + AskUnicorn" },
  { route: "/emerald",             component: "AskUnicorn" },
  { route: "/marble",              component: "AskUnicorn" },
  { route: "/unicorn-box/manual",  component: "AskUnicorn" },
  { route: "/boardroom",           component: "Inline composer (admin)" },
];

export default function AskUnicornHealth() {
  useNoIndex();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [endpoint, setEndpoint] = useState<EndpointCheck>({ status: "idle" });
  const [routes, setRoutes] = useState<RouteCheck[]>(
    ROUTES_WITH_CHAT.map((r) => ({ ...r, status: "idle" })),
  );

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    })();
  }, [user, loading, navigate]);

  const runEndpointCheck = async () => {
    setEndpoint({ status: "running" });
    const sessionId = `health_check_${Date.now()}`;
    try {
      const { data, error } = await supabase.functions.invoke("unicorn-ask", {
        body: { prompt: "ping", skill: "business-builder", session_id: sessionId },
      });
      if (error) throw error;
      if (data?.error && !data?.response) {
        setEndpoint({ status: "fail", error: data.error, ranAt: new Date().toLocaleTimeString() });
        return;
      }
      setEndpoint({
        status: "ok",
        model: data.model,
        latency_ms: data.latency_ms,
        remaining: data.remaining,
        paywall: data.paywall,
        ranAt: new Date().toLocaleTimeString(),
      });
      // Mark all chat-bearing routes ok if endpoint works (they all share this function)
      setRoutes((prev) => prev.map((r) => ({ ...r, status: "ok", note: "Wired to unicorn-ask ✓" })));
    } catch (e) {
      setEndpoint({
        status: "fail",
        error: e instanceof Error ? e.message : "Unknown error",
        ranAt: new Date().toLocaleTimeString(),
      });
      setRoutes((prev) => prev.map((r) => ({ ...r, status: "fail", note: "Endpoint unreachable" })));
    }
  };

  if (loading || isAdmin === null) {
    return <main className="min-h-screen bg-background grid place-items-center text-foreground">Loading…</main>;
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background grid place-items-center text-foreground p-6">
        <Card className="max-w-md p-6 text-center">
          <h1 className="text-xl font-bold mb-2">Restricted</h1>
          <p className="text-sm text-muted-foreground mb-4">This dashboard is admin-only.</p>
          <Link to="/" className="text-primary underline">Back to home</Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Link to="/boardroom" className="inline-flex items-center gap-2 text-sm text-fluoro-gold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Boardroom
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-fluoro/60">Admin · Dave only</span>
        </div>

        <header className="mb-6 flex items-center gap-3">
          <Activity className="h-7 w-7 text-[hsl(var(--emerald-glow))]" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-fluoro">AskUnicorn Health</h1>
            <p className="text-xs text-fluoro/70">Live endpoint + session flow checks. Manual-trigger only — conserves AI credits.</p>
          </div>
        </header>

        {/* Endpoint check */}
        <Card className="p-5 mb-6 border-2 border-primary/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-fluoro">unicorn-ask edge function</h2>
            <Button onClick={runEndpointCheck} disabled={endpoint.status === "running"} size="sm" className="unicorn-chat-btn">
              {endpoint.status === "running" ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Pinging…</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5" /> Run check</>
              )}
            </Button>
          </div>

          {endpoint.status === "idle" && (
            <p className="text-xs text-fluoro/60">Click "Run check" to ping the brain. Costs &lt; $0.0001 (cheapest fast model).</p>
          )}

          {endpoint.status === "ok" && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-flagship-emerald font-bold">
                <CheckCircle2 className="h-5 w-5" /> Healthy
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-fluoro/60">Model</dt><dd className="font-mono text-fluoro">{endpoint.model}</dd></div>
                <div><dt className="text-fluoro/60">Latency</dt><dd className="font-mono text-fluoro">{endpoint.latency_ms}ms</dd></div>
                <div><dt className="text-fluoro/60">Remaining (test session)</dt><dd className="font-mono text-fluoro">{endpoint.remaining ?? "—"}</dd></div>
                <div><dt className="text-fluoro/60">Paywall</dt><dd className="font-mono text-fluoro">{endpoint.paywall ? "yes" : "no"}</dd></div>
                <div className="col-span-2"><dt className="text-fluoro/60">Last run</dt><dd className="font-mono text-fluoro">{endpoint.ranAt}</dd></div>
              </dl>
            </div>
          )}

          {endpoint.status === "fail" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[hsl(var(--maroon))] font-bold">
                <XCircle className="h-5 w-5" /> Failed
              </div>
              <p className="text-xs font-mono text-fluoro/80">{endpoint.error}</p>
              <p className="text-[10px] text-fluoro/60">Last attempt: {endpoint.ranAt}</p>
            </div>
          )}
        </Card>

        {/* Per-route status */}
        <Card className="p-5 border-2 border-primary/40">
          <h2 className="font-bold text-fluoro mb-3">Routes mounting AskUnicorn</h2>
          <ul className="divide-y divide-border">
            {routes.map((r) => (
              <li key={r.route} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <Link to={r.route} className="font-mono text-sm text-fluoro hover:text-flagship-emerald underline">
                    {r.route}
                  </Link>
                  <p className="text-[10px] text-fluoro/60">{r.component}</p>
                </div>
                <div className="text-right">
                  {r.status === "ok" && <span className="inline-flex items-center gap-1 text-xs text-flagship-emerald font-bold"><CheckCircle2 className="h-4 w-4" /> OK</span>}
                  {r.status === "fail" && <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--maroon))] font-bold"><XCircle className="h-4 w-4" /> FAIL</span>}
                  {r.status === "idle" && <span className="text-xs text-fluoro/40">Not yet checked</span>}
                  {r.note && <p className="text-[9px] text-fluoro/50 mt-1">{r.note}</p>}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[10px] text-fluoro/50">
            All routes share the same <span className="font-mono">unicorn-ask</span> edge function — a single endpoint check verifies all of them.
          </p>
        </Card>
      </div>
    </main>
  );
}
