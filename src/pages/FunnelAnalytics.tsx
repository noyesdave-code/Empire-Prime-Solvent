import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Button } from "@/components/ui/button";

type FunnelEvent = {
  id: string;
  event_type:
    | "impression"
    | "click_checkout"
    | "click_blueprint"
    | "lead"
    | "blueprint_sent"
    | "email_entered"
    | "checkout_opened"
    | "checkout_paid";
  stage: string | null;
  product: string | null;
  ab_cta_variant: string | null;
  session_id: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
};

const RANGES = [
  { key: "1d", label: "24h", hours: 24 },
  { key: "7d", label: "7 days", hours: 24 * 7 },
  { key: "30d", label: "30 days", hours: 24 * 30 },
  { key: "all", label: "All", hours: 24 * 365 * 5 },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

type Bucket = {
  impression: number;
  click_checkout: number;
  click_blueprint: number;
  lead: number;
  blueprint_sent: number;
  email_entered: number;
  checkout_opened: number;
  checkout_paid: number;
};

const ZERO: Bucket = {
  impression: 0,
  click_checkout: 0,
  click_blueprint: 0,
  lead: 0,
  blueprint_sent: 0,
  email_entered: 0,
  checkout_opened: 0,
  checkout_paid: 0,
};

function pct(num: number, den: number) {
  if (!den) return "—";
  return `${((num / den) * 100).toFixed(1)}%`;
}

function bucketize(events: FunnelEvent[], keyFn: (e: FunnelEvent) => string) {
  const map = new Map<string, Bucket>();
  for (const e of events) {
    const k = keyFn(e);
    const cur = map.get(k) ?? { ...ZERO };
    cur[e.event_type] = (cur[e.event_type] ?? 0) + 1;
    map.set(k, cur);
  }
  return map;
}

export default function FunnelAnalytics() {
  useNoIndex();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [range, setRange] = useState<RangeKey>("7d");
  const [events, setEvents] = useState<FunnelEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    })();
  }, [user, loading, navigate]);

  const load = async () => {
    setBusy(true); setErr(null);
    try {
      const hrs = RANGES.find((r) => r.key === range)!.hours;
      const since = new Date(Date.now() - hrs * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("funnel_events")
        .select("id,event_type,stage,product,ab_cta_variant,session_id,created_at,metadata")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      setEvents((data ?? []) as FunnelEvent[]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line */ }, [isAdmin, range]);

  const totals = useMemo(() => {
    const t = { ...ZERO };
    for (const e of events) t[e.event_type] = (t[e.event_type] ?? 0) + 1;
    return t;
  }, [events]);

  const byVariant = useMemo(() => bucketize(events, (e) => e.ab_cta_variant ?? "—"), [events]);
  const byStage = useMemo(() => bucketize(events, (e) => e.stage ?? "—"), [events]);
  const byProduct = useMemo(
    () => bucketize(events.filter((e) => e.product), (e) => e.product as string),
    [events],
  );
  const tierOf = (e: FunnelEvent) => (e.metadata?.tier as string | undefined) ?? null;
  const utm = (e: FunnelEvent, k: string) =>
    (e.metadata?.attribution?.[k] as string | undefined) ||
    (e.metadata?.[k] as string | undefined) ||
    null;
  const byProductTier = useMemo(
    () =>
      bucketize(
        events.filter((e) => e.product && tierOf(e)),
        (e) => `${e.product} · ${tierOf(e)}`,
      ),
    [events],
  );
  const byUtmSource = useMemo(
    () => bucketize(events, (e) => utm(e, "utm_source") ?? "(direct)"),
    [events],
  );
  const byUtmMedium = useMemo(
    () => bucketize(events, (e) => utm(e, "utm_medium") ?? "(none)"),
    [events],
  );
  const byUtmCampaign = useMemo(
    () => bucketize(events, (e) => utm(e, "utm_campaign") ?? "(none)"),
    [events],
  );

  if (loading || isAdmin === null) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-fluoro">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-fluoro p-8">
        <p>Admin access required.</p>
        <Link to="/" className="underline text-fluoro-gold">Home</Link>
      </div>
    );
  }

  const variantRows = Array.from(byVariant.entries()).sort();
  const stageRows = Array.from(byStage.entries()).sort();
  const productRows = Array.from(byProduct.entries()).sort();
  const productTierRows = Array.from(byProductTier.entries()).sort();
  const utmSourceRows = Array.from(byUtmSource.entries()).sort();
  const utmMediumRows = Array.from(byUtmMedium.entries()).sort();
  const utmCampaignRows = Array.from(byUtmCampaign.entries()).sort();

  return (
    <main className="min-h-screen bg-background text-fluoro-white">
      <header className="border-b border-[hsl(var(--emerald-glow))/0.4] px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/boardroom" className="text-fluoro hover:text-fluoro-gold inline-flex items-center gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Boardroom
          </Link>
          <h1 className="text-xl md:text-2xl font-black text-mega-fluoro inline-flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Funnel A/B Analytics
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${
                range === r.key
                  ? "bg-[hsl(var(--emerald-glow))] text-background border-[hsl(var(--emerald-glow))]"
                  : "border-[hsl(var(--emerald-glow))/0.5] text-fluoro hover:text-fluoro-gold"
              }`}
            >
              {r.label}
            </button>
          ))}
          <Button size="sm" variant="outline" onClick={load} disabled={busy}>
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-8">
        {err && <div className="rounded-lg border-2 border-red-500/60 bg-red-500/10 p-3 text-sm">{err}</div>}

        {/* Totals */}
        <section>
          <h2 className="text-fluoro-gold font-black uppercase text-xs tracking-widest mb-3">Totals · {range}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {([
              ["Impr.", totals.impression, "text-fluoro"],
              ["CK clicks", totals.click_checkout, "text-fluoro-sapphire"],
              ["BP clicks", totals.click_blueprint, "text-fluoro-gold"],
              ["Email", totals.email_entered, "text-fluoro"],
              ["CK opened", totals.checkout_opened, "text-fluoro-sapphire"],
              ["Paid", totals.checkout_paid, "text-flagship-emerald"],
              ["Leads", totals.lead, "text-mega-fluoro"],
              ["BP sent", totals.blueprint_sent, "text-flagship-emerald"],
            ] as const).map(([label, val, cls]) => (
              <div key={label} className="rounded-xl border-2 border-[hsl(var(--emerald-glow))/0.5] bg-background p-3">
                <div className="text-[10px] uppercase tracking-widest text-fluoro/70">{label}</div>
                <div className={`text-2xl font-black ${cls} mt-1`}>{val}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-fluoro">
            <div className="rounded-lg border border-[hsl(var(--emerald-glow))/0.3] p-3">
              CTR → Checkout: <span className="text-fluoro-gold font-black">{pct(totals.click_checkout, totals.impression)}</span>
            </div>
            <div className="rounded-lg border border-[hsl(var(--emerald-glow))/0.3] p-3">
              Checkout → Opened: <span className="text-fluoro-gold font-black">{pct(totals.checkout_opened, totals.click_checkout)}</span>
            </div>
            <div className="rounded-lg border border-[hsl(var(--emerald-glow))/0.3] p-3">
              Opened → Paid: <span className="text-fluoro-gold font-black">{pct(totals.checkout_paid, totals.checkout_opened)}</span>
            </div>
            <div className="rounded-lg border border-[hsl(var(--emerald-glow))/0.3] p-3">
              Impr → Paid: <span className="text-fluoro-gold font-black">{pct(totals.checkout_paid, totals.impression)}</span>
            </div>
          </div>
        </section>

        {/* By Variant */}
        <section>
          <h2 className="text-fluoro-gold font-black uppercase text-xs tracking-widest mb-3">By A/B Variant</h2>
          <PerfTable rows={variantRows} label="Variant" />
        </section>

        {/* By Stage */}
        <section>
          <h2 className="text-fluoro-gold font-black uppercase text-xs tracking-widest mb-3">By Funnel Stage</h2>
          <PerfTable rows={stageRows} label="Stage" />
        </section>

        {/* By Product */}
        <section>
          <h2 className="text-fluoro-gold font-black uppercase text-xs tracking-widest mb-3">By Product</h2>
          {productRows.length === 0 ? (
            <p className="text-xs text-fluoro/60">No product-tagged events yet in this range.</p>
          ) : (
            <PerfTable rows={productRows} label="Product" />
          )}
        </section>

        {/* By Product + Tier */}
        <section>
          <h2 className="text-fluoro-gold font-black uppercase text-xs tracking-widest mb-3">By Product + Tier</h2>
          {productTierRows.length === 0 ? (
            <p className="text-xs text-fluoro/60">No tier-tagged events yet. Tier is captured at email entry, checkout open, and paid events.</p>
          ) : (
            <PerfTable rows={productTierRows} label="Product · Tier" />
          )}
        </section>

        {/* UTM */}
        <section>
          <h2 className="text-fluoro-gold font-black uppercase text-xs tracking-widest mb-3">By UTM Source</h2>
          <PerfTable rows={utmSourceRows} label="utm_source" />
        </section>
        <section>
          <h2 className="text-fluoro-gold font-black uppercase text-xs tracking-widest mb-3">By UTM Medium</h2>
          <PerfTable rows={utmMediumRows} label="utm_medium" />
        </section>
        <section>
          <h2 className="text-fluoro-gold font-black uppercase text-xs tracking-widest mb-3">By UTM Campaign</h2>
          <PerfTable rows={utmCampaignRows} label="utm_campaign" />
        </section>

        <p className="text-[10px] text-fluoro/50">
          Events: {events.length.toLocaleString()} · Source: <code>funnel_events</code>
        </p>
      </div>
    </main>
  );
}

function PerfTable({ rows, label }: { rows: [string, Bucket][]; label: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border-2 border-[hsl(var(--emerald-glow))/0.5] bg-background">
      <table className="w-full text-xs md:text-sm">
        <thead>
          <tr className="border-b-2 border-[hsl(var(--emerald-glow))/0.4]">
            <th className="text-left p-3 text-fluoro-gold font-black uppercase tracking-wider">{label}</th>
            <th className="text-right p-3 text-fluoro font-bold">Impr.</th>
            <th className="text-right p-3 text-fluoro-sapphire font-bold">CK clk</th>
            <th className="text-right p-3 text-fluoro-sapphire font-bold">CK opn</th>
            <th className="text-right p-3 text-flagship-emerald font-bold">Paid</th>
            <th className="text-right p-3 text-fluoro-gold font-bold">BP clk</th>
            <th className="text-right p-3 text-mega-fluoro font-bold">Leads</th>
            <th className="text-right p-3 text-fluoro-gold font-bold">CTR ck</th>
            <th className="text-right p-3 text-fluoro-gold font-bold">CK→Paid</th>
            <th className="text-right p-3 text-fluoro-gold font-bold">Impr→Paid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, b]) => (
            <tr key={k} className="border-b border-[hsl(var(--emerald-glow))/0.2]">
              <td className="p-3 font-bold text-fluoro-white">{k}</td>
              <td className="p-3 text-right">{b.impression}</td>
              <td className="p-3 text-right">{b.click_checkout}</td>
              <td className="p-3 text-right">{b.checkout_opened}</td>
              <td className="p-3 text-right text-flagship-emerald font-bold">{b.checkout_paid}</td>
              <td className="p-3 text-right">{b.click_blueprint}</td>
              <td className="p-3 text-right">{b.lead}</td>
              <td className="p-3 text-right text-fluoro-gold">{pct(b.click_checkout, b.impression)}</td>
              <td className="p-3 text-right text-fluoro-gold">{pct(b.checkout_paid, b.checkout_opened)}</td>
              <td className="p-3 text-right text-fluoro-gold">{pct(b.checkout_paid, b.impression)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={10} className="p-6 text-center text-fluoro/60">No data in range.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
