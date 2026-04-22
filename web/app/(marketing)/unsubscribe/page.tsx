"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, AlertCircle, Loader2 } from "lucide-react";

// Public one-click unsubscribe landing. The email footer links here
// with ?uid=X&sig=Y; we POST those through to the backend which
// validates the HMAC and flips all three Receive* booleans to false.
//
// Missing params → show a "use the link from your email" state rather
// than a confusing error, since bookmarked /unsubscribe URLs without
// params are a real failure mode.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5185/api/v1";

export default function UnsubscribePage() {
  const params = useSearchParams();
  const uid = params?.get("uid");
  const sig = params?.get("sig");

  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!uid || !sig) {
      setState("idle");
      return;
    }
    setState("loading");
    const url = `${API_BASE}/auth/unsubscribe?uid=${encodeURIComponent(uid)}&sig=${encodeURIComponent(sig)}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: { success: boolean; message: string }) => {
        setMessage(data.message ?? "");
        setState(data.success ? "success" : "error");
      })
      .catch(() => {
        setState("error");
        setMessage("Couldn't reach the unsubscribe service. Please try again later.");
      });
  }, [uid, sig]);

  return (
    <main className="max-w-[640px] mx-auto px-4 sm:px-6 py-20">
      <div className="rounded-[12px] border border-ink-200 bg-ink-0 p-10 text-center">
        {state === "idle" && !uid && (
          <>
            <AlertCircle className="h-10 w-10 text-ink-400 mx-auto mb-4" strokeWidth={1.5} />
            <h1 className="font-[var(--font-heading)] text-[22px] font-semibold text-ink-900">
              Use the unsubscribe link from your email
            </h1>
            <p className="mt-3 text-[14px] leading-[22px] text-ink-600 max-w-[440px] mx-auto">
              We couldn&apos;t identify you from this URL. Open the most recent
              Fintrest email and click the &ldquo;Unsubscribe&rdquo; link at
              the bottom — that link carries a signed token so we can find
              your account.
            </p>
            <div className="mt-6 pt-6 border-t border-ink-100">
              <p className="text-[12px] text-ink-500 mb-2">Or manage preferences when signed in:</p>
              <Link href="/settings" className="text-[13px] font-semibold text-forest hover:underline">
                Open settings →
              </Link>
            </div>
          </>
        )}

        {state === "loading" && (
          <>
            <Loader2 className="h-10 w-10 text-forest mx-auto mb-4 animate-spin" strokeWidth={1.5} />
            <h1 className="font-[var(--font-heading)] text-[22px] font-semibold text-ink-900">
              Unsubscribing…
            </h1>
          </>
        )}

        {state === "success" && (
          <>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-forest-light mb-4">
              <Check className="h-5 w-5 text-forest" strokeWidth={2} />
            </div>
            <h1 className="font-[var(--font-heading)] text-[22px] font-semibold text-ink-900">
              Unsubscribed
            </h1>
            <p className="mt-3 text-[14px] leading-[22px] text-ink-600 max-w-[440px] mx-auto">
              {message || "You&apos;ve been removed from all Fintrest email lists."}
            </p>
            <p className="mt-2 text-[12px] text-ink-500">
              Changed your mind? You can re-enable any email type anytime from{" "}
              <Link href="/settings" className="text-forest hover:underline">
                your settings
              </Link>
              .
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <AlertCircle className="h-10 w-10 text-warn mx-auto mb-4" strokeWidth={1.5} />
            <h1 className="font-[var(--font-heading)] text-[22px] font-semibold text-ink-900">
              Couldn&apos;t unsubscribe
            </h1>
            <p className="mt-3 text-[14px] leading-[22px] text-ink-600 max-w-[440px] mx-auto">
              {message || "This link is invalid or expired."}
            </p>
            <p className="mt-4 text-[12px] text-ink-500">
              You can always manage email preferences when signed in —{" "}
              <Link href="/settings" className="text-forest hover:underline">
                open settings
              </Link>
              .
            </p>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] text-ink-400">
        Unsubscribes are honoured immediately. You&apos;ll stop receiving all
        Fintrest emails, including transactional alerts you set up yourself.
      </p>
    </main>
  );
}
