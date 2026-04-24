"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Reusable stock logo primitive. Resolves a ticker to a Clearbit logo
 * via the company domain — but since we don't carry per-stock domains,
 * we use the Logo.dev fallback which accepts tickers directly. If the
 * image 404s, we fall back to a coloured initial tile using a hash of
 * the ticker to pick a stable hue so the same ticker always gets the
 * same non-brand tile.
 *
 * Sizes: sm = 24px, md = 32px, lg = 48px. Logos sit in rounded squares
 * (not circles) so tickers don't feel like user avatars.
 */

const SIZE_MAP = {
  sm: { box: 24, radius: 4, font: 10 },
  md: { box: 32, radius: 6, font: 12 },
  lg: { box: 48, radius: 10, font: 16 },
} as const;

// Stable tile colors by ticker hash. Muted, compatible with the sky
// brand + v3 content palette — no primary RGB, nothing that clashes.
const TILE_COLORS = [
  "#1E3A5F", "#6B3B5E", "#2F7A7A", "#8A5A3B",
  "#4A5A6E", "#5A6B3E", "#B8862F", "#6B5443",
];

function hashTicker(ticker: string): number {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function StockLogo({
  ticker,
  size = "md",
  className,
}: {
  ticker: string;
  size?: keyof typeof SIZE_MAP;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const sym = (ticker ?? "").toUpperCase();
  const { box, radius, font } = SIZE_MAP[size];
  const bg = TILE_COLORS[hashTicker(sym) % TILE_COLORS.length];

  if (!sym) {
    return (
      <div
        className={cn("inline-block bg-ink-100", className)}
        style={{ width: box, height: box, borderRadius: radius }}
      />
    );
  }

  // Logo.dev accepts a ticker-style path and returns a square logo or a
  // 404 we catch in onError. Free tier is fine for our scale.
  const src = `https://img.logo.dev/ticker/${sym}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ&size=96`;

  if (errored) {
    return (
      <div
        className={cn(
          "inline-grid place-items-center text-ink-0 font-semibold",
          className,
        )}
        style={{
          width: box,
          height: box,
          borderRadius: radius,
          backgroundColor: bg,
          fontSize: font,
        }}
        aria-label={sym}
      >
        {sym[0]}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${sym} logo`}
      onError={() => setErrored(true)}
      className={cn("inline-block object-cover", className)}
      style={{ width: box, height: box, borderRadius: radius }}
    />
  );
}
