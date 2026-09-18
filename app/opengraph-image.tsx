import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "VO Biz Suite — voice actor CRM and business platform"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #1a1530 0%, #2a1f4a 50%, #1e3a2f 100%)",
          padding: "64px",
          color: "#f4f2f8",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#6d5cff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            VO
          </div>
          VO Biz Suite
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: 980,
            }}
          >
            Build your voiceover career like a business
          </div>
          <div style={{ fontSize: 28, color: "#c9c3d9", maxWidth: 900, lineHeight: 1.35 }}>
            Auditions, clients, invoices, and AI outreach — one CRM built for voice actors.
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#9b93b0" }}>vobizsuite.io</div>
      </div>
    ),
    { ...size }
  )
}
