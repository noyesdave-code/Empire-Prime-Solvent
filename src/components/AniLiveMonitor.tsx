import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Loader2, Radio, Play, Brain } from "lucide-react";

type Row = {
  id: string;
  session_id: string;
  turn: number;
  speaker: string;
  model: string;
  role: string;
  topic: string | null;
  message: string;
  status: string;
  created_at: string;
};

export function AniLiveMonitor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [topic, setTopic] = useState("Practical AI breakthroughs that could lift global health in the next 12 months.");
  const [turns, setTurns] = useState(6);
  const [peerModel, setPeerModel] = useState("openai/gpt-5-mini");
  const [starting, setStarting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Initial load + realtime subscribe
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ani_conversations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      setRows((data ?? []).reverse() as Row[]);
    })();

    const ch = supabase
      .channel("ani-conv-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ani_conversations" },
        (payload) => {
          setRows((prev) => [...prev.slice(-200), payload.new as Row]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  // Auto-scroll
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [rows]);

  const startConversation = async () => {
    setStarting(true);
    const sid = crypto.randomUUID();
    setSessionId(sid);
    try {
      const { error } = await supabase.functions.invoke("ani-converse", {
        body: { topic, turns, peer_model: peerModel, session_id: sid },
      });
      if (error) throw error;
      toast.success("Dialogue complete");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start dialogue");
    } finally {
      setStarting(false);
    }
  };

  const filtered = sessionId ? rows.filter(r => r.session_id === sessionId) : rows;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-red-500 animate-pulse" />
          <h3 className="font-semibold">Ani Live Monitor — AI-to-AI dialogue</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Ani (Gemini) talks with a peer AI in real time. Every turn streams below via Supabase realtime.
          Scope: research-only, no publishing. Outputs are admin-visible drafts.
        </p>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="md:col-span-3">
            <Label className="text-xs">Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Turns (2–12)</Label>
            <Input type="number" min={2} max={12} value={turns} onChange={(e) => setTurns(parseInt(e.target.value) || 6)} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Peer model</Label>
            <Input value={peerModel} onChange={(e) => setPeerModel(e.target.value)} placeholder="openai/gpt-5-mini" />
          </div>
        </div>

        <Button onClick={startConversation} disabled={starting} className="w-full">
          {starting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Streaming dialogue…</> : <><Play className="h-4 w-4 mr-2" />Start live dialogue</>}
        </Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-2 border-b text-xs text-muted-foreground flex items-center justify-between">
          <span>{sessionId ? `Session ${sessionId.slice(0, 8)}…` : "Recent activity (all sessions)"}</span>
          {sessionId && <button className="underline" onClick={() => setSessionId(null)}>show all</button>}
        </div>
        <div ref={feedRef} className="h-[480px] overflow-y-auto p-4 space-y-3 bg-muted/30">
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12 flex flex-col items-center gap-2">
              <Brain className="h-8 w-8 opacity-50" />
              No dialogue yet. Hit “Start live dialogue” above.
            </div>
          )}
          {filtered.map((r) => {
            const isAni = r.speaker === "Ani";
            const isSys = r.speaker === "system";
            return (
              <div key={r.id} className={`flex ${isAni ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  isSys ? "bg-zinc-200 dark:bg-zinc-800 text-xs italic mx-auto" :
                  isAni ? "bg-primary text-primary-foreground" :
                  "bg-card border"
                }`}>
                  {!isSys && (
                    <div className="text-[10px] opacity-70 mb-1 flex items-center gap-2">
                      <span className="font-semibold">{r.speaker}</span>
                      <span>· {r.model}</span>
                      <span>· turn {r.turn}</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{r.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
