import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Athena's Picks", href: "/picks" },
    { label: "Sector Heatmap", href: "/heatmap" },
    { label: "Performance", href: "/performance" },
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
    { label: "Risk Disclosure", href: "/risk-disclosure" },
    { label: "Disclaimer", href: "/disclaimer" },
    { label: "Refund Policy", href: "/refund" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-navy text-white/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="font-[var(--font-heading)] text-lg font-extrabold text-white">
                  F
                </span>
              </div>
              <span className="font-[var(--font-heading)] text-xl font-bold text-white tracking-tight">
                Fintrest<span className="text-primary">.ai</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              AI-powered swing trade discovery. Explainable signals,
              transparent scoring, daily research delivered before the open.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} Fintrest.ai. All rights reserved.
          </p>
          <p className="text-xs text-white/40 max-w-lg text-center sm:text-right">
            Fintrest.ai provides educational research signals and data-driven
            stock analytics. This is not financial advice. Past performance does
            not guarantee future results.
          </p>
        </div>
      </div>
    </footer>
  );
}
