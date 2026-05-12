import { useEffect, useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

// SHA-256 of the default passcode "EmpireDefense2026". Dave can rotate by
// changing this constant + sharing the new passcode out-of-band.
// Step-up check is client-side only — cheap, deterrent-grade. Real data
// gating still relies on admin RLS server-side.
const PASSCODE_HASH = "554a613f11f37a7c9eb1ac96022c61ffeedc5ff4897815e423470de42d96a410";
const STORAGE_KEY = "defense_unlocked_at";
const TTL_MS = 30 * 60 * 1000; // 30 min, then re-prompt
const OWNER_EMAIL = "noyes.dave@gmail.com";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function DefenseGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ts = Number(sessionStorage.getItem(STORAGE_KEY) || 0);
    if (ts && Date.now() - ts < TTL_MS) setUnlocked(true);
  }, []);

  // Owner is auto-unlocked — they already cleared the auth gate + admin role.
  if (isOwner || unlocked) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    // Normalize: trim + strip zero-width chars + collapse spaces. Mobile
    // keyboards sometimes inject NBSP / zero-widths between keystrokes.
    const cleaned = code
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
      .trim();
    const h = await sha256(cleaned);
    if (h === PASSCODE_HASH) {
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
      setUnlocked(true);
      setCode("");
    } else {
      setErr("Wrong passcode.");
    }
    setBusy(false);
  };

  return (
    <Card className="p-6 max-w-md mx-auto mt-6 border-primary/40">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Defense Department locked</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Step-up passcode required. Session unlock lasts 30 minutes.
        {!user && <> Sign in as the owner first to skip this prompt.</>}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Input
          type="password"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          placeholder="Passcode"
          value={code}
          onChange={e => setCode(e.target.value)}
        />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button type="submit" disabled={busy || !code} className="w-full">
          <Lock className="h-4 w-4 mr-1" /> Unlock
        </Button>
      </form>
    </Card>
  );
}
