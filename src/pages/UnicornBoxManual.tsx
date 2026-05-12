import { Link } from "react-router-dom";
import { ArrowLeft, Crown, Gem, Sparkles, Printer, ExternalLink, Mail, ShieldCheck } from "lucide-react";
import logo from "@/assets/unicorn-empire-logo.png";
import { SubscribeButton } from "@/components/SubscribeButton";
import { AskUnicorn } from "@/components/AskUnicorn";

const SECTIONS = [
  { id: "s1",  num: "§1",  title: "What Unicorn Box™ is (and isn't)" },
  { id: "s2",  num: "§2",  title: "The 3 Blueprint tiers" },
  { id: "s3",  num: "§3",  title: "What you get inside the Blueprint" },
  { id: "s4",  num: "§4",  title: "The 90-second intake" },
  { id: "s5",  num: "§5",  title: "After you pay — what happens" },
  { id: "s6",  num: "§6",  title: "Executing your Blueprint on Shopify" },
  { id: "s7",  num: "§7",  title: "Executing your Blueprint on Printful" },
  { id: "s8",  num: "§8",  title: "Custom domain (optional)" },
  { id: "s9",  num: "§9",  title: "Payments, refunds & invoices" },
  { id: "s10", num: "§10", title: "Support & contact" },
  { id: "s11", num: "§11", title: "What's coming next (roadmap)" },
  { id: "s12", num: "§12", title: "Legal, disclaimers & trademarks" },
];

const SUPPORT = "mailto:support@unicornaibuilder.com";
const STATUS = "https://unicornaibuilder.lovable.app/";

const Section = ({ id, num, title, children }: { id: string; num: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 py-10 border-t border-border/40">
    <div className="flex items-baseline gap-3 mb-4">
      <span className="text-xs font-mono uppercase tracking-[0.3em] text-primary">{num}</span>
      <h2 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
    </div>
    <div className="prose prose-invert max-w-none text-foreground/85 leading-relaxed space-y-4
                    [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline
                    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5
                    [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5
                    [&_li]:text-foreground/80
                    [&_strong]:text-foreground [&_strong]:font-semibold
                    [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2">
      {children}
    </div>
  </section>
);

const UnicornBoxManual = () => {
  return (
    <main className="caribbean-accent min-h-screen bg-background text-foreground">
      <title>Unicorn Box™ Manual · v2.0 — PGVA Ventures LLC</title>
      <meta name="description" content="The honest manual for Unicorn Box™ — a one-time AI-generated launch Blueprint for your micro-business. Brand pack, Shopify listings, content calendar, blog drafts." />

      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-40" />

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logo} alt="Unicorn Box™" className="h-8 w-8 rounded-lg shadow-lg transition-transform group-hover:scale-105" />
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Unicorn Holdings</p>
              <p className="text-sm font-semibold">Unicorn Box™ · Manual</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-xs">
            <Link to="/" className="px-3 py-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">Empire</Link>
            <Link to="/unicorn-box/start" className="px-3 py-1.5 rounded-full hover:bg-secondary text-primary font-medium">Start a Blueprint</Link>
            <span className="px-3 py-1.5 rounded-full bg-primary/15 text-primary font-medium">Manual</span>
          </nav>
          <button onClick={() => window.print()} className="hidden md:inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass hover:bg-secondary transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto max-w-5xl px-6 pt-8 pb-10 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-3 w-3" /> Back to Unicorn Empire
        </Link>

        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 blur-3xl bg-primary/30 rounded-full" />
          <img src={logo} alt="Unicorn Box™ logo" className="relative h-28 w-28 md:h-36 md:w-36 mx-auto drop-shadow-2xl animate-float" />
        </div>

        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">Manual · v2.0 · 2026-05-08</p>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
          Customer <span className="text-gradient-empire">Manual</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Everything Unicorn Box™ delivers — and exactly what you do with it. No exaggeration, no fine print.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/unicorn-box">
            <button className="h-11 px-6 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90">
              Start your Blueprint →
            </button>
          </Link>
          <SubscribeButton priceId="unicorn_blueprint_founder_onetime" label="Buy Founder · $97 one-time" variant="outline" className="h-11 px-6" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">One-time payment · Delivered in minutes · 30-day refund window</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> PGVA Ventures LLC</span>
          <span className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1.5">Dulles, Virginia</span>
          <a href="mailto:legal@unicornaibuilder.com" className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1.5 hover:bg-secondary transition-colors">
            <Mail className="h-3.5 w-3.5" /> legal@unicornaibuilder.com
          </a>
        </div>
      </section>

      {/* TOC */}
      <section className="mx-auto max-w-5xl px-6 pb-8">
        <div className="glass-strong rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Table of contents</p>
            <span className="text-xs text-muted-foreground">{SECTIONS.length} sections</span>
          </div>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="group flex items-baseline gap-3 text-sm hover:text-primary transition-colors">
                  <span className="font-mono text-xs text-muted-foreground group-hover:text-primary w-8">{s.num}</span>
                  <span className="text-foreground/85 group-hover:text-primary">{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CONTENT */}
      <article className="mx-auto max-w-3xl px-6 pb-12">
        <Section id="s1" num="§1" title="What Unicorn Box™ is (and isn't)">
          <p>
            <strong>Unicorn Box™ is a one-time AI-generated launch Blueprint</strong> for a single product micro-business.
            You answer 8 short questions. Unicorn AI returns a complete, executable plan: brand pack, Shopify-ready
            product listings, a multi-week content calendar, blog drafts, social captions, and a launch checklist.
          </p>
          <p><strong>What it is:</strong></p>
          <ul>
            <li>A one-time deliverable. Pay once, get the Blueprint, keep it forever.</li>
            <li>Generated by Unicorn AI in 30–90 seconds and saved to your account.</li>
            <li>Designed to be executed by you on your own Shopify store and Printful account.</li>
          </ul>
          <p><strong>What it is not (today):</strong></p>
          <ul>
            <li>It is <strong>not</strong> a managed service that runs your store for you.</li>
            <li>It does <strong>not</strong> auto-publish products to Shopify, post to social media, or fulfill orders on your behalf.</li>
            <li>It does <strong>not</strong> include a recurring AI engine that posts daily content. (That's on the roadmap — see §11.)</li>
          </ul>
          <p>
            We deliberately keep this scope tight so we can over-deliver. Read §11 for what's coming next.
          </p>
        </Section>

        <Section id="s2" num="§2" title="The 3 Blueprint tiers">
          <p>One-time payment. No subscription. Pick what matches your ambition.</p>
          <h3>Spark · $27 one-time</h3>
          <ul>
            <li>1 product</li>
            <li>AI brand pack (name, tagline, voice rules, palette)</li>
            <li>1 Shopify-ready listing (title + 80-word SEO description)</li>
            <li>7-day content calendar</li>
            <li>Setup checklist</li>
          </ul>
          <h3>Founder · $97 one-time <span className="text-fluoro-gold text-xs">(most popular)</span></h3>
          <ul>
            <li>3 product variants</li>
            <li>Full brand kit</li>
            <li>10 Shopify-ready listings</li>
            <li>30-day content calendar + 10 blog drafts (250+ words each)</li>
            <li>30 social captions</li>
            <li>Printful + Shopify wiring guide</li>
            <li>1 revision pass (re-generate with tweaked intake)</li>
          </ul>
          <h3>Studio · $297 one-time</h3>
          <ul>
            <li>6-product line</li>
            <li>Premium brand kit</li>
            <li>30 Shopify-ready listings</li>
            <li>90-day content calendar + 30 blog drafts + 60 social captions</li>
            <li>Video script pack (3 short-form scripts)</li>
            <li>30 days of email Q&A support with our team</li>
          </ul>
          <p>
            <strong>Currency &amp; tax:</strong> Prices are in USD. Local taxes are calculated and collected by Paddle at checkout
            based on your billing country. See §9 for refund policy.
          </p>
        </Section>

        <Section id="s3" num="§3" title="What you get inside the Blueprint">
          <p>Every Blueprint is delivered as a single document with these sections (depth scales by tier):</p>
          <ol>
            <li><strong>Brand Pack</strong> — name, tagline, 1-paragraph origin story, 5 brand voice rules, color palette suggestion.</li>
            <li><strong>Product Line</strong> — concrete product variants with title, 1-line description, suggested Printful blank, suggested retail price.</li>
            <li><strong>Shopify Listings</strong> — full product titles + ~80-word SEO descriptions ready to paste into Shopify.</li>
            <li><strong>Content Calendar</strong> — day-by-day topics matched to your audience and vibe.</li>
            <li><strong>Blog Drafts</strong> — 250+ word SEO-keyworded articles you can publish as-is or edit.</li>
            <li><strong>Social Captions</strong> — mix of platforms, ready to schedule.</li>
            <li><strong>Launch Checklist</strong> — your numbered next-7-days action list.</li>
            <li><strong>Video Script Pack</strong> (Studio only) — short-form video scripts with hook / body / CTA.</li>
          </ol>
          <p>You can download the full Blueprint as a markdown file and keep it forever.</p>
        </Section>

        <Section id="s4" num="§4" title="The 90-second intake">
          <p>Open <Link to="/unicorn-box">/unicorn-box</Link> and answer these 8 questions:</p>
          <ol>
            <li>Your name</li>
            <li>Email (where we send your receipt + a backup copy of the Blueprint)</li>
            <li>Product idea (one sentence)</li>
            <li>Product type (apparel / mug / poster / sticker / accessory / "not sure — suggest")</li>
            <li>Audience (who buys this — one sentence)</li>
            <li>Vibe (3 adjectives, e.g. "minimalist, sarcastic, retro")</li>
            <li>Brand name (or leave blank and AI will suggest 5)</li>
            <li>Goal (side income / replace day job / build to sell)</li>
          </ol>
          <p>
            That's everything Unicorn AI needs. The more specific your audience and vibe, the sharper the Blueprint.
            Skipping fields lowers quality.
          </p>
        </Section>

        <Section id="s5" num="§5" title="After you pay — what happens">
          <ol>
            <li>Paddle (our payment processor and Merchant of Record) charges your card and emails a receipt.</li>
            <li>You're returned to <code>/unicorn-box/blueprint</code> on our site.</li>
            <li>Unicorn AI generates your Blueprint in 30–90 seconds.</li>
            <li>The Blueprint renders on screen and is saved to your account.</li>
            <li>You can download it as a markdown file with one click.</li>
          </ol>
          <p>
            <strong>Don't close the tab during generation.</strong> If something goes wrong, your intake is logged and our
            team can re-run it for you — email <a href={SUPPORT} target="_blank" rel="noreferrer">support@unicornaibuilder.com</a>{" "}
            with your Paddle receipt number.
          </p>
        </Section>

        <Section id="s6" num="§6" title="Executing your Blueprint on Shopify">
          <p>
            Unicorn Box does <strong>not</strong> connect to your Shopify or post on your behalf today. You execute the Blueprint
            yourself — it takes about 30–60 minutes to copy-paste 10 listings into Shopify the first time.
          </p>
          <ol>
            <li>Start a Shopify trial: <a href="https://www.shopify.com" target="_blank" rel="noreferrer">shopify.com</a> (3 days free; lowest plan is $29/mo after).</li>
            <li>In Shopify Admin: <strong>Products → Add product</strong>.</li>
            <li>Paste the title from your Blueprint's Shopify Listings section.</li>
            <li>Paste the SEO description.</li>
            <li>Repeat for each product variant.</li>
            <li>Publish. Then move on to Printful — see §7.</li>
          </ol>
          <p>
            Shopify status: <a href="https://www.shopifystatus.com" target="_blank" rel="noreferrer">shopifystatus.com</a>.
          </p>
        </Section>

        <Section id="s7" num="§7" title="Executing your Blueprint on Printful">
          <p>Printful is a free print-on-demand service that prints + ships every order. You only pay them per order.</p>
          <ol>
            <li>Sign up at <a href="https://www.printful.com" target="_blank" rel="noreferrer">printful.com</a> (free).</li>
            <li>In Printful: <strong>Stores → Add new → Shopify</strong> and authorize.</li>
            <li>Add a billing method to Printful so orders auto-fulfill.</li>
            <li>For each product in your Blueprint, click <strong>Add product</strong> in Printful, pick the suggested blank, upload your design (or generate one with the brand-kit guidance from your Blueprint), and publish.</li>
            <li>Printful pushes the product to your Shopify automatically.</li>
          </ol>
          <p>
            Printful status: <a href="https://status.printful.com" target="_blank" rel="noreferrer">status.printful.com</a>.
          </p>
        </Section>

        <Section id="s8" num="§8" title="Custom domain (optional)">
          <p>Your Shopify URL works fine to start. A custom domain is optional and looks more professional.</p>
          <ul>
            <li><a href="https://www.namecheap.com" target="_blank" rel="noreferrer">Namecheap</a> — ~$12/yr .com, free WHOIS privacy.</li>
            <li><a href="https://www.cloudflare.com/products/registrar/" target="_blank" rel="noreferrer">Cloudflare Registrar</a> — at-cost (~$9.77/yr).</li>
            <li><a href="https://porkbun.com" target="_blank" rel="noreferrer">Porkbun</a> — often cheapest, free WHOIS privacy.</li>
          </ul>
          <p>Add it in Shopify Admin: <strong>Settings → Domains → Connect existing domain</strong>.</p>
        </Section>

        <Section id="s9" num="§9" title="Payments, refunds & invoices">
          <p>
            All payments are processed by <strong>Paddle.com Market Limited</strong>, the Merchant of Record for every Unicorn Box™
            transaction. Paddle handles checkout, sales tax, invoices, refunds, and chargebacks under{" "}
            <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noreferrer">Paddle's Buyer Terms</a>.
          </p>
          <p>
            <strong>30-day refund window.</strong> If you're not happy with your Blueprint, request a full refund within 30 days
            of purchase. Visit <a href="https://paddle.net" target="_blank" rel="noreferrer">paddle.net</a> with your receipt,
            or email <a href={SUPPORT} target="_blank" rel="noreferrer">support@unicornaibuilder.com</a> and we'll handle it
            with Paddle on your behalf. See full <Link to="/refund">Refund Policy</Link>.
          </p>
          <p>
            Paddle emails you a receipt for every charge. Receipts include a "Manage your purchase" link to{" "}
            <a href="https://paddle.net" target="_blank" rel="noreferrer">paddle.net</a> where you can download invoices.
          </p>
          <p>
            <strong>No subscription.</strong> Unicorn Box™ Blueprint is a one-time purchase. There is nothing to cancel and no recurring charge.
          </p>
        </Section>

        <Section id="s10" num="§10" title="Support & contact">
          <p>One support channel for everything: <a href={SUPPORT} target="_blank" rel="noreferrer">support@unicornaibuilder.com</a> — replies within 1 business day.</p>
          <p>For payment issues you can also contact Paddle directly at <a href="https://paddle.net" target="_blank" rel="noreferrer">paddle.net</a>.</p>
          <h3>Status pages (check first when something looks broken)</h3>
          <ul>
            <li>Unicorn Box™: <a href={STATUS} target="_blank" rel="noreferrer">{STATUS}</a></li>
            <li>Shopify: <a href="https://www.shopifystatus.com" target="_blank" rel="noreferrer">shopifystatus.com</a></li>
            <li>Printful: <a href="https://status.printful.com" target="_blank" rel="noreferrer">status.printful.com</a></li>
            <li>Paddle: <a href="https://status.paddle.com" target="_blank" rel="noreferrer">status.paddle.com</a></li>
          </ul>
        </Section>

        <Section id="s11" num="§11" title="What's coming next (roadmap)">
          <p>Stage 2 is being built and will be released as a separate, optional <strong>subscription</strong> on top of the one-time Blueprint:</p>
          <ul>
            <li><strong>Onboarding wizard</strong> — guided Shopify + Printful connection.</li>
            <li><strong>Auto-publish</strong> — Unicorn AI pushes Blueprint listings into Shopify on your behalf.</li>
            <li><strong>Daily content engine</strong> — daily SEO blog post, scheduled social drafts, monthly product refresh.</li>
            <li><strong>Customer dashboard</strong> — live view of all autonomous activity.</li>
          </ul>
          <p>
            We will only charge for these once they actually exist. Buying a Blueprint today does not lock you into Stage 2,
            and Stage 2 will be priced separately when it ships.
          </p>
        </Section>

        <Section id="s12" num="§12" title="Legal, disclaimers & trademarks">
          <p>Operator: <strong>PGVA Ventures LLC</strong>, a Virginia limited liability company headquartered in Dulles, VA.</p>
          <p>Customer service: <a href={SUPPORT} target="_blank" rel="noreferrer">support@unicornaibuilder.com</a> (replies within 1 business day).</p>
          <p>
            <strong>Income disclaimer.</strong> PGVA Ventures LLC makes no representations of specific income, profit, or sales
            outcomes from executing a Unicorn Box™ Blueprint. Outcomes depend on your vertical, market conditions, your own
            marketing effort, product quality, and many factors outside our control.
          </p>
          <p>
            <strong>AI accuracy disclaimer.</strong> Blueprints are generated by AI models and may contain inaccuracies. Review
            the output before publishing. You are responsible for the content you publish under your own brand, including
            verifying that names, claims, and copy comply with applicable law and platform policies.
          </p>
          <p>
            By purchasing you agree to our <Link to="/terms">Terms of Service</Link>, <Link to="/refund">Refund Policy</Link>, and{" "}
            <Link to="/privacy">Privacy Notice</Link>. Paddle.com Market Limited is the Merchant of Record and additional terms
            apply per <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noreferrer">Paddle's Buyer Terms</a>.
          </p>
          <p className="text-xs text-muted-foreground">
            Unicorn AI Builder™, Unicorn Box™, Unicorn Empire™ and Unicorn Corporation™ are trademarks of PGVA Ventures LLC.
            Common-law rights asserted, federal registration pending. Shopify, Printful, Paddle, Namecheap, Cloudflare, and Porkbun
            are trademarks of their respective owners.
          </p>
        </Section>

        <a href="#top" className="mt-6 inline-flex text-xs text-muted-foreground hover:text-primary">↑ Back to top</a>
      </article>

      {/* PILLAR CROSSLINKS */}
      <section className="mx-auto max-w-6xl px-6 pb-10">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">Explore the Empire</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/" className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform ring-1 ring-white/10">
            <Crown className="h-5 w-5 text-accent mb-3" />
            <h3 className="text-xl font-bold text-gradient-empire">Unicorn Empire</h3>
            <p className="mt-1 text-sm text-muted-foreground">The holding company org chart.</p>
          </Link>
          <Link to="/emerald" className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform ring-1 ring-primary/30">
            <Gem className="h-5 w-5 text-primary mb-3" />
            <h3 className="text-xl font-bold text-gradient-emerald">Unicorn Emerald</h3>
            <p className="mt-1 text-sm text-muted-foreground">Flagship — AI Revenue OS.</p>
          </Link>
          <Link to="/marble" className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform ring-1 ring-white/20">
            <Sparkles className="h-5 w-5 text-foreground/70 mb-3" />
            <h3 className="text-xl font-bold text-gradient-marble">Unicorn Marble</h3>
            <p className="mt-1 text-sm text-muted-foreground">Premium — Black/Glass Edition.</p>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-7 w-7 rounded-md opacity-80" />
            <span>© 2026 PGVA Ventures LLC · Dulles, Virginia · All Rights Reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="mailto:legal@unicornaibuilder.com" className="hover:text-foreground inline-flex items-center gap-1">legal@unicornaibuilder.com <ExternalLink className="h-3 w-3" /></a>
          </div>
        </div>
        <p className="mx-auto max-w-6xl px-6 pb-8 text-[11px] text-muted-foreground/70 leading-relaxed">
          Unicorn AI Builder™, Unicorn Box™, and Unicorn Corporation™ are trademarks of PGVA Ventures LLC.
          Proprietary and Confidential. Unauthorized reproduction, distribution, or reverse engineering is strictly prohibited.
        </p>
      </footer>
      <AskUnicorn />
    </main>
  );
};

export default UnicornBoxManual;
