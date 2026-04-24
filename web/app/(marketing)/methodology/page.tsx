import { redirect } from "next/navigation";

// /methodology is removed from public surfaces for phase 1 — we don't
// reveal scoring internals pre-launch (2026-04-24 decision). Route
// redirects to the audit log, which is the trust surface users should
// land on instead. Restore the full methodology page when the scoring
// doc is ready for public consumption.
export default function MethodologyRedirect() {
  redirect("/audit");
}
