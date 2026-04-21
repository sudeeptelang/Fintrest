import { ImageResponse } from "next/og";

export const alt = "Fintrest.ai — Every stock idea, stress-tested before the open.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#FAFBFC",
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              backgroundColor: "#0F4F3A",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            F
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#101828", letterSpacing: "-0.01em" }}>
            Fintrest<span style={{ color: "#667085", fontWeight: 400 }}>.ai</span>
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              backgroundColor: "#E8F1EC",
              borderRadius: 999,
              alignSelf: "flex-start",
              border: "1px solid rgba(15, 79, 58, 0.2)",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: "#0F4F3A" }} />
            <span style={{ fontSize: 16, color: "#0A3528", fontWeight: 500 }}>
              Research layer · Updated every morning before the open
            </span>
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#060C1A",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: 1040,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            <span>Every stock idea,&nbsp;</span>
            <span style={{ color: "#0F4F3A" }}>stress-tested before the open.</span>
          </div>
          <div style={{ fontSize: 22, color: "#475467", lineHeight: 1.4, maxWidth: 880, marginTop: 8 }}>
            Explainable signals, 7-factor scoring, a public audit log.
            Research, not recommendations.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 20,
            borderTop: "1px solid #E4E7EC",
          }}
        >
          <span style={{ fontSize: 16, color: "#667085" }}>fintrest.ai</span>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: 16, color: "#667085" }}>Explainable</span>
            <span style={{ fontSize: 16, color: "#D0D5DD" }}>·</span>
            <span style={{ fontSize: 16, color: "#667085" }}>7-factor</span>
            <span style={{ fontSize: 16, color: "#D0D5DD" }}>·</span>
            <span style={{ fontSize: 16, color: "#667085" }}>Audit log</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
