import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  slug: string;
  ai_title: string | null;
  question: string;
  indexed: boolean;
  created_at: string;
  view_count: number;
}

export default function BoardroomAnswers() {
  useNoIndex();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("public_answers")
      .select("id, slug, ai_title, question, indexed, created_at, view_count")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleIndexed = async (id: string, next: boolean) => {
    const { error } = await supabase.from("public_answers").update({ indexed: next }).eq("id", id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, indexed: next } : r));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this answer permanently?")) return;
    const { error } = await supabase.from("public_answers").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  const runArchive = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("swarm-archive-answers", { body: {} });
      if (error) throw error;
      toast({ title: "Archive run complete", description: JSON.stringify(data?.stats ?? data) });
      await load();
    } catch (e) {
      toast({ title: "Run failed", description: e instanceof Error ? e.message : "error", variant: "destructive" });
    } finally { setRunning(false); }
  };

  if (!user) return <main className="p-8">Sign in required.</main>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Public Answer Archive</h1>
          <p className="text-sm text-muted-foreground">Toggle which Q&A get indexed at <Link to="/answers" className="underline">/answers</Link>.</p>
        </div>
        <Button onClick={runArchive} disabled={running}>{running ? "Running…" : "Run archive now"}</Button>
      </div>
      {loading ? <p>Loading…</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 rounded border border-border/50 bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.ai_title || r.question.slice(0, 80)}</p>
                <p className="truncate text-xs text-muted-foreground">{r.question}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  /answers/{r.slug} · {new Date(r.created_at).toLocaleDateString()} · {r.view_count} views
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={r.indexed} onChange={(e) => toggleIndexed(r.id, e.target.checked)} />
                  Indexed
                </label>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/answers/${r.slug}`} target="_blank">View</Link>
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>Delete</Button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-muted-foreground">No archived answers yet. Click "Run archive now".</p>}
        </div>
      )}
    </main>
  );
}
