import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Play, Plus, Check, RefreshCw } from "lucide-react";

type Row = {
  id: string; sku: string; name: string; description: string | null;
  ai_estimated_cost_cents: number | null; verified_cost_cents: number | null;
  supplier: string | null; supplier_url: string | null; printful_variant_id: string | null;
  is_pod: boolean; suggested_price_cents: number | null; margin_pct: number | null;
  status: string;
};

const fmt = (c: number | null) => c == null ? "—" : `$${(c/100).toFixed(2)}`;

export default function BoardroomSourcing() {
  useNoIndex();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const ok = !!roles?.some(r => r.role === "admin");
      setIsAdmin(ok);
      if (!ok) { navigate("/"); return; }
      await refresh();
    })();
  }, [user, loading, navigate]);

  async function refresh() {
    const { data } = await supabase.from("product_sourcing").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  }

  async function addProduct() {
    if (!newSku || !newName) return toast.error("SKU + name required");
    const { error } = await supabase.from("product_sourcing").insert({ sku: newSku, name: newName, description: newDesc, status: "pending" });
    if (error) return toast.error(error.message);
    setNewSku(""); setNewName(""); setNewDesc("");
    toast.success("Queued — run sourcing swarm to estimate");
    await refresh();
  }

  async function runSwarm() {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("swarm-sourcing", { body: {} });
      if (error) throw error;
      toast.success("Sourcing swarm finished");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setRunning(false); }
  }

  async function approve(id: string) {
    await supabase.from("product_sourcing").update({ status: "approved" }).eq("id", id);
    toast.success("Approved");
    await refresh();
  }

  async function setVariant(id: string, v: string) {
    await supabase.from("product_sourcing").update({ printful_variant_id: v || null, is_pod: !!v }).eq("id", id);
    await refresh();
  }

  async function refreshRow(id: string) {
    await supabase.from("product_sourcing").update({ status: "needs_refresh" }).eq("id", id);
    toast.success("Marked for re-estimate");
    await refresh();
  }

  if (loading || isAdmin === null) return <div className="min-h-screen bg-background grid place-items-center text-fluoro">Loading…</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/boardroom" className="inline-flex items-center gap-2 text-sm text-fluoro-gold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Boardroom
          </Link>
          <h1 className="text-2xl font-black text-flagship-emerald">Sourcing & Pricing</h1>
        </div>

        <Card className="p-4 mb-6 bg-card border-2 border-primary/40">
          <p className="text-xs uppercase text-fluoro-gold mb-2">Margin policy</p>
          <p className="text-sm text-fluoro/90">20% under $25 · 15% $25–$100 · 10% $100–$500 · 5% over $500 (min $5 profit)</p>
        </Card>

        <Card className="p-4 mb-6 bg-card">
          <p className="text-sm font-bold text-flagship-emerald mb-2">Add product to source</p>
          <div className="grid gap-2 md:grid-cols-4">
            <Input placeholder="SKU" value={newSku} onChange={e => setNewSku(e.target.value)} />
            <Input placeholder="Product name" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input className="md:col-span-2" placeholder="Short description (helps AI estimate)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={addProduct}><Plus className="h-3 w-3 mr-1" />Queue</Button>
            <Button size="sm" variant="secondary" disabled={running} onClick={runSwarm}>
              <Play className="h-3 w-3 mr-1" />{running ? "Running…" : "Run sourcing swarm"}
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          {rows.map(r => (
            <Card key={r.id} className="p-4 bg-card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold text-flagship-emerald">{r.name} <span className="text-fluoro/60 text-xs font-normal">· {r.sku}</span></p>
                  {r.description && <p className="text-xs text-fluoro/70 mt-1 line-clamp-2">{r.description}</p>}
                  <p className="text-[10px] mt-2">
                    <span className="text-fluoro-gold uppercase">Status:</span> <span className={r.status === "approved" ? "text-flagship-emerald" : "text-fluoro"}>{r.status}</span>
                    {r.supplier && <> · <span className="text-fluoro-gold uppercase">Supplier:</span> {r.supplier}</>}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p>AI est: <b className="text-fluoro">{fmt(r.ai_estimated_cost_cents)}</b></p>
                  <p>Verified: <b className="text-fluoro">{fmt(r.verified_cost_cents)}</b></p>
                  <p className="text-flagship-emerald">Suggested: <b>{fmt(r.suggested_price_cents)}</b> {r.margin_pct ? `(${r.margin_pct}%)` : ""}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <Input placeholder="Printful variant ID (enables auto-ship)" defaultValue={r.printful_variant_id ?? ""}
                  onBlur={e => { if (e.target.value !== (r.printful_variant_id ?? "")) setVariant(r.id, e.target.value); }} />
                <Button size="sm" variant="secondary" onClick={() => refreshRow(r.id)}><RefreshCw className="h-3 w-3 mr-1" />Re-estimate</Button>
                <Button size="sm" disabled={r.status === "approved" || !r.suggested_price_cents} onClick={() => approve(r.id)}>
                  <Check className="h-3 w-3 mr-1" />Approve price
                </Button>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <p className="text-fluoro/60 text-sm">No products yet — queue one above.</p>}
        </div>
      </div>
    </div>
  );
}
