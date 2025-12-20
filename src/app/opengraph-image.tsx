import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "advent0 - LLM Battle Arena";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#841424",
        backgroundImage:
          "radial-gradient(circle at 25% 25%, rgba(164, 48, 63, 0.4) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(132, 20, 36, 0.3) 0%, transparent 50%)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#e5e5e5",
            fontSize: 64,
            fontWeight: "bold",
            color: "#841424",
            fontFamily: "monospace",
          }}
        >
          A0
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: "bold",
            color: "#f8e71c",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          advent0
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#e5e5e5",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          LLM Battle Arena
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 40,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 20,
            color: "#e5e5e5",
            opacity: 0.7,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Real-time AI coding battles on AdventJS challenges
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 40,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 16,
          color: "#f8e71c",
          letterSpacing: "0.05em",
        }}
      >
        crafterstation.com
      </div>
    </div>,
    {
      ...size,
    },
  );
}
