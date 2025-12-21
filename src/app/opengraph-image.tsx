import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "advent0 - LLM Battle Arena";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const fontData = await fetch(
    new URL("./fonts/DepartureMono/DepartureMono-Regular.otf", import.meta.url),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
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
            "radial-gradient(circle at 40% 20%, rgba(164, 48, 63, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(90, 26, 34, 0.4) 0%, transparent 50%)",
          fontFamily: "DepartureMono",
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
              fontSize: 18,
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
          advent0.crafter.run
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "DepartureMono",
          data: fontData,
          style: "normal",
        },
      ],
    },
  );
}
