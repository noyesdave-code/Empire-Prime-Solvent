import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";

interface Answer {
  slug: string;
  question: string;
  answer: string;
  ai_title: string | null;
  ai_summary: string | null;
  tags: string[];
  created_at: string;
}

export default function AnswerDetail() {
  const { slug } = useParams();
  const [row, setRow] = useState<Answer | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("public_answers")
        .select("slug, question, answer, ai_title, ai_summary, tags, created_at")
        .eq("slug", slug)
        .eq("indexed", true)
        .maybeSingle();
      if (!data) { setNotFound(true); return; }
      setRow(data);
      const title = `${data.ai_title || data.question.slice(0, 60)} — Unicorn AI`;
      document.title = title;
      const desc = data.ai_summary || data.answer.slice(0, 155);
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
      m.setAttribute("content", desc);

      // Canonical
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.appendChild(canonical); }
      canonical.setAttribute("href", `${window.location.origin}/answers/${data.slug}`);

      // FAQPage JSON-LD
      const ld = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [{
          "@type": "Question",
          name: data.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: data.answer.slice(0, 5000),
          },
        }],
      };
      const existing = document.getElementById("answer-jsonld");
      if (existing) existing.remove();
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "answer-jsonld";
      script.text = JSON.stringify(ld);
      document.head.appendChild(script);
    })();
    return () => {
      document.getElementById("answer-jsonld")?.remove();
    };
  }, [slug]);

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold">Answer not found</h1>
        <p className="mt-2 text-muted-foreground"><Link to="/answers" className="underline">Back to all answers</Link></p>
      </main>
    );
  }
  if (!row) return <main className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Link to="/answers" className="hover:underline">← All Answers</Link>
      </p>
      <h1 className="text-3xl font-black leading-tight">{row.ai_title || row.question}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Answered by Unicorn AI · {new Date(row.created_at).toLocaleDateString()}
      </p>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Question</h2>
        <p className="mt-1 text-base">{row.question}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Answer</h2>
        <div className="prose prose-sm dark:prose-invert mt-2 max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.answer}</ReactMarkdown>
        </div>
      </section>

      {row.tags?.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {row.tags.map((t) => <span key={t} className="rounded bg-muted px-2 py-0.5 text-xs">{t}</span>)}
        </div>
      )}

      <div className="mt-10 rounded-lg border border-primary/30 bg-primary/5 p-5 text-center">
        <p className="text-sm font-semibold">Got your own question?</p>
        <Link to="/" className="mt-2 inline-block rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:brightness-110">
          Ask Unicorn AI free →
        </Link>
      </div>
    </main>
  );
}
