import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Trash2, Plus, RefreshCw } from "lucide-react";
import { invalidateBrandCache } from "@/hooks/useBrands";

type Row = { id: string; key: string; name: string; mark: string; category: string; notes: string | null; sort_order: number };

const CATS = ["corporation", "flagship", "product", "developing"];
const MARKS = ["™", "©", "®"];

export function BrandRegistryAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ key: "", name: "", mark: "™", category: "product", notes: "", sort_order: 100 });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("brand_registry").select("*").order("sort_order");
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.key || !form.name) return toast.error("key + name required");
    const { error } = await supabase.from("brand_registry").insert(form);
    if (error) return toast.error(error.message);
    invalidateBrandCache();
    setForm({ key: "", name: "", mark: "™", category: "product", notes: "", sort_order: 100 });
    toast.success(`${form.name}${form.mark} added`);
    load();
  };

  const del = async (id: string, label: string) => {
    if (!confirm(`Remove ${label}?`)) return;
    const { error } = await supabase.from("brand_registry").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidateBrandCache();
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Brand Registry (admin)</h2>
          <p className="text-xs text-muted-foreground">Add a brand once — its ™/© appears everywhere automatically.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { invalidateBrandCache(); load(); }}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="p-3 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <div><Label className="text-[10px]">Key</Label><Input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="ubox" /></div>
          <div className="col-span-2"><Label className="text-[10px]">Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Unicorn Box" /></div>
          <div>
            <Label className="text-[10px]">Mark</Label>
            <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={form.mark} onChange={e => setForm({ ...form, mark: e.target.value })}>
              {MARKS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px]">Category</Label>
            <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><Label className="text-[10px]">Sort</Label><Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1"><Label className="text-[10px]">Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <Button size="sm" onClick={add}><Plus className="h-3 w-3 mr-1" />Add</Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="max-h-[300px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1">Display</th>
                <th className="text-left px-2 py-1">Key</th>
                <th className="text-left px-2 py-1">Category</th>
                <th className="text-left px-2 py-1">Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-2 py-3 text-muted-foreground">Loading…</td></tr>}
              {!loading && rows.map(r => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="px-2 py-1 font-semibold">{r.name}{r.mark}</td>
                  <td className="px-2 py-1 font-mono text-[10px]">{r.key}</td>
                  <td className="px-2 py-1">{r.category}</td>
                  <td className="px-2 py-1 text-muted-foreground">{r.notes}</td>
                  <td className="px-2 py-1 text-right">
                    <Button size="icon" variant="ghost" onClick={() => del(r.id, `${r.name}${r.mark}`)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
