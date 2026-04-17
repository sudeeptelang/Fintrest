import type { Metadata } from "next";
import { Sora, DM_Sans, DM_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
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
  title: "Fintrest.ai — Pick Winning Stocks Before The Market Does",
  description:
    "AI-powered swing trade discovery. Explainable signals, transparent scoring, daily research delivered before the open.",
  keywords: [
    "stock signals",
    "swing trading",
    "AI stock picks",
    "trade discovery",
    "stock analytics",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-icon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Fintrest.ai — Pick Winning Stocks Before The Market Does",
    description:
      "AI-powered swing trade discovery. Explainable signals, transparent scoring, daily research delivered before the open.",
    images: ["/og-image-1200x630.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fintrest.ai — Pick Winning Stocks Before The Market Does",
    description:
      "AI-powered swing trade discovery. Explainable signals, transparent scoring, daily research delivered before the open.",
    images: ["/og-image-1200x630.jpg"],
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
