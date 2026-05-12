import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ImagePlus, X, Send, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type DM = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
};

type Profile = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
};

const MAX_BYTES = 5 * 1024 * 1024;

async function signedUrl(bucket: string, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export default function Messages() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const peerId = params.get("u");

  const [threads, setThreads] = useState<Record<string, DM[]>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [pickedPreview, setPickedPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) nav("/auth?redirect=/messages");
  }, [authLoading, user, nav]);

  // Load all DMs involving me, grouped by peer
  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("id,sender_id,recipient_id,content,image_url,read_at,created_at")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: true });
      if (!active) return;
      const grouped: Record<string, DM[]> = {};
      const peers = new Set<string>();
      for (const m of data ?? []) {
        const peer = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        peers.add(peer);
        (grouped[peer] ||= []).push(m as DM);
      }
      setThreads(grouped);
      await hydrateProfiles(Array.from(peers));
      await hydrateImages(data ?? []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("direct_messages_self")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_messages",
        filter: `recipient_id=eq.${user.id}`,
      }, async (payload) => {
        const m = payload.new as DM;
        setThreads((prev) => {
          const peer = m.sender_id;
          const cur = prev[peer] ?? [];
          if (cur.some((x) => x.id === m.id)) return prev;
          return { ...prev, [peer]: [...cur, m] };
        });
        await hydrateProfiles([m.sender_id]);
        await hydrateImages([m]);
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_messages",
        filter: `sender_id=eq.${user.id}`,
      }, async (payload) => {
        const m = payload.new as DM;
        setThreads((prev) => {
          const peer = m.recipient_id;
          const cur = prev[peer] ?? [];
          if (cur.some((x) => x.id === m.id)) return prev;
          return { ...prev, [peer]: [...cur, m] };
        });
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user?.id]);

  // If peer in URL but not in profiles, fetch
  useEffect(() => {
    if (peerId) hydrateProfiles([peerId]);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, threads]);

  const hydrateProfiles = async (ids: string[]) => {
    const missing = Array.from(new Set(ids)).filter((id) => id && !profiles[id]);
    if (!missing.length) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id,display_name,email,avatar_url,bio")
      .in("user_id", missing);
    if (!data) return;
    const next: Record<string, Profile> = { ...profiles };
    const newAv: Record<string, string> = {};
    for (const p of data) {
      next[p.user_id] = p as Profile;
      if (p.avatar_url) {
        const url = await signedUrl("avatars", p.avatar_url);
        if (url) newAv[p.user_id] = url;
      }
    }
    setProfiles(next);
    if (Object.keys(newAv).length) setAvatars((prev) => ({ ...prev, ...newAv }));
  };

  const hydrateImages = async (msgs: DM[]) => {
    const paths = msgs.map((m) => m.image_url).filter((p): p is string => !!p && !imageUrls[p]);
    if (!paths.length) return;
    const next: Record<string, string> = {};
    for (const p of paths) {
      const url = await signedUrl("dm-images", p);
      if (url) next[p] = url;
    }
    if (Object.keys(next).length) setImageUrls((prev) => ({ ...prev, ...next }));
  };

  const conversations = useMemo(() => {
    return Object.entries(threads)
      .map(([peer, msgs]) => ({
        peer,
        last: msgs[msgs.length - 1],
        unread: msgs.some((m) => m.recipient_id === user?.id && !m.read_at),
      }))
      .sort((a, b) => (b.last.created_at).localeCompare(a.last.created_at));
  }, [threads, user?.id]);

  const activeThread = peerId ? threads[peerId] ?? [] : [];
  const peerProfile = peerId ? profiles[peerId] : null;

  // Mark thread read on open
  useEffect(() => {
    if (!user || !peerId) return;
    const unreadIds = (threads[peerId] ?? [])
      .filter((m) => m.recipient_id === user.id && !m.read_at)
      .map((m) => m.id);
    if (!unreadIds.length) return;
    supabase.from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }, [peerId, threads, user?.id]);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) return toast({ title: "Image too large (max 5 MB)", variant: "destructive" });
    if (!f.type.startsWith("image/")) return toast({ title: "Pick an image file", variant: "destructive" });
    setPickedFile(f);
    setPickedPreview(URL.createObjectURL(f));
  };
  const clearPick = () => {
    setPickedFile(null);
    if (pickedPreview) URL.revokeObjectURL(pickedPreview);
    setPickedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const send = async () => {
    if (!user || !peerId) return;
    const text = draft.trim();
    if (!text && !pickedFile) return;
    setSending(true);
    try {
      let imagePath: string | null = null;
      if (pickedFile) {
        const ext = pickedFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("dm-images").upload(path, pickedFile, { contentType: pickedFile.type });
        if (upErr) throw upErr;
        imagePath = path;
      }
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id, recipient_id: peerId, content: text, image_url: imagePath,
      });
      if (error) {
        const msg = /Wait for them to reply/i.test(error.message)
          ? error.message
          : error.message;
        toast({ title: "Couldn't send", description: msg, variant: "destructive" });
        if (imagePath) await supabase.storage.from("dm-images").remove([imagePath]);
        return;
      }
      setDraft(""); clearPick();
    } catch (e) {
      toast({ title: "Send failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally { setSending(false); }
  };

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin opacity-70" /></div>;
  }

  // ============== Thread view ==============
  if (peerId) {
    const initial = (peerProfile?.display_name || peerProfile?.email || "?").trim().charAt(0).toUpperCase();
    const av = avatars[peerId];
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setParams({})} className="p-2 rounded-md hover:bg-accent" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-10 w-10 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center font-semibold">
              {av ? <img src={av} alt="" className="h-full w-full object-cover" /> : <span>{initial}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{peerProfile?.display_name ?? peerProfile?.email?.split("@")[0] ?? "member"}</div>
              {peerProfile?.bio && <div className="text-xs text-muted-foreground truncate">{peerProfile.bio}</div>}
            </div>
          </div>

          <div ref={scrollRef} className="rounded-2xl border border-border bg-card h-[60vh] overflow-y-auto p-3 space-y-2">
            {activeThread.length === 0 && (
              <div className="text-sm text-muted-foreground italic text-center py-8">
                Say hi — first message starts the chat. Wait for them to reply before sending another.
              </div>
            )}
            {activeThread.map((m) => {
              const mine = m.sender_id === user.id;
              const imgUrl = m.image_url ? imageUrls[m.image_url] : null;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.content && <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>}
                    {m.image_url && (
                      <div className={`${m.content ? "mt-2" : ""} rounded-lg overflow-hidden`}>
                        {imgUrl ? <img src={imgUrl} alt="" className="max-h-64 rounded-lg" /> : <div className="h-20 w-28 bg-background/30 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>}
                      </div>
                    )}
                    <div className={`text-[10px] mt-1 opacity-60 ${mine ? "text-right" : ""}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="mt-3 rounded-2xl border border-border bg-card p-3">
            {pickedPreview && (
              <div className="mb-2 relative inline-block">
                <img src={pickedPreview} alt="preview" className="max-h-32 rounded-lg border border-border" />
                <button onClick={clearPick} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-accent">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
                rows={2} maxLength={2000}
                placeholder="Type a message… (Cmd/Ctrl+Enter to send)"
                className="flex-1 resize-none rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
              <button onClick={() => fileInputRef.current?.click()} disabled={!!pickedFile}
                className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-40" aria-label="Attach image">
                <ImagePlus className="h-4 w-4" />
              </button>
              <button onClick={send} disabled={sending || (!draft.trim() && !pickedFile)}
                className="h-10 px-4 rounded-full bg-primary text-primary-foreground inline-flex items-center gap-2 disabled:opacity-40 hover:opacity-90">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="text-sm font-medium">Send</span>
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">
              One message at a time until they reply. Then unlimited. Free.
            </div>
          </section>
        </div>
      </main>
    );
  }

  // ============== Inbox view ==============
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <header className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">Private chats with other builders. Free, with photos.</p>
        </header>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin opacity-70" /></div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              No conversations yet. Visit <Link to="/community" className="underline">Community</Link> and tap a member's avatar to start one.
            </div>
          ) : (
            conversations.map(({ peer, last, unread }) => {
              const p = profiles[peer];
              const av = avatars[peer];
              const initial = (p?.display_name || p?.email || "?").trim().charAt(0).toUpperCase();
              return (
                <button key={peer} onClick={() => setParams({ u: peer })}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent transition">
                  <div className="h-10 w-10 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center font-semibold">
                    {av ? <img src={av} alt="" className="h-full w-full object-cover" /> : <span>{initial}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{p?.display_name ?? p?.email?.split("@")[0] ?? "member"}</span>
                      {unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {last.sender_id === user.id ? "You: " : ""}{last.content || (last.image_url ? "📷 photo" : "")}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(last.created_at).toLocaleDateString()}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="mt-4 text-xs text-muted-foreground text-center">
          <Link to="/community" className="underline-offset-4 hover:underline">← back to Community</Link>
        </div>
      </div>
    </main>
  );
}
