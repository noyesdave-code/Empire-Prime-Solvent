import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export default function EmpireAsset() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [meta, setMeta] = useState<{ title: string; description: string | null; mime_type: string | null } | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const ok = !!roles?.some(r => r.role === "admin");
      setAllowed(ok);
      if (!ok) return;
      const { data: a, error } = await supabase
        .from("boardroom_assets").select("*").eq("slug", slug).maybeSingle();
      if (error || !a) { toast.error("Asset not found"); navigate("/boardroom"); return; }
      setMeta({ title: a.title, description: a.description, mime_type: a.mime_type });
      const { data: signed } = await supabase.storage.from(a.bucket).createSignedUrl(a.path, 60 * 60);
      if (!signed?.signedUrl) { toast.error("Couldn't load file"); return; }
      setSignedUrl(signed.signedUrl);
    })();
  }, [user, loading, slug, navigate]);

  if (loading || allowed === null) return <main className="min-h-screen grid place-items-center bg-background text-foreground">Loading…</main>;
  if (!allowed) return <main className="min-h-screen grid place-items-center bg-background text-foreground p-6"><Card className="p-6">Admin only.</Card></main>;
  if (!meta) return null;

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between glass-strong sticky top-0 z-40">
        <div className="flex items-center gap-2 min-w-0">
          <Button asChild variant="ghost" size="sm"><Link to="/boardroom"><ArrowLeft className="h-4 w-4 mr-1" />Boardroom</Link></Button>
          <div className="text-sm font-semibold truncate">{meta.title}</div>
        </div>
        {signedUrl && (
          <Button asChild size="sm"><a href={signedUrl} download><Download className="h-4 w-4 mr-1" />Download</a></Button>
        )}
      </header>
      <section className="flex-1 p-2 sm:p-4">
        {signedUrl ? (
          <iframe src={signedUrl} title={meta.title} className="w-full h-[calc(100vh-80px)] rounded-md border border-border bg-muted" />
        ) : (
          <p className="text-sm text-muted-foreground p-6">Loading file…</p>
        )}
      </section>
    </main>
  );
}
