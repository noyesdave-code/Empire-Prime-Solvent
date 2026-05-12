import { useEffect, useMemo, useRef, useState } from "react";
import {
  Layout, Palette, Globe, Rocket, Eye, Send, Loader2, Copy, Check,
  Sparkles, Trash2, Lock, Download, ShieldCheck, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

// Admin-only Unicorn AI sandbox.
// - Chat + canvas persisted to `sandbox_state` (admin-only RLS).
// - Live iframe preview re-renders on each chat reply / canvas edit.
// - One-click "Lovable patch" export bundles the latest sandbox into a
//   migration brief Dave can paste into the main Lovable chat at night.
// - Wrapped in an explicit security + legal notice.

const OWNER_EMAIL = "noyes.dave@gmail.com";

type ChatTurn = { role: "user" | "assistant"; content: string };

const BLANK_CANVAS = `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  body{margin:0;font-family:ui-sans-serif,system-ui;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;height:100vh}
  .card{padding:2rem;border:1px dashed #334155;border-radius:1rem;text-align:center;max-width:520px}
  h1{margin:0 0 .5rem;color:#a5b4fc}
  code{background:#1e293b;padding:.2rem .4rem;border-radius:.3rem;color:#fbbf24}
</style></head>
<body><div class="card">
<h1>Empty replica</h1>
<p>Ask Unicorn AI to build a section. Reply with HTML inside <code>&lt;!--PREVIEW--&gt;</code> ... <code>&lt;!--/PREVIEW--&gt;</code> and it will render here live.</p>
</div></body></html>`;

// Rewrite local/relative image srcs to a working https placeholder so the
// sandboxed iframe can actually display them (it has no access to our assets).
function rewriteImageSrcs(html: string): string {
  let i = 0;
  return html.replace(/<img\b([^>]*?)\bsrc=(["'])(.*?)\2([^>]*)>/gi, (_m, pre, q, src, post) => {
    const trimmed = String(src).trim();
    const ok = /^(https?:|data:|blob:)/i.test(trimmed);
    const fixed = ok
      ? trimmed
      : `https://picsum.photos/seed/sandbox-${i++}/800/600`;
    const hasAlt = /\balt=/i.test(pre + post);
    const hasLoading = /\bloading=/i.test(pre + post);
    return `<img${pre}src=${q}${fixed}${q}${post}${hasAlt ? "" : ' alt=""'}${hasLoading ? "" : ' loading="lazy"'}>`;
  });
}

// Pull the freshest HTML block out of an assistant reply.
function extractPreviewHtml(text: string): string | null {
  const block = text.match(/<!--\s*PREVIEW\s*-->([\s\S]*?)<!--\s*\/PREVIEW\s*-->/i);
  if (block) return rewriteImageSrcs(block[1].trim());
  // Fenced ```html block fallback
  const fenced = text.match(/```html\s*([\s\S]*?)```/i);
  if (fenced) return rewriteImageSrcs(fenced[1].trim());
  // Bare <html> fallback
  const full = text.match(/<html[\s\S]*<\/html>/i);
  if (full) return rewriteImageSrcs(full[0]);
  return null;
}


export const UnicornSandbox = () => {
  const { user } = useAuth();
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;

  const [color, setColor] = useState<string>("#6366F1");
  const [canvasNote, setCanvasNote] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string>(BLANK_CANVAS);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const palette = ["#6366F1", "#EC4899", "#10B981", "#F59E0B"];

  // --- Hydrate chat + canvas from Supabase ---
  useEffect(() => {
    if (!user || !isOwner) return;
    (async () => {
      const { data, error } = await supabase
        .from("sandbox_state")
        .select("kind, content, metadata")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) { console.warn("sandbox hydrate failed:", error); setHydrated(true); return; }
      const chatRow = data?.find((r: any) => r.kind === "chat");
      const canvasRow = data?.find((r: any) => r.kind === "canvas");
      if (chatRow?.content) {
        try { setChat(JSON.parse(chatRow.content)); } catch { /* ignore */ }
      }
      if (canvasRow?.content) {
        setCanvasNote(canvasRow.content);
        const meta: any = canvasRow.metadata ?? {};
        if (meta.color) setColor(meta.color);
        if (meta.previewHtml) setPreviewHtml(meta.previewHtml);
      }
      setHydrated(true);
    })();
  }, [user, isOwner]);

  // --- Persist helpers (debounced via timeout) ---
  const persistTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated || !user || !isOwner) return;
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(async () => {
      try {
        await supabase.from("sandbox_state").upsert(
          [{ user_id: user.id, kind: "chat", content: JSON.stringify(chat) }],
          { onConflict: "user_id,kind", ignoreDuplicates: false } as any,
        );
        await supabase.from("sandbox_state").delete().eq("user_id", user.id).eq("kind", "canvas");
        await supabase.from("sandbox_state").insert({
          user_id: user.id,
          kind: "canvas",
          content: canvasNote,
          metadata: { color, previewHtml } as any,
        });
      } catch (e) { console.warn("sandbox persist failed:", e); }
    }, 600);
    return () => { if (persistTimer.current) window.clearTimeout(persistTimer.current); };
  }, [chat, canvasNote, color, previewHtml, user, isOwner, hydrated]);

  const copyText = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      toast({ title: "Copied" });
      setTimeout(() => setCopiedIdx(null), 1200);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next: ChatTurn[] = [...chat, { role: "user", content: text }];
    setChat(next);
    setInput("");
    setSending(true);
    try {
      const transcript = next.map(m => `${m.role === "user" ? "Dave" : "Unicorn"}: ${m.content}`).join("\n\n");
      const { data, error } = await supabase.functions.invoke("unicorn-ask", {
        body: {
          prompt:
            `You are Unicorn AI inside Dave's private admin sandbox (never auto-published). ` +
            `When you propose visual UI, ALWAYS include a self-contained HTML block wrapped in ` +
            `<!--PREVIEW-->...<!--/PREVIEW--> so it can render in the live iframe. Keep CSS inline. ` +
            `IMAGES: include real, visible images using <img> tags with absolute https URLs. ` +
            `Use https://picsum.photos/seed/<keyword>/<w>/<h> for photos, ` +
            `https://images.unsplash.com/photo-... when a specific aesthetic is needed, or ` +
            `inline data: URLs / SVG for icons. Always set width, height, alt, and loading="lazy". ` +
            `Never reference local /assets paths — they will not resolve in the sandbox iframe. ` +
            `When proposing app code, give complete, paste-ready snippets.\n\nCanvas note from Dave:\n${canvasNote || "(empty)"}\n\n${transcript}\n\nUnicorn:`,
          skill: "content-engine",
        },
      });
      if (error) throw error;
      const reply = (data?.response ?? "").trim() || "(no response)";
      setChat([...next, { role: "assistant", content: reply }]);
      const html = extractPreviewHtml(reply);
      if (html) setPreviewHtml(html);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    } catch (e) {
      toast({ title: "Brain unreachable", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const clear = async () => {
    if (!confirm("Clear sandbox chat + canvas? (Stored draft will be wiped.)")) return;
    setChat([]); setCanvasNote(""); setPreviewHtml(BLANK_CANVAS);
    if (user) { try { await supabase.from("sandbox_state").delete().eq("user_id", user.id); } catch { /* ignore */ } }
    toast({ title: "Sandbox cleared" });
  };

  const exportPatch = async () => {
    const stamp = new Date().toISOString();
    const patch =
`# Unicorn Sandbox → Lovable Patch
Generated: ${stamp}
Author: ${user?.email ?? "unknown"}
Source: /boardroom (Sandbox tab) — admin-only, never auto-published.

## Migration brief (paste into Lovable nightly)
"Apply the following sandbox build to the live site. Treat the PREVIEW HTML as
the visual target. Keep semantic tokens, do not introduce raw colors. Wrap any
new admin features behind the existing admin gate."

## Canvas note
${canvasNote || "(none)"}

## Active accent color
${color}

## Latest preview HTML
\`\`\`html
${previewHtml}
\`\`\`

## Chat transcript (${chat.length} turns)
${chat.map((m, i) => `### ${i + 1}. ${m.role === "user" ? "Dave" : "Unicorn"}\n${m.content}`).join("\n\n")}

## Security & legal
- Admin gate enforced (RLS: admin role + auth.uid() = user_id).
- No third-party data scraped or stored beyond Dave's own prompts/replies.
- Migration must respect Empire file protection (Rule #1) — do not overwrite
  existing assets without explicit confirmation in chat.
`;
    try {
      await navigator.clipboard.writeText(patch);
      toast({ title: "Patch copied", description: "Paste into Lovable chat tonight to migrate." });
    } catch { /* fall through to download */ }
    // also offer download
    const blob = new Blob([patch], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unicorn-sandbox-patch-${stamp.replace(/[:.]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const iframeSrcDoc = useMemo(() => previewHtml, [previewHtml]);

  // --- Hard gate: not signed in OR not the owner ---
  if (!user || !isOwner) {
    return (
      <div className="min-h-[300px] rounded-2xl border-2 border-destructive/40 bg-slate-900 text-white grid place-items-center p-8 text-center">
        <div>
          <Lock className="h-10 w-10 mx-auto mb-3 text-destructive" />
          <h3 className="text-lg font-bold mb-1">Sandbox locked</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            The Unicorn AI sandbox is restricted to the verified owner account.
            Database row-level security blocks all other sessions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[700px] bg-slate-900 text-white font-sans rounded-2xl border border-slate-700 overflow-hidden">
      {/* Security ribbon */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-emerald-950/60 border-b border-emerald-800/60 text-[11px] text-emerald-300">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} />
          <span>Admin-only · RLS-locked · sandbox never auto-publishes to lovable.app</span>
        </div>
        <span className="hidden sm:inline">Signed in as {user.email}</span>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-6 space-y-6 shrink-0">
          <div className="p-2.5 bg-indigo-600 rounded-xl"><Layout size={20} /></div>
          <div className="p-2.5 hover:bg-slate-700 rounded-xl cursor-pointer text-slate-400"><Palette size={20} /></div>
          <div className="p-2.5 hover:bg-slate-700 rounded-xl cursor-pointer text-slate-400"><Globe size={20} /></div>
        </nav>

        {/* Main */}
        <main className="flex-1 p-6">
          <header className="flex flex-wrap gap-3 justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Project: Alpha Build</h1>
              <p className="text-slate-400 text-sm">Sandbox replica · live preview re-renders on each Unicorn reply.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPreviewHtml(p => p + " ")}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-sm"
                title="Force-refresh the iframe"
              >
                <RefreshCw size={16} /> Refresh
              </button>
              <button
                onClick={() => copyText(previewHtml, -2)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-sm"
              >
                <Eye size={16} /> Copy HTML
              </button>
              <button
                onClick={exportPatch}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-bold text-sm shadow-lg shadow-amber-500/20"
                title="One-click export for nightly Lovable migration"
              >
                <Download size={16} /> Export Lovable patch
              </button>
              <button
                onClick={() => toast({ title: "Sandbox mode", description: "Use Export Lovable patch, then paste into Lovable chat at night." })}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/20"
              >
                <Rocket size={16} /> Migrate guide
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live iframe replica */}
            <div className="lg:col-span-7 bg-slate-800 rounded-2xl border border-slate-700 min-h-[480px] relative overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-700 flex items-center justify-between">
                <span>Live replica · sandboxed iframe</span>
                <span style={{ color }}>● accent</span>
              </div>
              <iframe
                title="Unicorn sandbox preview"
                sandbox="allow-scripts allow-forms allow-popups allow-modals"
                srcDoc={iframeSrcDoc}
                className="w-full h-[440px] bg-white"
              />
              <div className="p-3 border-t border-slate-700">
                <textarea
                  value={canvasNote}
                  onChange={(e) => setCanvasNote(e.target.value)}
                  placeholder="Canvas note — describe what the replica should become…"
                  rows={2}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Properties + Chat */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Quick Styles</h3>
                <div className="grid grid-cols-2 gap-2">
                  {palette.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-10 rounded-md cursor-pointer flex items-center justify-center transition ${color === c ? "ring-2 ring-white" : "hover:ring-2 hover:ring-white/60"}`}
                      style={{ backgroundColor: c }}
                    >
                      <span className="text-xs font-mono">{c}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Unicorn AI Chat */}
              <div className="bg-slate-800 rounded-2xl border-2 border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.25)] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-400" />
                    <h3 className="text-sm font-bold">Unicorn AI · Sandbox Chat</h3>
                  </div>
                  <button onClick={clear} className="text-slate-400 hover:text-white" title="Clear sandbox">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div ref={scrollRef} className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
                  {chat.length === 0 && (
                    <p className="text-xs text-slate-500 italic">
                      Ask Unicorn AI to design a section. Wrap visual output in
                      <code className="mx-1 px-1 rounded bg-slate-900 text-amber-300">&lt;!--PREVIEW--&gt;</code>
                      to render it live in the iframe.
                    </p>
                  )}
                  {chat.map((m, i) => (
                    <div key={i} className={`rounded-lg p-3 text-sm relative group ${m.role === "user" ? "bg-indigo-600/20 border border-indigo-500/30" : "bg-slate-900 border border-slate-700"}`}>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                        {m.role === "user" ? "You" : "Unicorn"}
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-slate-100 leading-relaxed">{m.content}</pre>
                      <button
                        onClick={() => copyText(m.content, i)}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition"
                        title="Copy reply"
                      >
                        {copiedIdx === i ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t border-slate-700">
                  <div className="flex gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
                      placeholder="Ask Unicorn AI… (Cmd/Ctrl+Enter to send)"
                      rows={2}
                      maxLength={4000}
                      className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                    <button
                      onClick={send}
                      disabled={sending || !input.trim()}
                      className="px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 self-stretch"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500 flex justify-between">
                    <span>{input.length}/4000 · auto-saved to your account</span>
                    <span>Sandbox · admin-only</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legal footer */}
          <p className="mt-6 text-[10px] leading-relaxed text-slate-500 border-t border-slate-800 pt-3">
            <strong className="text-slate-400">Security &amp; legal:</strong> This sandbox is admin-only and protected by
            row-level security. Generated content is your private work product. Unicorn AI is read-only on the live site
            and cannot deploy code without your explicit migration. Do not paste third-party confidential data,
            regulated PII, or licensed material you do not have rights to.
          </p>
        </main>
      </div>
    </div>
  );
};

export default UnicornSandbox;
