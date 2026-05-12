import { Link } from "react-router-dom";

export default function Refund() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16">
      <article className="prose prose-invert max-w-3xl mx-auto">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="text-4xl font-bold text-gradient-emerald mt-4 mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: May 2, 2026</p>

        <h2 className="mt-8">30-day money-back guarantee</h2>
        <p>We offer a <strong>30-day money-back guarantee</strong> on all subscription purchases from PGVA Ventures© LLC ("Unicorn AI Builder™"). If you are not satisfied with your purchase, you can request a full refund within 30 days of your order date.</p>

        <h2>How to request a refund</h2>
        <p>Refunds are processed by our payment provider, <strong>Paddle</strong>, who is the Merchant of Record for all of our transactions. To request a refund:</p>
        <ol>
          <li>Visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">paddle.net</a> and look up your order using the email used at checkout, or</li>
          <li>Contact our support team in-app and we will assist you.</li>
        </ol>
        <p>Refunds are typically processed within 5–10 business days back to your original payment method.</p>

        <h2>Cancellations</h2>
        <p>You may cancel your subscription at any time via the customer portal. When you cancel, you keep access until the end of your current billing period — you will not be charged again.</p>

        <h2>Questions</h2>
        <p>See our <Link to="/terms">Terms</Link> and the <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">Paddle Refund Policy</a> for the full mechanics.</p>
      </article>
    </main>
  );
}
