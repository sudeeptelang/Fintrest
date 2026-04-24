import type { MetadataRoute } from "next";

// Static sitemap per spec §20 (public marketing surfaces only — app
// routes are authenticated and shouldn't be indexed). Next.js picks up
// this file automatically at /sitemap.xml.

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fintrest.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const marketing = [
    "",
    "/pricing",
    "/about",
    "/disclaimer",
    "/risk-disclosure",
    "/terms",
    "/privacy",
  ];

  return marketing.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1.0 : 0.7,
  }));
}
