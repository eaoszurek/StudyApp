import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px",
          background:
            "linear-gradient(135deg, rgb(2, 132, 199) 0%, rgb(30, 64, 175) 60%, rgb(13, 148, 136) 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, opacity: 0.92, marginBottom: 14 }}>PeakPrep</div>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
          Smarter SAT Practice,
          <br />
          Faster Score Gains
        </div>
        <div style={{ fontSize: 28, opacity: 0.95 }}>
          Adaptive lessons, checkpoint tests, and strategy-first explanations.
        </div>
      </div>
    ),
    size
  );
}

