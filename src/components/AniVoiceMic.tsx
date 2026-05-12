import { useCallback, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ANI_AGENT_ID = "agent_4801krcasm8tfmhsc03d57ecw11s";
const EMPIRE_RED = "hsl(0 90% 50%)";

/**
 * Round mic button that opens a live voice call with the Ani ElevenLabs agent.
 * Drop-in replacement for the old Web Speech API mic in AniChat.
 */
export function AniVoiceMic() {
  const [connecting, setConnecting] = useState(false);

  const conversation = useConversation({
    onError: (err: any) => {
      console.error("[AniVoice] error:", err);
      toast({
        title: "Voice agent error",
        description: typeof err === "string" ? err : err?.message ?? "Try again.",
        variant: "destructive",
      });
    },
  });

  const connected = conversation.status === "connected";

  const start = useCallback(async () => {
    setConnecting(true);
    try {
      // Request mic permission inside the user gesture, before any await chain.
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke("elevenlabs-token", {
        body: { agentId: ANI_AGENT_ID },
      });
      if (error) throw error;
      if (!data?.token) throw new Error("No token returned");

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
    } catch (e: any) {
      console.error("[AniVoice] start failed:", e);
      const name = e?.name;
      let description = e?.message ?? "Try again.";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        description = "Allow microphone access for this site, then tap again.";
      } else if (name === "NotFoundError") {
        description = "No microphone found on this device.";
      } else if (name === "NotReadableError") {
        description = "Another app is using the microphone. Close it and retry.";
      }
      toast({ title: "Couldn't start call", description, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      // no-op
    }
  }, [conversation]);

  const onClick = connected ? stop : start;
  const speaking = connected && conversation.isSpeaking;

  return (
    <button
      onClick={onClick}
      disabled={connecting}
      aria-label={connected ? "End call with Ani" : "Call Ani by voice"}
      title={connected ? (speaking ? "Ani is speaking…" : "Listening…") : "Tap to talk to Ani"}
      className="shrink-0 inline-flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-full text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
      style={{
        background: connected
          ? "radial-gradient(circle at 30% 30%, hsl(0 95% 60%), hsl(0 90% 35%))"
          : "linear-gradient(135deg, hsl(0 0% 12%), hsl(0 0% 4%))",
        border: `1.5px solid ${EMPIRE_RED}`,
        boxShadow: connected
          ? "0 0 26px hsl(0 90% 50% / 0.85)"
          : "0 0 12px hsl(0 90% 40% / 0.4)",
      }}
    >
      {connecting ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : connected ? (
        <MicOff className="h-5 w-5" />
      ) : (
        <Mic className={`h-5 w-5 ${speaking ? "animate-pulse" : ""}`} />
      )}
    </button>
  );
}
