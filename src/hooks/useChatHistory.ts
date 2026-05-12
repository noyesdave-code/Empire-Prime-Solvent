import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  meta?: { model?: string; latency_ms?: number; router_reason?: string };
};

const CHECKPOINT_EVERY = 4; // every 4 messages we snapshot
const MAX_CHECKPOINTS = 3;

function uid() {
  return crypto?.randomUUID?.() ?? `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function useChatHistory(scope: string) {
  const HISTORY_KEY = `unicorn_chat_history_${scope}_v1`;
  const CHECKPOINT_KEY = `unicorn_checkpoint_${scope}_v1`;

  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? (JSON.parse(raw) as ChatMsg[]) : [];
    } catch {
      return [];
    }
  });
  const [hasCheckpoint, setHasCheckpoint] = useState(false);
  const renderCount = useRef(0);

  // Persist on every change + auto-checkpoint every N messages
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    } catch {}
    renderCount.current += 1;
    if (messages.length > 0 && renderCount.current % CHECKPOINT_EVERY === 0) {
      try {
        const raw = localStorage.getItem(CHECKPOINT_KEY);
        const list: ChatMsg[][] = raw ? JSON.parse(raw) : [];
        list.unshift(messages);
        localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(list.slice(0, MAX_CHECKPOINTS)));
        setHasCheckpoint(true);
        toast({ title: "Checkpoint saved 🦄", description: `Auto-saved after ${renderCount.current} turns. You can restore.` });
      } catch {}
    }
  }, [messages, HISTORY_KEY, CHECKPOINT_KEY]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(CHECKPOINT_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setHasCheckpoint(Array.isArray(list) && list.length > 0);
    } catch {}
  }, [CHECKPOINT_KEY]);

  const append = useCallback((role: ChatMsg["role"], content: string, meta?: ChatMsg["meta"]) => {
    const msg: ChatMsg = { id: uid(), role, content, ts: Date.now(), meta };
    setMessages((m) => [...m, msg]);
    return msg;
  }, []);

  const replaceLastAssistant = useCallback((content: string, meta?: ChatMsg["meta"]) => {
    setMessages((m) => {
      const next = [...m];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === "assistant") {
          next[i] = { ...next[i], content, meta, ts: Date.now() };
          return next;
        }
      }
      return [...next, { id: uid(), role: "assistant", content, ts: Date.now(), meta }];
    });
  }, []);

  const lastUserPrompt = useCallback((): string | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return null;
  }, [messages]);

  const clear = useCallback(() => {
    setMessages([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  }, [HISTORY_KEY]);

  const restoreCheckpoint = useCallback(() => {
    try {
      const raw = localStorage.getItem(CHECKPOINT_KEY);
      const list: ChatMsg[][] = raw ? JSON.parse(raw) : [];
      if (!list.length) return;
      setMessages(list[0]);
      toast({ title: "Restored", description: "Rolled back to last checkpoint." });
    } catch {}
  }, [CHECKPOINT_KEY]);

  return { messages, append, replaceLastAssistant, lastUserPrompt, clear, hasCheckpoint, restoreCheckpoint };
}
