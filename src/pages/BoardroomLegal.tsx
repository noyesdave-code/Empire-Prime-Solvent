import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Crown, Shield, ExternalLink, CloudUpload, Loader2 } from "lucide-react";

const OWNER_EMAIL = "noyes.dave@gmail.com";
const STORAGE_KEY = "empire_legal_checklist_v1";

type Item = {
  id: string;
  title: string;
  why: string;
  cost: string;
  url?: string;
  category: "physical" | "entity" | "ip" | "ops" | "infra";
};

const ITEMS: Item[] = [
  // Physical / account hardening — do today
  { id: "2fa-google", title: "Enable 2FA on noyes.dave@gmail.com", why: "Single biggest physical-security upgrade. Owner account = entire admin surface.", cost: "Free", url: "https://myaccount.google.com/security", category: "physical" },
  { id: "password-manager", title: "Move all credentials into 1Password / Bitwarden", why: "Eliminates reused-password phishing risk.", cost: "Free–$3/mo", url: "https://bitwarden.com", category: "physical" },
  { id: "domain-lock", title: "Domain registrar lock + WHOIS privacy", why: "Prevents domain hijacking. Confirm at registrar.", cost: "Free", category: "physical" },
  { id: "recovery-keys", title: "Store backup recovery codes offline", why: "Print + lock. Account loss = empire loss.", cost: "Free", category: "physical" },

  // Entity formation
  { id: "llc-formed", title: "PGVA Ventures LLC filed (state of formation)", why: "Liability shield + contracts in entity name.", cost: "$50–$500", url: "https://www.scc.virginia.gov/", category: "entity" },
  { id: "ein", title: "EIN issued by IRS", why: "Required for bank, payroll, taxes.", cost: "Free", url: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online", category: "entity" },
  { id: "registered-agent", title: "Registered agent on file", why: "Service-of-process address. Required by state.", cost: "~$125/yr", category: "entity" },
  { id: "operating-agreement", title: "Operating agreement signed", why: "Critical for liability shield, banking, investors.", cost: "$0–$500", category: "entity" },
  { id: "business-bank", title: "Business bank account separate from personal", why: "Piercing-the-veil defense.", cost: "Free", category: "entity" },

  // IP
  { id: "tm-empire", title: "Trademark: \"The Empire\" (USPTO TEAS Plus)", why: "Locks the brand against squatters.", cost: "$250/class", url: "https://www.uspto.gov/trademarks/apply/teas-plus", category: "ip" },
  { id: "tm-ani", title: "Trademark: \"Ani\" (USPTO TEAS Plus)", why: "Public-facing brain — must be protected.", cost: "$250/class", url: "https://www.uspto.gov/trademarks/apply", category: "ip" },
  { id: "tm-unicorn", title: "Trademark: \"Unicorn AI Builder\"", why: "Core platform mark.", cost: "$250/class", category: "ip" },
  { id: "tm-pgva", title: "Trademark: \"PGVA Ventures\"", why: "Entity-name protection.", cost: "$250/class", category: "ip" },
  { id: "copyright-code", title: "Copyright registration on platform code", why: "Code is auto-©, but registration unlocks statutory damages.", cost: "$65", url: "https://www.copyright.gov/registration/", category: "ip" },
  { id: "provisional-patents", title: "Provisional patents: Sentinel-V, Helionet, Chameleon", why: "Locks priority date for novel architecture.", cost: "$300 ea", url: "https://www.uspto.gov/patents/basics/types-patent-applications/provisional-application-patent", category: "ip" },
  { id: "dmca-agent", title: "DMCA agent registered with US Copyright Office", why: "Required if hosting any user content. Safe harbor.", cost: "$6", url: "https://dmca.copyright.gov/", category: "ip" },
  { id: "nda-template", title: "Mutual NDA template ready to send", why: "Every contractor / advisor signs before access.", cost: "Free", category: "ip" },

  // Ops
  { id: "cyber-liability", title: "Cyber-liability insurance quote", why: "Covers breach response, legal fees.", cost: "$500–$2k/yr", category: "ops" },
  { id: "support-email", title: "support@pgvaventures.com mailbox active", why: "Required by Paddle + Terms.", cost: "$6/mo", category: "ops" },
  { id: "legal-email", title: "legal@ + dmca@ + privacy@ mailboxes active", why: "Referenced in Terms & Privacy.", cost: "Included", category: "ops" },
  { id: "code-escrow", title: "Off-site encrypted code escrow", why: "Continuity if Lovable / GitHub goes down.", cost: "Free (private mirror)", category: "ops" },

  // Infra (deferred — paid)
  { id: "cloudflare", title: "Cloudflare in front of domain (WAF + rate limit)", why: "Edge DDoS + bot protection. Deferred.", cost: "Free–$25/mo", url: "https://www.cloudflare.com", category: "infra" },
];

export default function BoardroomLegal() {
  useNoIndex();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [backingUp, setBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState<{ url: string; counts: Record<string, number> } | null>(null);

  useEffect(() => {
    try { setChecked(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")); } catch { /* */ }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    if (user.email?.toLowerCase() === OWNER_EMAIL) { setIsAdmin(true); return; }
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin(!!roles?.some(r => r.role === "admin"));
    })();
  }, [user, loading, navigate]);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const runBackup = async () => {
    setBackingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-nightly", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLastBackup({ url: data.gist_url, counts: data.counts });
      toast.success("Backup mirrored to private gist");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Backup failed");
    } finally {
      setBackingUp(false);
    }
  };

  if (loading || isAdmin === null) {
    return <main className="min-h-screen bg-background grid place-items-center text-foreground">Loading…</main>;
  }
  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background grid place-items-center px-4 text-foreground">
        <Card className="max-w-md p-8 text-center glass-strong">
          <Shield className="h-10 w-10 mx-auto mb-3 text-primary" />
          <h1 className="text-2xl font-bold mb-2">Legal vault is admin-only</h1>
          <Button asChild variant="outline"><Link to="/">Home</Link></Button>
        </Card>
      </main>
    );
  }

  const total = ITEMS.length;
  const done = ITEMS.filter(i => checked[i.id]).length;
  const pct = Math.round((done / total) * 100);

  const groups: Record<Item["category"], { label: string; items: Item[] }> = {
    physical: { label: "Physical & account hardening (do today)", items: [] },
    entity:   { label: "Entity formation (this week)", items: [] },
    ip:       { label: "IP & trademarks (this month)", items: [] },
    ops:      { label: "Ops & insurance", items: [] },
    infra:    { label: "Infra (deferred / paid)", items: [] },
  };
  for (const i of ITEMS) groups[i.category].items.push(i);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between glass-strong sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-gradient-emerald">Legal &amp; IP Vault</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/boardroom">Boardroom</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/boardroom/security">Security</Link></Button>
        </div>
      </header>

      <section className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Fortress legal posture</div>
            <Badge variant="outline">{done} / {total} ({pct}%)</Badge>
          </div>
          <div className="h-2 rounded bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Checklist state is stored in this browser only. Nothing is reported externally.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold flex items-center gap-2"><CloudUpload className="h-4 w-4" /> Off-site backup</div>
              <p className="text-xs text-muted-foreground mt-1">
                Snapshots all critical Empire tables and pushes them to a private GitHub gist.
              </p>
            </div>
            <Button onClick={runBackup} disabled={backingUp}>
              {backingUp ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Backing up…</> : "Run backup now"}
            </Button>
          </div>
          {lastBackup && (
            <div className="mt-3 text-xs space-y-1">
              <a href={lastBackup.url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
                Open gist <ExternalLink className="h-3 w-3" />
              </a>
              <div className="text-muted-foreground">
                {Object.entries(lastBackup.counts).map(([t, c]) => `${t}:${c}`).join(" · ")}
              </div>
            </div>
          )}
        </Card>

        {Object.entries(groups).map(([k, g]) => (
          <Card key={k} className="p-5">
            <h2 className="font-semibold mb-3">{g.label}</h2>
            <ul className="space-y-3">
              {g.items.map(i => (
                <li key={i.id} className="flex items-start gap-3">
                  <Checkbox checked={!!checked[i.id]} onCheckedChange={() => toggle(i.id)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${checked[i.id] ? "line-through text-muted-foreground" : ""}`}>{i.title}</span>
                      <Badge variant="outline" className="text-[10px]">{i.cost}</Badge>
                      {i.url && (
                        <a href={i.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                          open <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{i.why}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}

        <Card className="p-5 text-xs text-muted-foreground">
          Terms updated with binding arbitration, class-action waiver (30-day opt-out), IP / Feedback assignment, DMCA agent, export &amp; sanctions, confidentiality &amp; trade-secret clauses. Privacy updated with breach notification, GPC honoring, AI-training stance, and dedicated <em>privacy@</em> / <em>dmca@</em> / <em>legal@</em> contacts. Review at <Link className="text-primary hover:underline" to="/terms">/terms</Link> and <Link className="text-primary hover:underline" to="/privacy">/privacy</Link>.
        </Card>
      </section>
    </main>
  );
}
