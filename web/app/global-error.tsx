"use client";

// Root-level error boundary — the ONLY place in the App Router tree
// that's allowed to render <html> and <body> tags, because it replaces
// the root layout entirely when a catastrophic error occurs (including
// errors in the root layout itself).
//
// For regular route-segment errors, Next.js uses app/error.tsx, which
// renders inside the root layout and must NOT include html/body.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#FAFBFC",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            border: "1px solid #E4E7EC",
            borderRadius: 12,
            background: "#FFFFFF",
            padding: 40,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px", color: "#101828" }}>
            Fintrest is having trouble loading
          </h1>
          <p style={{ fontSize: 14, color: "#475467", margin: "0 auto 24px", maxWidth: 420 }}>
            Something went wrong before the page could render. Reloading
            usually fixes it — if not, email support@fintrest.ai.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#98A2B3", fontFamily: "monospace", margin: "0 0 16px" }}>
              Error ref: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#1E63B8",
              color: "#FFFFFF",
              border: "none",
              padding: "10px 20px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
