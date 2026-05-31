import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, RefreshCw, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { ChatMsg } from "@/hooks/useChatHistory";
import { ChatImageGallery, ChatVideoLinks, extractMarkdownMedia } from "@/components/ChatImageGallery";

type Props = {
  messages: ChatMsg[];
  onRegenerate?: () => void;
  loading?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>;
};

export function ChatMessageList({ messages, onRegenerate, loading, scrollRef }: Props) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const ref = scrollRef ?? innerRef;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [messages, ref]);

  const copy = async (m: ChatMsg) => {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId((c) => (c === m.id ? null : c)), 1400);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  if (!messages.length) return null;
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div ref={ref} tabIndex={0} className="unicorn-chat-answer space-y-3">
      {messages.map((m) => (
        <div key={m.id} className={m.role === "user" ? "opacity-80" : ""}>
          <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-widest text-fluoro-gold">
            <span>{m.role === "user" ? "You" : "Unicorn"}</span>
            {m.role === "assistant" && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copy(m)}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10"
                  aria-label="Copy"
                  title="Copy"
                >
                  {copiedId === m.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
                {m.id === lastAssistantId && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10 disabled:opacity-40"
                    aria-label="Regenerate"
                    title="Regenerate"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                  </button>
                )}
              </div>
            )}
          </div>
          {(() => {
            const { images, videos, text } = extractMarkdownMedia(m.content);
            return (
              <>
                {text.trim() && (
                  <div className="prose prose-sm prose-invert max-w-none text-sm leading-7">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                  </div>
                )}
                {images.length > 0 && <ChatImageGallery images={images} />}
                {videos.length > 0 && <ChatVideoLinks videos={videos} />}
              </>
            );
          })()}
        </div>
      ))}
    </div>
  );
}
