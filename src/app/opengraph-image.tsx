import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
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
            "linear-gradient(135deg, rgb(14, 116, 144) 0%, rgb(49, 46, 129) 60%, rgb(15, 118, 110) 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.9, marginBottom: 16 }}>PeakPrep</div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, marginBottom: 22 }}>
          AI SAT Prep That
          <br />
          Feels Personalized
        </div>
        <div style={{ fontSize: 30, opacity: 0.95 }}>
          Practice tests, flashcards, and a study plan built for your goal score.
        </div>
      </div>
    ),
    size
  );
}

