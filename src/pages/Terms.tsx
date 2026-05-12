import { Link } from "react-router-dom";
import { IpTrademarksSection } from "@/components/IpTrademarksSection";

export default function Terms() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16">
      <article className="prose prose-invert max-w-3xl mx-auto">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="text-4xl font-bold text-gradient-emerald mt-4 mb-2">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground">Last updated: May 2, 2026</p>

        <h2 className="mt-8">1. Who we are</h2>
        <p>This service ("Unicorn AI Builder™", "Unicorn Holdings") is operated by <strong>PGVA Ventures© LLC</strong>, a limited liability company organized in Virginia, USA. By using the service you are entering into an agreement with PGVA Ventures© LLC.</p>

        <h2>2. Acceptance</h2>
        <p>By creating an account, accessing, or using the service, you agree to be bound by these Terms. If you do not agree, do not use the service.</p>

        <h2>3. Authority</h2>
        <p>You confirm you are at least 18 years old, or have the authority to bind the organization on whose behalf you are using the service.</p>

        <h2>4. The service</h2>
        <p>Unicorn AI Builder™ is an AI-powered platform for trend prediction, content generation, business automation, and related services. Specific features depend on your subscription tier.</p>

        <h2>5. Account & credentials</h2>
        <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You agree to provide accurate information and keep it up to date.</p>

        <h2>6. Acceptable use</h2>
        <p>You will not: (a) use the service unlawfully or for fraud/spam; (b) infringe intellectual property; (c) attempt to interfere with security (malware, probing, scraping); (d) reverse engineer, resell, or redistribute the service; (e) generate illegal content, deepfakes, hate speech, malware, or attempt to jailbreak the AI; (f) circumvent technical limits.</p>

        <h2>7. AI outputs</h2>
        <p>You are responsible for your prompts, how you use outputs, verifying their accuracy, and ensuring you have the rights to any input content. AI outputs may be inaccurate and are not a substitute for professional advice (legal, financial, medical, tax). We may remove, restrict, or refuse content and suspend accounts as needed.</p>

        <h2>8. Intellectual property</h2>
        <p>PGVA Ventures© LLC retains all rights in the service, including software, branding, and documentation. We grant you a limited, non-exclusive, non-transferable right to use the service within your selected plan. You retain rights to content you input; you grant us a limited license to host and process it solely to provide the service.</p>

        <IpTrademarksSection />

        <h2>9. Payment, subscriptions and refunds</h2>
        <p>Our order process is conducted by our online reseller <strong>Paddle.com</strong>. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns. Payment, billing, tax, cancellations and refund mechanics are governed by the <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">Paddle Buyer Terms</a> and our <Link to="/refund">Refund Policy</Link>.</p>
        <p>Subscriptions auto-renew until canceled. Upgrades take effect immediately (pro-rated); downgrades take effect at the end of your current billing period. Cancellations keep your access until the end of the period you've paid for.</p>

        <h2>10. Service level</h2>
        <p>We provide the service on an "as is" and "as available" basis. We do not guarantee uninterrupted or error-free performance. To the fullest extent permitted by law, we disclaim all implied warranties including merchantability and fitness for a particular purpose.</p>

        <h2>11. Liability</h2>
        <p>Our aggregate liability is capped at the fees you paid in the prior 12 months. We exclude liability for indirect, consequential or special damages (loss of profits, data, goodwill). We do not exclude liability for fraud, death or personal injury where prohibited by law.</p>

        <h2>12. Indemnity</h2>
        <p>You will indemnify PGVA Ventures© LLC against claims arising from your content, unlawful use, or breach of these Terms.</p>

        <h2>13. Suspension & termination</h2>
        <p>We may suspend or terminate your access for material breach, non-payment, security or fraud risk, or repeated/serious policy violations. Upon termination, you may export your data within 30 days; after that it may be deleted.</p>

        <h2>14. Governing law</h2>
        <p>These Terms are governed by the laws of the Commonwealth of Virginia, USA, without regard to conflict-of-laws principles.</p>

        <h2>15. Binding arbitration &amp; class-action waiver</h2>
        <p><strong>Read this section carefully — it affects your legal rights.</strong> Any dispute, claim, or controversy arising out of or relating to these Terms or the service (a "Dispute") shall be resolved exclusively by <strong>final and binding individual arbitration</strong> administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules, conducted in Loudoun County, Virginia, or by remote hearing. Judgment on the award may be entered in any court of competent jurisdiction.</p>
        <p><strong>Class-action waiver.</strong> You and PGVA Ventures© LLC each agree that Disputes will be brought only in your or its individual capacity, and <strong>not as a plaintiff or class member in any purported class, collective, consolidated, or representative proceeding</strong>. The arbitrator may not consolidate more than one person's claims and may not preside over any form of representative or class proceeding.</p>
        <p><strong>30-day opt-out.</strong> You may opt out of this arbitration agreement by emailing <em>legal@pgvaventures.com</em> within 30 days of first accepting these Terms with the subject line "Arbitration Opt-Out" and your account email. Opting out does not affect any other provision of these Terms.</p>
        <p><strong>Carve-outs.</strong> Either party may bring an individual action in small-claims court, and either party may seek injunctive or equitable relief in court for infringement or misappropriation of intellectual property, trade secrets, or breach of confidentiality.</p>

        <h2>16. IP assignment &amp; feedback license</h2>
        <p>If you submit any ideas, suggestions, feedback, bug reports, feature requests, or other materials regarding the service ("<strong>Feedback</strong>"), you hereby <strong>irrevocably assign</strong> to PGVA Ventures© LLC all right, title, and interest worldwide in and to such Feedback, including all intellectual-property rights, with no obligation of compensation or attribution. To the extent any rights cannot be assigned, you grant PGVA Ventures© LLC a perpetual, irrevocable, worldwide, royalty-free, sublicensable, transferable license to use, reproduce, modify, distribute, and exploit the Feedback for any purpose.</p>
        <p>Any work product, derivative works, models, weights, prompts, agents, automations, or improvements created by PGVA Ventures© LLC (including those informed by your Feedback or usage data) are and remain the sole and exclusive property of PGVA Ventures© LLC.</p>

        <h2>17. DMCA &amp; copyright complaints</h2>
        <p>PGVA Ventures© LLC respects intellectual-property rights. If you believe content on the service infringes your copyright, send a notice compliant with 17 U.S.C. § 512(c)(3) to our designated agent: <strong>DMCA Agent, PGVA Ventures© LLC, Dulles, Virginia, USA</strong>, email <em>dmca@pgvaventures.com</em>. Repeat infringers will be terminated.</p>

        <h2>18. Export, sanctions &amp; anti-corruption</h2>
        <p>You represent that you are not located in, organized under the laws of, or a national or resident of any country or party subject to U.S. sanctions, and you will not use the service in violation of U.S. export-control or anti-corruption laws (including OFAC regulations and the FCPA).</p>

        <h2>19. Confidentiality &amp; trade secrets</h2>
        <p>Non-public information about the service — including architecture, prompts, model routing, the Empire Brain, security controls, and roadmap — is the confidential information and trade secret of PGVA Ventures© LLC. You will not disclose, reverse engineer, scrape, or use such information except as expressly permitted.</p>

        <h2>20. Assignment &amp; force majeure</h2>
        <p>You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition, financing, or sale of assets. Neither party is liable for delays caused by events beyond reasonable control (including infrastructure outages, cyberattacks, pandemics, war, or governmental action).</p>

        <h2>21. Severability &amp; entire agreement</h2>
        <p>If any provision is held unenforceable, the remainder shall remain in effect. These Terms, together with the Privacy Notice and Refund Policy, constitute the entire agreement between you and PGVA Ventures© LLC regarding the service and supersede all prior agreements.</p>

        <h2>22. Contact</h2>
        <p>PGVA Ventures© LLC, Dulles, Virginia, USA. Legal: <em>legal@pgvaventures.com</em>. DMCA: <em>dmca@pgvaventures.com</em>. Support via in-app channels.</p>
      </article>
    </main>
  );
}
