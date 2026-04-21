import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";

const footerLinks = {
  Product: [
    { label: "Today's Research", href: "/picks" },
    { label: "Sector Heatmap", href: "/heatmap" },
    { label: "Audit Log", href: "/performance" },
    { label: "Pricing", href: "/pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Terms of Use", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Not Financial Advice", href: "/disclaimer" },
    { label: "Risk Disclosure", href: "/risk-disclosure" },
    { label: "Regulatory Status", href: "/disclaimer#who-we-are" },
    { label: "Refund Policy", href: "/refund" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-ink-950 text-ink-0/70">
      {/* Persistent compliance strip */}
      <div className="border-b border-ink-0/10 bg-black/25">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-center text-[11px] sm:text-xs text-ink-0/60 tracking-wide">
            Fintrest publishes research, not recommendations. Not a Registered
            Investment Adviser. Trading involves risk of loss.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
              <LogoMark size={36} />
              <span className="font-[var(--font-heading)] text-xl font-bold text-ink-0 tracking-tight">
                Fintrest<span className="text-[color:var(--up)]">.ai</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-ink-0/60">
              The research layer for self-directed traders. Explainable
              signals, transparent scoring, a public audit log. Research, not
              recommendations.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-ink-0 mb-4 tracking-[0.08em] uppercase">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-0/60 hover:text-ink-0 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Full disclaimer block */}
        <div className="mt-14 pt-8 border-t border-ink-0/10 space-y-4 text-xs text-ink-0/45 leading-relaxed">
          <p>
            Fintrest.ai is a stock research and data-analytics platform
            operated by DSYS Inc. We are <span className="text-ink-0/75 font-medium">not a Registered Investment Adviser</span>,
            a broker-dealer, a financial planner, or a licensed portfolio
            manager. We do not manage money, hold customer funds, or execute
            trades.
          </p>
          <p>
            Nothing on this website, in any email, in any alert, or in any
            chat with Lens constitutes investment advice, a personal
            recommendation, a solicitation to buy or sell any security, or an
            offer to enter into an investment advisory relationship. All
            signals, scores, theses, reference levels, and commentary are
            educational research outputs derived from public market data. They
            do not take your personal financial situation, objectives, or risk
            tolerance into account.
          </p>
          <p>
            Past performance — including backtested and hypothetical
            performance — does not guarantee future results. Trading stocks
            involves substantial risk of loss, including the total loss of
            your investment. You are solely responsible for your own
            investment decisions. Consult a licensed financial professional
            before acting on any information you see on this site.
          </p>
          <p className="pt-2 text-ink-0/40">
            &copy; {new Date().getFullYear()} DSYS Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
