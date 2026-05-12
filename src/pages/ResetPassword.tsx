import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      console.error("Password update error:", error);
      return toast.error("Password update failed — please try again.");
    }
    toast.success("Password updated.");
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md glass-strong rounded-3xl p-8 space-y-4">
        <h1 className="text-2xl font-bold text-gradient-emerald">Set new password</h1>
        <div className="space-y-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "..." : "Update password"}
        </Button>
      </form>
    </main>
  );
}
