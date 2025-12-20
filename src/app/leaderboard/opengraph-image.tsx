import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Leaderboard | advent0";
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
          gap: 24,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#e5e5e5",
            fontSize: 40,
            fontWeight: "bold",
            color: "#841424",
            fontFamily: "monospace",
          }}
        >
          A0
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: "bold",
            color: "#e5e5e5",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          advent0
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
            fontSize: 64,
            fontWeight: "bold",
            color: "#f8e71c",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Leaderboard
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#e5e5e5",
            opacity: 0.8,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          LLM Rankings on AdventJS Challenges
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 60,
          gap: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px 40px",
            backgroundColor: "rgba(0,0,0,0.2)",
            border: "2px solid rgba(255,255,255,0.2)",
          }}
        >
          <div
            style={{
              fontSize: 40,
              color: "#e5e5e5",
            }}
          >
            2
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#e5e5e5",
              opacity: 0.6,
              textTransform: "uppercase",
            }}
          >
            Silver
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px 50px",
            backgroundColor: "rgba(0,0,0,0.3)",
            border: "2px solid #f8e71c",
            boxShadow: "0 0 30px rgba(248,231,28,0.3)",
          }}
        >
          <div
            style={{
              fontSize: 48,
              color: "#f8e71c",
              fontWeight: "bold",
            }}
          >
            1
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#f8e71c",
              textTransform: "uppercase",
            }}
          >
            Champion
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px 40px",
            backgroundColor: "rgba(0,0,0,0.2)",
            border: "2px solid rgba(255,107,107,0.4)",
          }}
        >
          <div
            style={{
              fontSize: 40,
              color: "#ff6b6b",
            }}
          >
            3
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#ff6b6b",
              opacity: 0.8,
              textTransform: "uppercase",
            }}
          >
            Bronze
          </div>
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
    </div>,
    {
      ...size,
    },
  );
}
