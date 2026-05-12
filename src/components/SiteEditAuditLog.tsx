import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  created_at: string;
  user_email: string | null;
  intent: string;
  endpoint: string | null;
  outcome: "allowed" | "denied" | "error";
  reason: string | null;
  ip_address: string | null;
};

export default function SiteEditAuditLog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("site_edit_audit")
      .select("id,created_at,user_email,intent,endpoint,outcome,reason,ip_address")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setErr(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const variant = (o: Row["outcome"]) =>
    o === "allowed" ? "default" : o === "denied" ? "destructive" : "secondary";

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Site-Edit Audit Log</h3>
          <p className="text-xs text-muted-foreground">
            Every attempted website edit (admin-only). Last 100 entries.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1 pr-2">When</th>
              <th className="py-1 pr-2">Who</th>
              <th className="py-1 pr-2">Intent</th>
              <th className="py-1 pr-2">Endpoint</th>
              <th className="py-1 pr-2">Outcome</th>
              <th className="py-1 pr-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="py-3 text-muted-foreground">
                  No attempts logged yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-1 pr-2 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="py-1 pr-2">{r.user_email ?? "anon"}</td>
                <td className="py-1 pr-2">{r.intent}</td>
                <td className="py-1 pr-2">{r.endpoint}</td>
                <td className="py-1 pr-2">
                  <Badge variant={variant(r.outcome) as any}>{r.outcome}</Badge>
                </td>
                <td className="py-1 pr-2 text-muted-foreground">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
