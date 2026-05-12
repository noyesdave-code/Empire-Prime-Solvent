import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ImagePlus, X, Send, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Msg = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

type Profile = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type IdeaPost = {
  id: string;
  for_date: string;
  title: string;
  summary: string;
  winner_user_id: string | null;
  created_at: string;
};

const PAGE_SIZE = 100;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

async function signedUrl(bucket: string, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export default function Community() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [avatars, setAvatars] = useState<Record<string, string>>({}); // user_id -> signed url
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({}); // path -> signed url
  const [draft, setDraft] = useState("");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [pickedPreview, setPickedPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [ideas, setIdeas] = useState<IdeaPost[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not signed in
  useEffect(() => {
    if (!authLoading && !user) nav("/auth?redirect=/community");
  }, [authLoading, user, nav]);

  // Load Ideas Board (Ani's daily summaries) + subscribe
  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from("idea_board_posts")
      .select("id,for_date,title,summary,winner_user_id,created_at")
      .order("for_date", { ascending: false })
      .limit(7)
      .then(({ data }) => { if (active && data) setIdeas(data as IdeaPost[]); });
    const ch = supabase
      .channel("idea_board_room")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "idea_board_posts" },
        (payload) => setIdeas((prev) => [payload.new as IdeaPost, ...prev].slice(0, 7)))
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user?.id]);

  // Load messages + profiles + subscribe
  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const { data: msgs } = await supabase
        .from("community_messages")
        .select("id,user_id,content,image_url,created_at")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (!active) return;
      const ordered = (msgs ?? []).slice().reverse();
      setMessages(ordered);
      await hydrateAuthors(ordered.map((m) => m.user_id));
      await hydrateImages(ordered);
      setLoading(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    };
    load();

    const channel = supabase
      .channel("community_messages_room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        async (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          await hydrateAuthors([m.user_id]);
          await hydrateImages([m]);
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_messages" },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const hydrateAuthors = async (userIds: string[]) => {
    const missing = Array.from(new Set(userIds)).filter((id) => !profiles[id]);
    if (!missing.length) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id,display_name,email,avatar_url,bio")
      .in("user_id", missing);
    if (!data) return;
    const next: Record<string, Profile> = { ...profiles };
    const newAvatars: Record<string, string> = {};
    for (const p of data) {
      next[p.user_id] = p as Profile;
      if (p.avatar_url) {
        const url = await signedUrl("avatars", p.avatar_url);
        if (url) newAvatars[p.user_id] = url;
      }
    }
    setProfiles(next);
    if (Object.keys(newAvatars).length) setAvatars((prev) => ({ ...prev, ...newAvatars }));
  };

  const hydrateImages = async (msgs: Msg[]) => {
    const paths = msgs.map((m) => m.image_url).filter((p): p is string => !!p && !imageUrls[p]);
    if (!paths.length) return;
    const next: Record<string, string> = {};
    for (const p of paths) {
      const url = await signedUrl("chat-images", p);
      if (url) next[p] = url;
    }
    if (Object.keys(next).length) setImageUrls((prev) => ({ ...prev, ...next }));
  };

  const myProfile = user ? profiles[user.id] : null;
  const myAvatarUrl = user ? avatars[user.id] ?? null : null;

  // Init bio editor when my profile loads
  useEffect(() => {
    if (myProfile?.bio !== undefined && myProfile?.bio !== null && bioDraft === "") {
      setBioDraft(myProfile.bio);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProfile?.user_id]);

  const saveBio = async () => {
    if (!user) return;
    setSavingBio(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, email: user.email, bio: bioDraft.slice(0, 280) }, { onConflict: "user_id" });
      if (error) throw error;
      setProfiles((prev) => ({
        ...prev,
        [user.id]: { ...(prev[user.id] ?? { user_id: user.id, display_name: null, email: user.email ?? null, avatar_url: null, bio: null }), bio: bioDraft.slice(0, 280) },
      }));
      toast({ title: "Bio saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally { setSavingBio(false); }
  };

  // Distinct authors with avatars (last seen)
  const authorsGrid = useMemo(() => {
    const seen = new Map<string, Profile>();
    for (const m of messages) {
      const p = profiles[m.user_id];
      if (p) seen.set(m.user_id, p);
    }
    return Array.from(seen.values());
  }, [messages, profiles]);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast({ title: "Image too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    if (!f.type.startsWith("image/")) {
      toast({ title: "Pick an image file", variant: "destructive" });
      return;
    }
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
    if (!user) return;
    const text = draft.trim();
    if (!text && !pickedFile) return;
    setSending(true);
    try {
      let imagePath: string | null = null;
      if (pickedFile) {
        const ext = pickedFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("chat-images")
          .upload(path, pickedFile, { contentType: pickedFile.type, upsert: false });
        if (upErr) throw upErr;
        imagePath = path;
      }
      const { error } = await supabase
        .from("community_messages")
        .insert({ user_id: user.id, content: text, image_url: imagePath });
      if (error) {
        // Trigger violation? Surface friendly message.
        const msg = /Wait for someone else/i.test(error.message)
          ? "You shared an image — wait for someone else to reply before sharing another."
          : error.message;
        toast({ title: "Couldn't post", description: msg, variant: "destructive" });
        // Roll back uploaded image
        if (imagePath) await supabase.storage.from("chat-images").remove([imagePath]);
        return;
      }
      setDraft("");
      clearPick();
    } catch (e) {
      toast({ title: "Send failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    if (f.size > MAX_BYTES) { toast({ title: "Image too large", description: "Max 5 MB.", variant: "destructive" }); return; }
    if (!f.type.startsWith("image/")) { toast({ title: "Pick an image file", variant: "destructive" }); return; }
    setAvatarUploading(true);
    try {
      const ext = f.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars").upload(path, f, { contentType: f.type, upsert: false });
      if (upErr) throw upErr;
      // Upsert profile row (in case it doesn't exist for older accounts)
      const { error: pErr } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, email: user.email, avatar_url: path }, { onConflict: "user_id" });
      if (pErr) throw pErr;
      const url = await signedUrl("avatars", path);
      if (url) setAvatars((prev) => ({ ...prev, [user.id]: url }));
      setProfiles((prev) => ({
        ...prev,
        [user.id]: { user_id: user.id, display_name: prev[user.id]?.display_name ?? null, email: user.email ?? null, avatar_url: path, bio: prev[user.id]?.bio ?? null },
      }));
      toast({ title: "Profile picture updated" });
    } catch (e) {
      toast({ title: "Avatar upload failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin opacity-70" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        <header className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Empire Community</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Builders helping builders. Share one image at a time — wait for someone to reply before sharing another.
          </p>
        </header>

        {/* Avatars grid (logged-in members can see who's here) */}
        <section className="mb-4 rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Members in the room</div>
            <div className="flex items-center gap-2">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarPick}
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-accent transition disabled:opacity-50"
              >
                {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                Set my photo
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {authorsGrid.length === 0 && (
              <div className="text-xs text-muted-foreground italic">Be the first to say hi.</div>
            )}
            {authorsGrid.map((p) => {
              const url = avatars[p.user_id];
              const initial = (p.display_name || p.email || "?").trim().charAt(0).toUpperCase();
              const isMe = p.user_id === user.id;
              return (
                <button
                  key={p.user_id}
                  onClick={() => { if (!isMe) nav(`/messages?u=${p.user_id}`); }}
                  title={isMe ? "You" : `Message ${p.display_name ?? "member"}${p.bio ? " — " + p.bio : ""}`}
                  className={`flex flex-col items-center gap-1 w-16 ${isMe ? "cursor-default" : "cursor-pointer hover:opacity-80"}`}
                >
                  <div className="h-14 w-14 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center text-lg font-semibold">
                    {url ? (
                      <img src={url} alt={p.display_name ?? "member"} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-muted-foreground">{initial}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate max-w-full">
                    {p.display_name ?? p.email?.split("@")[0] ?? "member"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bio editor */}
          <div className="mt-3 pt-3 border-t border-border">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Your bio (shown on hover & in DMs)</label>
            <div className="flex gap-2 mt-1">
              <input
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                maxLength={280}
                placeholder="e.g. Solo founder building a Shopify automation tool"
                className="flex-1 rounded-md bg-background border border-border px-2 py-1.5 text-xs"
              />
              <button onClick={saveBio} disabled={savingBio}
                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50">
                {savingBio ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </section>

        {/* Ani's Ideas Board */}
        {ideas.length > 0 && (
          <section className="mb-4 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Ani's Ideas Board · Best Build of the Day</div>
              <span className="text-[10px] text-muted-foreground">curated nightly</span>
            </div>
            <div className="space-y-3">
              {ideas.map((p) => (
                <article key={p.id} className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold">{p.title}</h3>
                    <span className="text-[10px] text-muted-foreground">{p.for_date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{p.summary}</p>
                  {p.winner_user_id && profiles[p.winner_user_id] && (
                    <div className="mt-2 text-[11px]">
                      🏆 {profiles[p.winner_user_id].display_name ?? profiles[p.winner_user_id].email?.split("@")[0] ?? "member"}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Messages */}
        <section
          ref={scrollRef}
          className="rounded-2xl border border-border bg-card h-[55vh] overflow-y-auto p-3 md:p-4 space-y-3"
        >
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin opacity-70" /></div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-muted-foreground italic text-center py-8">No messages yet — kick it off.</div>
          ) : (
            messages.map((m) => {
              const p = profiles[m.user_id];
              const av = avatars[m.user_id];
              const initial = (p?.display_name || p?.email || "?").trim().charAt(0).toUpperCase();
              const mine = m.user_id === user.id;
              const imgUrl = m.image_url ? imageUrls[m.image_url] : null;
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                  <div className="h-8 w-8 rounded-full overflow-hidden border border-border bg-muted flex-shrink-0 flex items-center justify-center text-sm font-semibold">
                    {av ? <img src={av} alt="" className="h-full w-full object-cover" /> : <span className="text-muted-foreground">{initial}</span>}
                  </div>
                  <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="text-[10px] text-muted-foreground mb-0.5">
                      {p?.display_name ?? p?.email?.split("@")[0] ?? "member"} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className={`rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      {m.content && <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>}
                      {m.image_url && (
                        <div className={`${m.content ? "mt-2" : ""} rounded-lg overflow-hidden`}>
                          {imgUrl ? (
                            <img src={imgUrl} alt="shared" className="max-h-64 w-auto rounded-lg" />
                          ) : (
                            <div className="h-24 w-32 bg-background/40 flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Composer */}
        <section className="mt-3 rounded-2xl border border-border bg-card p-3">
          {pickedPreview && (
            <div className="mb-2 relative inline-block">
              <img src={pickedPreview} alt="preview" className="max-h-32 rounded-lg border border-border" />
              <button
                onClick={clearPick}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-accent"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
              }}
              rows={2}
              maxLength={2000}
              placeholder="Share a build, ask for help, drop a tip… (Cmd/Ctrl+Enter to send)"
              className="flex-1 resize-none rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickImage}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!!pickedFile}
              className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-40"
              aria-label="Attach image"
              title="Attach image (1 per turn)"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              onClick={send}
              disabled={sending || (!draft.trim() && !pickedFile)}
              className="h-10 px-4 rounded-full bg-primary text-primary-foreground inline-flex items-center gap-2 disabled:opacity-40 hover:opacity-90 transition"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="text-sm font-medium">Send</span>
            </button>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            One image per turn — once you share a pic, hold the next one until someone else replies.
          </div>
        </section>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          <Link to="/" className="underline-offset-4 hover:underline">← back to Empire</Link>
        </div>
      </div>
    </main>
  );
}
