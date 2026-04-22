import type { MetadataRoute } from "next";

// Robots policy — marketing + methodology + audit log open for
// indexing (they build the trust narrative in search results). App
// routes (signed-in surfaces) and Stripe callbacks stay out of the
// crawl. /api is disallowed globally.

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fintrest.ai";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/about",
          "/methodology",
          "/disclaimer",
          "/risk-disclosure",
          "/terms",
          "/privacy",
          "/audit",
        ],
        disallow: [
          "/api/",
          "/auth/",
          "/settings/",
          "/onboarding",
          "/portfolio/",
          "/watchlist",
          "/boards/",
          "/inbox",
          "/markets/",
          "/research/",
          "/stock/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
