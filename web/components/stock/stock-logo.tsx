"use client";

import { useState } from "react";

interface Props {
  ticker: string;
  size?: number;
  className?: string;
}

const LOGO_CDN = "https://financialmodelingprep.com/image-stock";

export function StockLogo({ ticker, size = 32, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`rounded-lg bg-primary/10 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span
          className="font-[var(--font-mono)] font-bold text-primary"
          style={{ fontSize: size * 0.3 }}
        >
          {ticker.slice(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <img
      src={`${LOGO_CDN}/${ticker.toUpperCase()}.png`}
      alt={ticker}
      width={size}
      height={size}
      className={`rounded-lg object-contain bg-white ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
