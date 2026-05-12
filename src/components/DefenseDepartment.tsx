import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Scale, Target, DollarSign, Calendar, Code2 } from "lucide-react";

/**
 * The Empire's Defense Department — Sentinel-V Blueprint
 * Admin-only (rendered inside Boardroom which is already gated).
 * Static blueprint view. No data ingestion yet — Phase 2 will wire SAM.gov + AI matching.
 */
export function DefenseDepartment() {
  return (
    <div className="space-y-4">
      <Card className="p-4 border-primary/40 bg-primary/5">
        <div className="flex items-start gap-3">
          <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">Sentinel-V — Procurement Intelligence OS</h2>
              <Badge variant="outline" className="text-[10px]"><Lock className="h-3 w-3 mr-1" />Admin-only</Badge>
              <Badge variant="outline" className="text-[10px]"><Scale className="h-3 w-3 mr-1" />Legal-wrapped</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              The "Palantir for SMBs" — automates federal contract discovery + Go/No-Go scoring for small-to-mid GovCons.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">ICP</h3></div>
          <p className="text-xs text-muted-foreground">Scaling GovCon — defense contractors $5M–$50M revenue, 20+ hrs/wk manually hunting RFPs/RFIs.</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">Revenue Streams</h3></div>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>1. <span className="text-foreground font-medium">Premium Alerts</span> — $199/mo SMS/email match alerts</li>
            <li>2. <span className="text-foreground font-medium">AI Proposal Drafter</span> — $500/use Capability Statement gen</li>
            <li>3. <span className="text-foreground font-medium">Win-Share</span> — 1% success fee on contracts secured</li>
          </ul>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><Calendar className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">7-Day Execution Checklist</h3></div>
        <ol className="text-xs space-y-2">
          {[
            ["Day 1", "Stack & Schema", "Supabase table `contracts`: title, agency, value, naics_code, deadline."],
            ["Day 2", "Data Ingestion", "Make.com / Zapier flow pulling SAM.gov API → backend."],
            ["Day 3", "Match Engine", "UI prompt: uploaded Capability Statement vs active contracts via gpt-4o."],
            ["Day 4", "Dashboard", "High-Match list view filtered by % Match Score."],
            ["Day 5", "Lead Gen", "Scrape LinkedIn — Director of Federal Sales — 50 personalized demos."],
            ["Day 6", "Payment Wall", "Stripe lock on AI Proposal Drafter feature."],
            ["Day 7", "Pitch", "Cold-call 10 GovCon consultants → white-label offer."],
          ].map(([day, title, body]) => (
            <li key={day} className="flex gap-3">
              <span className="font-mono text-primary shrink-0 w-12">{day}</span>
              <span><span className="font-semibold text-foreground">{title}.</span> <span className="text-muted-foreground">{body}</span></span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2"><Code2 className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">Tech Stack & Match Logic</h3></div>
        <div className="text-xs text-muted-foreground space-y-2">
          <p><span className="text-foreground font-medium">Frontend:</span> React (Vite) + Tailwind + Shadcn/UI · <span className="text-foreground font-medium">DB:</span> Supabase · <span className="text-foreground font-medium">AI:</span> OpenAI (embeddings + matching)</p>
          <pre className="bg-muted/40 p-2 rounded text-[10px] overflow-x-auto whitespace-pre">{`const calculateMatch = (contractRequirements, companyCapabilities) => {
  // Returns 1–100 score
  return ai_engine.compare(contractRequirements, companyCapabilities);
};

// Render: [ Sidebar: Opportunity Feed | Center: Contract Detail | Right: AI Draft Assistant ]`}</pre>
        </div>
      </Card>

      <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start gap-3">
          <Scale className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-semibold text-foreground">Security & Legal Wrap</div>
            <ul className="text-muted-foreground list-disc pl-4 space-y-0.5">
              <li>Admin-only access (Rule #5 — owner role gate).</li>
              <li>SAM.gov data is public-domain federal solicitation data — ingestion compliant with SAM.gov Terms.</li>
              <li>Win-Share contracts require signed engagement letter before fee accrues (no automatic claim on awards).</li>
              <li>AI Proposal Drafter outputs marked "DRAFT — attorney review required" before submission to any agency.</li>
              <li>No PII storage of LinkedIn-scraped leads beyond name + title + public company; honor opt-out within 24h.</li>
              <li>Phase 2 will add: encrypted contract uploads, RLS-scoped per-tenant data, audit log for every AI match call.</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Status:</span> Blueprint locked in. Phase 2 build-out (SAM.gov ingestion, match engine, Stripe gate) ships once Founder Checklist external accounts are provisioned.
      </Card>
    </div>
  );
}
