import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Save, Edit3, Eye, ExternalLink } from "lucide-react";

type Page = {
  id: string; slug: string; title: string; description: string | null;
  content_md: string; source_url: string | null; category: string | null;
};

export default function EmpirePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", content_md: "" });
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const ok = !!roles?.some(r => r.role === "admin");
      setAllowed(ok);
      if (!ok) return;
      const { data, error } = await supabase
        .from("boardroom_pages").select("*").eq("slug", slug).maybeSingle();
      if (error) { toast.error("Couldn't load page"); return; }
      if (!data) { toast.error("Page not found"); navigate("/boardroom"); return; }
      setPage(data as Page);
      setDraft({ title: data.title, description: data.description ?? "", content_md: data.content_md });
    })();
  }, [user, loading, slug, navigate]);

  const save = async () => {
    if (!page) return;
    setSaving(true);
    const { error } = await supabase
      .from("boardroom_pages")
      .update({ title: draft.title, description: draft.description, content_md: draft.content_md })
      .eq("id", page.id);
    setSaving(false);
    if (error) { toast.error("Save failed"); return; }
    setPage({ ...page, ...draft });
    setEditing(false);
    toast.success("Saved");
  };

  if (loading || allowed === null) return <main className="min-h-screen grid place-items-center bg-background text-foreground">Loading…</main>;
  if (!allowed) return <main className="min-h-screen grid place-items-center bg-background text-foreground p-6"><Card className="p-6">Admin only.</Card></main>;
  if (!page) return null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between glass-strong sticky top-0 z-40">
        <div className="flex items-center gap-2 min-w-0">
          <Button asChild variant="ghost" size="sm"><Link to="/boardroom"><ArrowLeft className="h-4 w-4 mr-1" />Boardroom</Link></Button>
          <div className="text-sm font-semibold truncate">{page.title}</div>
        </div>
        <div className="flex items-center gap-2">
          {page.source_url && (
            <Button asChild variant="outline" size="sm"><a href={page.source_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Source</a></Button>
          )}
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft({ title: page.title, description: page.description ?? "", content_md: page.content_md }); }}><Eye className="h-4 w-4 mr-1" />Preview</Button>
              <Button size="sm" onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save"}</Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setEditing(true)}><Edit3 className="h-4 w-4 mr-1" />Edit</Button>
          )}
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {editing ? (
          <Card className="p-4 space-y-3">
            <Input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
            <Input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Description" />
            <Textarea
              value={draft.content_md}
              onChange={e => setDraft({ ...draft, content_md: e.target.value })}
              rows={28}
              className="font-mono text-xs"
              placeholder="Markdown content…"
            />
            <p className="text-xs text-muted-foreground">Markdown supported (GFM tables, lists, links).</p>
          </Card>
        ) : (
          <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary prose-li:text-foreground/90 prose-table:text-foreground/90">
            {page.description && <p className="text-sm text-muted-foreground italic mb-4">{page.description}</p>}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.content_md}</ReactMarkdown>
          </article>
        )}
      </section>
    </main>
  );
}
