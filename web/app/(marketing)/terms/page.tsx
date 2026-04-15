export const metadata = { title: "Terms of Service — Fintrest.ai" };

export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 py-16 prose prose-sm">
      <h1 className="font-[var(--font-heading)] text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <h2 className="mt-8 text-xl font-semibold">1. Educational Content Only</h2>
      <p>
        Fintrest.ai is an educational stock-signal publisher. Nothing on this platform is
        personalized investment advice, a solicitation to buy or sell securities, or a
        recommendation tailored to your financial situation. We are not a broker-dealer,
        investment adviser, or financial planner. Past signal performance does not
        guarantee future results.
      </p>

      <h2 className="mt-6 text-xl font-semibold">2. Your Responsibility</h2>
      <p>
        You are solely responsible for your investment decisions. Do your own research,
        consult a licensed professional before acting, and never invest money you cannot
        afford to lose. Fintrest.ai, its employees, and its affiliates accept no liability
        for trading losses, missed opportunities, or any other decisions you make based on
        content from this platform.
      </p>

      <h2 className="mt-6 text-xl font-semibold">3. Account &amp; Access</h2>
      <p>
        You agree to provide accurate information during signup, keep your credentials
        secure, and notify us of any unauthorized account activity. We may suspend or
        terminate accounts that violate these terms.
      </p>

      <h2 className="mt-6 text-xl font-semibold">4. Subscription &amp; Billing</h2>
      <p>
        Paid plans renew automatically unless cancelled before the next billing period.
        Refunds are handled case-by-case per applicable consumer protection law.
      </p>

      <h2 className="mt-6 text-xl font-semibold">5. Data &amp; Accuracy</h2>
      <p>
        Market data is sourced from third-party providers and may be delayed or contain
        errors. We make no warranty of accuracy, completeness, or timeliness.
      </p>

      <h2 className="mt-6 text-xl font-semibold">6. Changes</h2>
      <p>
        We may update these terms at any time. Continued use of the platform after changes
        constitutes acceptance.
      </p>

      <p className="mt-10 text-sm text-muted-foreground">
        Questions? Contact <a href="mailto:support@fintrest.ai" className="text-primary">support@fintrest.ai</a>.
      </p>
    </article>
  );
}
