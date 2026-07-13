import { ImageResponse } from "next/og"

export const alt = "APAS · Clinical Overwatch"
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(99, 102, 241, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#a5b4fc",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ color: "#f8fafc", fontSize: 48, fontWeight: 700 }}>
            APAS
          </div>
        </div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: 32,
            fontWeight: 500,
          }}
        >
          Clinical Overwatch
        </div>
      </div>
    ),
    { ...size },
  )
}
