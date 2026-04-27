"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Equal, Sparkles } from "lucide-react";
import { useAnalystRevisions } from "@/lib/hooks";
import type { AnalystRevisionEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

// Analyst-revisions card — 30-day window of upgrade / downgrade / reiterate
// / initiate events. Three visual sections:
//   1. Header — title + inline count strip + net revisions number
//   2. Per-event list — firm logo + name + action chip + grade transition
//   3. Source caption
//
// The previous "MIXED net 0" sparkles card was dropped because it duplicated
// the count strip below it; the inline header tells the same story in one
// row instead of three.

export function AnalystRevisionsCard({ ticker, className }: { ticker: string; className?: string }) {
  const { data } = useAnalystRevisions(ticker, 30);
  if (!data || data.totalEvents === 0) return null;

  const { upgrades, downgrades, reiterations, initializations, netRevisions, events, windowDays } = data;

  const netTone =
    netRevisions > 0 ? "text-up" :
    netRevisions < 0 ? "text-down" :
    "text-ink-500";

  return (
    <div className={cn("rounded-[10px] border border-ink-200 bg-ink-0 p-4 md:p-5", className)}>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h3 className="font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
          Analyst revisions · last {windowDays} days
        </h3>
        <div className="flex items-center gap-3 font-[var(--font-mono)] text-[12px]">
          <CountInline kind="up" value={upgrades} />
          <CountInline kind="down" value={downgrades} />
          <CountInline kind="reiterate" value={reiterations} />
          <CountInline kind="initiate" value={initializations} />
          <span className="text-ink-200">|</span>
          <span className={cn("font-semibold", netTone)}>
            net {netRevisions > 0 ? "+" : ""}{netRevisions}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-ink-100">
        {events.slice(0, 8).map((e, i) => (
          <EventRow key={i} event={e} />
        ))}
      </ul>

      <p className="mt-3 text-[10px] text-ink-500 leading-tight">
        Source: FMP <code className="font-[var(--font-mono)]">/grades</code>. Net revisions feed the News &amp; Catalyst factor.
      </p>
    </div>
  );
}

function CountInline({
  kind,
  value,
}: {
  kind: "up" | "down" | "reiterate" | "initiate";
  value: number;
}) {
  const { Icon, activeTone } =
    kind === "up" ? { Icon: ArrowUp, activeTone: "text-up" } :
    kind === "down" ? { Icon: ArrowDown, activeTone: "text-down" } :
    kind === "reiterate" ? { Icon: Equal, activeTone: "text-ink-700" } :
    { Icon: Sparkles, activeTone: "text-ink-700" };
  return (
    <span className={cn("inline-flex items-center gap-1", value > 0 ? activeTone : "text-ink-300")}>
      <Icon className="h-3 w-3" strokeWidth={2.2} />
      <span className="font-medium">{value}</span>
    </span>
  );
}

function EventRow({ event }: { event: AnalystRevisionEvent }) {
  const action = event.action ?? "";
  const { tone, label, chipBg } =
    action === "up"
      ? { tone: "text-up", label: "Upgrade", chipBg: "bg-up/10" }
      : action === "down"
      ? { tone: "text-down", label: "Downgrade", chipBg: "bg-down/10" }
      : action === "initialize"
      ? { tone: "text-ink-700", label: "Initiate", chipBg: "bg-ink-100" }
      : action === "target"
      ? { tone: "text-ink-700", label: "PT change", chipBg: "bg-ink-100" }
      : { tone: "text-ink-500", label: "Reiterate", chipBg: "bg-ink-50" };

  const firm = event.gradingCompany ?? "Analyst";

  // For reiterates where prev and new grade are identical, show the grade
  // once. The "Outperform → Outperform" arrow is just visual noise.
  const sameGrade =
    event.previousGrade &&
    event.newGrade &&
    event.previousGrade.toLowerCase() === event.newGrade.toLowerCase();

  return (
    <li className="py-3 flex items-start gap-3">
      <AnalystLogo firm={firm} size={28} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-[var(--font-sans)] text-[13px] text-ink-900 font-medium">
            {firm}
          </span>
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-[3px]",
              chipBg,
              tone,
            )}
          >
            {label}
          </span>
        </div>
        <div className="font-[var(--font-mono)] text-[11px] text-ink-500 mt-0.5">
          {formatDate(event.date)}
          {event.newGrade && (
            <>
              {" · "}
              {sameGrade ? (
                <span className="text-ink-800 font-medium">{event.newGrade}</span>
              ) : event.previousGrade ? (
                <>
                  <span className="text-ink-500">{event.previousGrade}</span>
                  {" → "}
                  <span className="text-ink-800 font-medium">{event.newGrade}</span>
                </>
              ) : (
                <span className="text-ink-800 font-medium">{event.newGrade}</span>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function formatDate(d: string): string {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

// Curated firm-name → public domain map for the major sell-side coverage
// universe. We hit logo.dev with the domain and fall back to a letter
// avatar if the firm isn't on the list (or the image 404s). This avoids
// shipping a generic "=" icon for every analyst.
const FIRM_TO_DOMAIN: Record<string, string> = {
  "jpmorgan": "jpmorgan.com",
  "jp morgan": "jpmorgan.com",
  "morgan stanley": "morganstanley.com",
  "goldman sachs": "goldmansachs.com",
  "goldman": "goldmansachs.com",
  "wells fargo": "wellsfargo.com",
  "bank of america": "bankofamerica.com",
  "bofa": "bankofamerica.com",
  "bofa global research": "bankofamerica.com",
  "merrill lynch": "ml.com",
  "citigroup": "citigroup.com",
  "citi": "citigroup.com",
  "mizuho": "mizuhogroup.com",
  "barclays": "barclays.com",
  "deutsche bank": "db.com",
  "ubs": "ubs.com",
  "credit suisse": "credit-suisse.com",
  "bmo": "bmo.com",
  "rbc": "rbc.com",
  "jefferies": "jefferies.com",
  "piper sandler": "pipersandler.com",
  "stifel": "stifel.com",
  "raymond james": "raymondjames.com",
  "truist": "truist.com",
  "wedbush": "wedbush.com",
  "oppenheimer": "oppenheimer.com",
  "cowen": "cowen.com",
  "td cowen": "tdcowen.com",
  "evercore": "evercore.com",
  "evercore isi": "evercore.com",
  "btig": "btig.com",
  "berenberg": "berenberg.com",
  "bernstein": "bernstein.com",
  "sanford bernstein": "bernstein.com",
  "hsbc": "hsbc.com",
  "macquarie": "macquarie.com",
  "nomura": "nomura.com",
  "needham": "needhamco.com",
  "scotiabank": "scotiabank.com",
  "atlantic equities": "atlanticequities.com",
  "argus": "argusresearch.com",
  "loop capital": "loopcapital.com",
  "guggenheim": "guggenheimpartners.com",
  "rosenblatt": "rblt.com",
  "susquehanna": "sig.com",
  "keybanc": "keybanc.com",
  "key banc": "keybanc.com",
  "bairD": "bairD.com",
  "robert w baird": "rwbaird.com",
  "baird": "rwbaird.com",
  "benchmark": "thebenchmarkgroup.com",
  "rosenblatt securities": "rblt.com",
  "morningstar": "morningstar.com",
  "zacks": "zacks.com",
};

function normalizeFirm(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[.,]/g, "")
    .replace(/\b(securities|capital markets?|capital|partners|llc|llp|inc|group|advisors?|research|company|co|the)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function logoUrl(firm: string): string | null {
  const domain = FIRM_TO_DOMAIN[normalizeFirm(firm)];
  if (!domain) return null;
  return `https://img.logo.dev/${domain}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ&size=96`;
}

const TILE_COLORS = [
  "#1E3A5F", "#6B3B5E", "#2F7A7A", "#8A5A3B",
  "#4A5A6E", "#5A6B3E", "#B8862F", "#6B5443",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function AnalystLogo({ firm, size = 28 }: { firm: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const url = logoUrl(firm);
  const initials = (firm.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase() || "?";
  const bg = TILE_COLORS[hashStr(firm.toLowerCase()) % TILE_COLORS.length];

  if (errored || !url) {
    return (
      <div
        className="inline-grid place-items-center text-ink-0 font-semibold rounded-md flex-shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: bg,
          fontSize: Math.round(size * 0.36),
        }}
        aria-label={firm}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${firm} logo`}
      onError={() => setErrored(true)}
      className="inline-block object-contain rounded-md flex-shrink-0 bg-ink-50 border border-ink-100"
      style={{ width: size, height: size }}
    />
  );
}
