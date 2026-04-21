import type { Metadata } from "next";
import { Sora, DM_Sans, DM_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import "./globals.css";

// v2 spec uses Sora 400/500/600/700 for display. 800 dropped — headings
// read cleaner at 700 against the new forest palette and don't need it.
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://fintrestweb.vercel.app"
  ),
  title: "Fintrest.ai — Every stock idea, stress-tested before the open.",
  description:
    "The research layer for self-directed traders. Explainable signals, 7-factor scoring, a public audit log. Research, not recommendations.",
  keywords: [
    "stock research",
    "explainable signals",
    "7-factor scoring",
    "audit log",
    "self-directed traders",
  ],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Fintrest.ai — Every stock idea, stress-tested before the open.",
    description:
      "The research layer for self-directed traders. Explainable signals, 7-factor scoring, a public audit log. Research, not recommendations.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fintrest.ai — Every stock idea, stress-tested before the open.",
    description:
      "The research layer for self-directed traders. Explainable signals, 7-factor scoring, a public audit log. Research, not recommendations.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${dmSans.variable} ${dmMono.variable} ${sora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
