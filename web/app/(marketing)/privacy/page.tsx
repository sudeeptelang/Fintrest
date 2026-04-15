export const metadata = { title: "Privacy Policy — Fintrest.ai" };

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 py-16 prose prose-sm">
      <h1 className="font-[var(--font-heading)] text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <h2 className="mt-8 text-xl font-semibold">1. Information We Collect</h2>
      <p>
        We collect the information you provide during signup (email, name), the portfolio
        holdings you choose to upload, and basic usage analytics (pages viewed, features used).
        We do not collect your brokerage passwords, tax IDs, or bank account numbers.
      </p>

      <h2 className="mt-6 text-xl font-semibold">2. How We Use It</h2>
      <ul>
        <li>To provide and personalize the Fintrest.ai service</li>
        <li>To send the emails you&apos;ve opted into (morning briefing, signal alerts, newsletter)</li>
        <li>To generate AI-powered portfolio analysis when you request it</li>
        <li>To improve our signal engine and product quality</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold">3. AI Processing</h2>
      <p>
        Our AI assistant Athena is powered by Anthropic&apos;s Claude API. Portfolio and
        stock context sent to Claude is processed for the single purpose of generating
        an analysis response and is not used to train third-party models.
      </p>

      <h2 className="mt-6 text-xl font-semibold">4. Third-Party Services</h2>
      <p>
        We use Supabase for authentication, Stripe for billing, AWS SES for email,
        and market data providers (Polygon.io, Financial Modeling Prep, Finnhub) for
        price and fundamental data. Each handles data per their own privacy policies.
      </p>

      <h2 className="mt-6 text-xl font-semibold">5. Your Rights</h2>
      <p>
        You can export your data, update your email preferences in Settings, or request
        account deletion at any time by emailing <a href="mailto:support@fintrest.ai" className="text-primary">support@fintrest.ai</a>.
      </p>

      <h2 className="mt-6 text-xl font-semibold">6. Cookies</h2>
      <p>
        We use session cookies for authentication. We do not sell data to advertisers.
      </p>

      <p className="mt-10 text-sm text-muted-foreground">
        Questions? Contact <a href="mailto:support@fintrest.ai" className="text-primary">support@fintrest.ai</a>.
      </p>
    </article>
  );
}
