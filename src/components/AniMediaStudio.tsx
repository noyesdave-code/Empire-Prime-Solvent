import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { Image as ImgIcon, Wand2, Download, Loader2, Link2, Film, Megaphone, Trash2 } from "lucide-react";

type Media = {
  id: string;
  kind: string;
  title: string | null;
  prompt: string | null;
  source_url: string | null;
  public_url: string | null;
  mime_type: string | null;
  generated: boolean;
  metadata: any;
  created_at: string;
};

const PLATFORMS = ["instagram", "x", "linkedin"] as const;

export function AniMediaStudio() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Forms
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgKind, setImgKind] = useState<"image" | "blueprint">("image");
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingestKind, setIngestKind] = useState<"image" | "video">("image");
  const [socialTopic, setSocialTopic] = useState("");
  const [socialPlat, setSocialPlat] = useState<typeof PLATFORMS[number]>("instagram");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ani_media")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      setItems((data ?? []) as Media[]);
      setLoading(false);
    })();

    const ch = supabase
      .channel("ani-media-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ani_media" }, (p) => {
        setItems((prev) => [p.new as Media, ...prev].slice(0, 80));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "ani_media" }, (p) => {
        setItems((prev) => prev.filter((m) => m.id !== (p.old as any).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const call = async (action: string, body: any, label: string) => {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("ani-media", { body: { action, ...body } });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error);
      toast.success(`${label} ready`);
      return data;
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const deleteItem = async (m: Media) => {
    if (!confirm("Delete this media?")) return;
    await supabase.from("ani_media").delete().eq("id", m.id);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Ani Media Studio</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Generate images & blueprints, ingest images/videos from URLs into Ani's library, and produce on-brand social posts. Everything stored privately in the <code>ani-media</code> bucket.
        </p>

        <Tabs defaultValue="generate">
          <TabsList className="w-full">
            <TabsTrigger value="generate" className="flex-1"><ImgIcon className="h-3 w-3 mr-1" />Generate</TabsTrigger>
            <TabsTrigger value="ingest" className="flex-1"><Link2 className="h-3 w-3 mr-1" />Ingest</TabsTrigger>
            <TabsTrigger value="social" className="flex-1"><Megaphone className="h-3 w-3 mr-1" />Social</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant={imgKind === "image" ? "default" : "outline"} onClick={() => setImgKind("image")}>Image</Button>
              <Button size="sm" variant={imgKind === "blueprint" ? "default" : "outline"} onClick={() => setImgKind("blueprint")}>Blueprint</Button>
            </div>
            <Label className="text-xs">Prompt</Label>
            <Textarea value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)} rows={3}
              placeholder={imgKind === "blueprint" ? "Technical blueprint: top-down schematic of a solar-harvesting drone swarm..." : "Editorial photo of..."} />
            <Button disabled={!imgPrompt || busy === "generate_image"} className="w-full"
              onClick={() => call("generate_image", { prompt: imgPrompt, kind: imgKind, title: imgPrompt.slice(0, 60) }, "Image")}>
              {busy === "generate_image" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Generate {imgKind}
            </Button>
          </TabsContent>

          <TabsContent value="ingest" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant={ingestKind === "image" ? "default" : "outline"} onClick={() => setIngestKind("image")}>Image</Button>
              <Button size="sm" variant={ingestKind === "video" ? "default" : "outline"} onClick={() => setIngestKind("video")}>Video</Button>
            </div>
            <Label className="text-xs">URL</Label>
            <Input value={ingestUrl} onChange={(e) => setIngestUrl(e.target.value)} placeholder="https://..." />
            <Button disabled={!ingestUrl || busy === "ingest_url"} className="w-full"
              onClick={() => call("ingest_url", { url: ingestUrl, kind: ingestKind }, "Ingested").then(() => setIngestUrl(""))}>
              {busy === "ingest_url" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Ingest from URL
            </Button>
            <p className="text-[10px] text-muted-foreground">Max 50 MB. Stored in private bucket with 7-day signed URL.</p>
          </TabsContent>

          <TabsContent value="social" className="mt-4 space-y-3">
            <div className="flex gap-2">
              {PLATFORMS.map(p => (
                <Button key={p} size="sm" variant={socialPlat === p ? "default" : "outline"} onClick={() => setSocialPlat(p)}>{p}</Button>
              ))}
            </div>
            <Label className="text-xs">Topic / hook</Label>
            <Textarea value={socialTopic} onChange={(e) => setSocialTopic(e.target.value)} rows={2}
              placeholder="Launching the Empire's AI-to-AI dialogue monitor" />
            <Button disabled={!socialTopic || busy === "social_post"} className="w-full"
              onClick={() => call("social_post", { topic: socialTopic, platform: socialPlat }, "Social post")}>
              {busy === "social_post" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
              Create post for {socialPlat}
            </Button>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Library ({items.length})</h3>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nothing yet. Generate or ingest above.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.map(m => (
              <div key={m.id} className="border rounded-md overflow-hidden bg-muted/30 group relative">
                <div className="aspect-square bg-black flex items-center justify-center overflow-hidden">
                  {m.kind === "video" && m.public_url ? (
                    <video src={m.public_url} controls className="w-full h-full object-cover" />
                  ) : m.public_url ? (
                    <img src={m.public_url} alt={m.title ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <Film className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-2 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase opacity-60">{m.kind}{m.generated ? " · AI" : ""}</span>
                    <button onClick={() => deleteItem(m)} className="opacity-0 group-hover:opacity-100 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="truncate" title={m.title ?? ""}>{m.title}</div>
                  {m.metadata?.caption && (
                    <div className="text-[10px] text-muted-foreground line-clamp-2">{m.metadata.caption}</div>
                  )}
                  {m.public_url && (
                    <a href={m.public_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline">open</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
