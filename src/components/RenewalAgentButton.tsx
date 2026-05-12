import { useCallback, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Phone, PhoneOff, Loader2 } from "lucide-react";

const RENEWAL_AGENT_ID = "agent_4401krcad257fkat1jpqskm9209v";

type Props = {
  /** Optional label override */
  label?: string;
  /** Button visual variant */
  variant?: "default" | "secondary" | "outline";
  className?: string;
};

export function RenewalAgentButton({
  label = "Talk to a renewal specialist",
  variant = "default",
  className,
}: Props) {
  const [connecting, setConnecting] = useState(false);

  const conversation = useConversation({
    onError: (err) => {
      console.error("[RenewalAgent] error:", err);
      toast.error("Voice agent error", {
        description: typeof err === "string" ? err : "Try again in a moment.",
      });
    },
  });

  const start = useCallback(async () => {
    setConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-token",
        { body: { agentId: RENEWAL_AGENT_ID } },
      );
      if (error) throw error;
      if (!data?.token) throw new Error("No token returned");

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
    } catch (e: any) {
      console.error("[RenewalAgent] start failed:", e);
      toast.error("Couldn't start the call", {
        description: e?.message ?? "Check mic permissions and try again.",
      });
    } finally {
      setConnecting(false);
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const connected = conversation.status === "connected";

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      {!connected ? (
        <Button
          onClick={start}
          disabled={connecting}
          variant={variant}
          className="gap-2"
        >
          {connecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          {connecting ? "Connecting…" : label}
        </Button>
      ) : (
        <>
          <Button onClick={stop} variant="destructive" className="gap-2">
            <PhoneOff className="h-4 w-4" />
            End call
          </Button>
          <span className="text-xs text-muted-foreground">
            {conversation.isSpeaking ? "Agent speaking…" : "Listening…"}
          </span>
        </>
      )}
    </div>
  );
}
