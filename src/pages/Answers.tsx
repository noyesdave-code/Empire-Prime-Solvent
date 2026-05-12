import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AnswerRow {
  slug: string;
  ai_title: string | null;
  ai_summary: string | null;
  question: string;
  created_at: string;
  tags: string[];
}

export default function Answers() {
  const [rows, setRows] = useState<AnswerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Unicorn AI Answers — Real questions, real answers";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Browse real questions asked to Unicorn AI Builder — startup advice, AI tools, business strategy, all answered free.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description"; m.content = desc;
      document.head.appendChild(m);
    }
    (async () => {
      const { data } = await supabase
        .from("public_answers")
        .select("slug, ai_title, ai_summary, question, created_at, tags")
        .eq("indexed", true)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Unicorn AI Answers</h1>
        <p className="mt-2 text-muted-foreground">Real questions founders ask Unicorn — answered free, archived for the next builder.</p>
        <p className="mt-1 text-sm">
          <Link to="/" className="underline underline-offset-4">Ask your own →</Link>
        </p>
      </header>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">No answers archived yet — be the first to <Link to="/" className="underline">ask Unicorn</Link>.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.slug} className="rounded-lg border border-border/60 bg-card p-4 hover:border-primary/40 transition">
              <Link to={`/answers/${r.slug}`} className="block">
                <h2 className="text-lg font-bold leading-snug">{r.ai_title || r.question.slice(0, 80)}</h2>
                {r.ai_summary && <p className="mt-1 text-sm text-muted-foreground">{r.ai_summary}</p>}
                {r.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.tags.map((t) => (
                      <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{t}</span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
