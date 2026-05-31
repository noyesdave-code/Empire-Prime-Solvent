// Dave-only inbox banner — surfaces Ani's daily reflection ideas at /boardroom.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, Check, Sparkles } from "lucide-react";

type Note = {
  id: string;
  kind: string;
  title: string;
  body: string;
  source: string | null;
  created_at: string;
};

export function AniDaveInbox() {
  const [notes, setNotes] = useState<Note[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("ani_dave_inbox")
      .select("id, kind, title, body, source, created_at")
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
    setNotes((data ?? []) as Note[]);
  };

  useEffect(() => { load(); }, []);

  const ack = async (id: string) => {
    await supabase.from("ani_dave_inbox").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
    setNotes((n) => n.filter((x) => x.id !== id));
  };

  if (!notes.length) return null;
  return (
    <Card className="p-4 border-primary/60 bg-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div className="font-bold">Ani has {notes.length} new note{notes.length === 1 ? "" : "s"} for you</div>
        <Inbox className="h-4 w-4 text-muted-foreground ml-auto" />
      </div>
      <div className="space-y-3">
        {notes.map((n) => (
          <div key={n.id} className="rounded border p-3 bg-background">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-sm">{n.title}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{n.source ?? n.kind} · {new Date(n.created_at).toLocaleString()}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => ack(n.id)}>
                <Check className="h-3 w-3 mr-1" /> Got it
              </Button>
            </div>
            <pre className="text-xs whitespace-pre-wrap mt-2 font-sans">{n.body}</pre>
          </div>
        ))}
      </div>
    </Card>
  );
}
