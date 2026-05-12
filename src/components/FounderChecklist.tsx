import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { BrandAudit } from "@/components/BrandAudit";
import { BrandRegistryAdmin } from "@/components/BrandRegistryAdmin";
import { RuntimeBrandChecker } from "@/components/RuntimeBrandChecker";
import SiteEditAuditLog from "@/components/SiteEditAuditLog";
import IpDenylistAdmin from "@/components/IpDenylistAdmin";
import { Link } from "react-router-dom";

type Status = "open" | "started" | "done";
type Item = {
  id: string;
  status: Status;
  title: string;
  url: string;
  why: string;
  secrets?: string[];
};

const ITEMS: Item[] = [
  {
    id: "05",
    status: "open",
    title: "Shopify Partner programme",
    url: "https://www.shopify.com/partners",
    why: "Lets us provision dev stores for tenants automatically (Pile B Phase 2). Until then, customers create their own Shopify store manually.",
    secrets: ["SHOPIFY_PARTNER_API_TOKEN", "SHOPIFY_PARTNER_ORG_ID"],
  },
  {
    id: "06",
    status: "open",
    title: "Shopify Affiliate — revenue share",
    url: "https://www.shopify.com/affiliates",
    why: "Earn ~$58–150 per Unicorn Box™ customer who signs up for Shopify via your link. Replaces bare /free-trial link in Manual + wizard.",
    secrets: ["SHOPIFY_AFFILIATE_LINK"],
  },
  {
    id: "07",
    status: "open",
    title: "Printful Affiliate programme",
    url: "https://www.printful.com/affiliate",
    why: "10% commission on every order placed by a referred merchant for the first 9 months.",
    secrets: ["PRINTFUL_AFFILIATE_LINK"],
  },
  {
    id: "08",
    status: "open",
    title: "Namecheap Affiliate (domain referrals)",
    url: "https://www.namecheap.com/affiliates",
    why: "~35% commission first year on .com etc. Replace bare Namecheap link in Manual §6.",
    secrets: ["NAMECHEAP_AFFILIATE_LINK"],
  },
  {
    id: "09",
    status: "open",
    title: "Twilio — provision US phone number",
    url: "https://console.twilio.com/us1/develop/phone-numbers/manage/search",
    why: "Required for the planned automated voice CS line that answers FAQs from the Manual via ElevenLabs voice (~$1/mo).",
    secrets: ["TWILIO_PHONE_NUMBER"],
  },
  {
    id: "10",
    status: "open",
    title: "Branded support email",
    url: "https://workspace.google.com",
    why: "support@unicornaibuilder.com via Workspace or Namecheap forwarder, reply via alias to keep founder PII hidden.",
  },
  {
    id: "11",
    status: "started",
    title: "Park unicornaibuilder.com",
    url: "https://www.namecheap.com",
    why: "CNAME app.unicornaibuilder.com → Replit deployment, set PUBLIC_HOST=unicornaibuilder.com.",
  },
  {
    id: "12",
    status: "started",
    title: "Postmark + Brevo — wire transactional + outreach",
    url: "https://account.postmarkapp.com",
    why: "Wire lib/mailer.ts router (Postmark transactional, Brevo outreach, auto-failover). Resend is currently single point of failure.",
    secrets: ["POSTMARK_SERVER_TOKEN", "BREVO_API_KEY"],
  },
];

const pill: Record<Status, string> = {
  open: "bg-destructive/15 text-destructive border-destructive/30",
  started: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  done: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
};
const label: Record<Status, string> = { open: "Open", started: "Started", done: "Done" };

export function FounderChecklist() {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Founder Setup Checklist</h2>
        <p className="text-xs text-muted-foreground">
          External accounts & secrets to provision. Source of truth: Replit{" "}
          <code className="text-[10px]">unicornBoxFounderSetup.ts</code>. Admin-only.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {ITEMS.map(item => (
          <Card key={item.id} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">#{item.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pill[item.status]}`}>
                    {label[item.status]}
                  </span>
                </div>
                <div className="font-semibold mt-1 leading-tight">{item.title}</div>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  Open <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{item.why}</p>
            {item.secrets && (
              <div className="flex flex-wrap gap-1">
                {item.secrets.map(s => (
                  <code key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border">{s}</code>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="pt-4 border-t border-border/40 space-y-4">
        <BrandRegistryAdmin />
        <RuntimeBrandChecker pageLabel="/boardroom" />
        <BrandAudit />
        <SiteEditAuditLog />
        <IpDenylistAdmin />
        <div className="text-xs text-muted-foreground">
          Full policy + registry: <Link to="/brand-marks" className="text-primary underline">/brand-marks</Link>
        </div>
      </div>
    </div>
  );
}
