import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSiteEditor } from "@/lib/siteEditGuard";

type Row = {
  id: string;
  ip_address: string;
  reason: string | null;
  created_at: string;
};

export default function IpDenylistAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("site_edit_ip_denylist")
      .select("id,ip_address,reason,created_at")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setRows((data ?? []) as Row[]);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    setErr(null);
    if (!ip.trim()) return;
    setBusy(true);
    try {
      await requireSiteEditor({
        intent: "denylist.add",
        endpoint: "IpDenylistAdmin",
        metadata: { ip: ip.trim(), reason },
      });
      const { error } = await (supabase as any)
        .from("site_edit_ip_denylist")
        .insert({ ip_address: ip.trim(), reason: reason || null });
      if (error) throw error;
      setIp("");
      setReason("");
      await load();
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: Row) => {
    setBusy(true);
    setErr(null);
    try {
      await requireSiteEditor({
        intent: "denylist.remove",
        endpoint: "IpDenylistAdmin",
        metadata: { ip: row.ip_address },
      });
      const { error } = await (supabase as any)
        .from("site_edit_ip_denylist")
        .delete()
        .eq("id", row.id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-semibold">IP Denylist</h3>
        <p className="text-xs text-muted-foreground">
          IPs blocked from any site-edit endpoint. Checked before auth/role.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="IP address (e.g. 203.0.113.4)"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
        />
        <Input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button onClick={add} disabled={busy || !ip.trim()}>
          Block
        </Button>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1 pr-2">IP</th>
              <th className="py-1 pr-2">Reason</th>
              <th className="py-1 pr-2">Added</th>
              <th className="py-1 pr-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-muted-foreground">
                  No IPs blocked.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-1 pr-2 font-mono">{r.ip_address}</td>
                <td className="py-1 pr-2">{r.reason ?? "—"}</td>
                <td className="py-1 pr-2 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="py-1 pr-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => remove(r)}
                    disabled={busy}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
