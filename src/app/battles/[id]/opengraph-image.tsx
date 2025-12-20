import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/db";
import type { Battle, Challenge } from "@/db/schema";
import { battles, challenges } from "@/db/schema";
import { MODELS } from "@/lib/models";

export const runtime = "edge";

export const alt = "Battle | advent0";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function getModelDisplayName(modelId: string): string {
  const model = MODELS.find((m) => m.copyString === modelId);
  return model?.displayName || modelId;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const fontData = await fetch(
    new URL(
      "../../fonts/DepartureMono/DepartureMono-Regular.otf",
      import.meta.url,
    ),
  ).then((res) => res.arrayBuffer());

  const { id } = await params;

  let battle: Battle | null = null;
  let challenge: Challenge | null = null;

  try {
    const battleResult = await db
      .select()
      .from(battles)
      .where(eq(battles.id, id))
      .limit(1);
    battle = battleResult[0] ?? null;

    if (battle) {
      const challengeResult = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, battle.challengeId))
        .limit(1);
      challenge = challengeResult[0] ?? null;
    }
  } catch (error) {
    console.error("Error fetching battle data:", error);
  }

  if (!battle) {
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
          fontFamily: "DepartureMono",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
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
            fontSize: 48,
            color: "#e5e5e5",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Battle Not Found
        </div>
      </div>,
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

  const modelAName = getModelDisplayName(battle.modelA);
  const modelBName = getModelDisplayName(battle.modelB);

  const statusColor =
    battle.status === "completed"
      ? "#05df72"
      : battle.status === "failed"
        ? "#fb2c36"
        : "#f8e71c";

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#841424",
        backgroundImage:
          "radial-gradient(circle at 40% 20%, rgba(164, 48, 63, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(90, 26, 34, 0.4) 0%, transparent 50%)",
        padding: 60,
        fontFamily: "DepartureMono",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#e5e5e5",
              fontSize: 28,
              fontWeight: "bold",
              color: "#841424",
            }}
          >
            A0
          </div>
          <div
            style={{
              fontSize: 24,
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
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(0,0,0,0.3)",
            padding: "8px 16px",
            border: "2px solid rgba(255,255,255,0.2)",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: statusColor,
            }}
          />
          <div
            style={{
              fontSize: 16,
              color: statusColor,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {battle.status}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 50,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.2)",
            padding: "32px 48px",
            border: "2px solid rgba(255,255,255,0.2)",
            minWidth: 280,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: "#e5e5e5",
              textTransform: "uppercase",
              textAlign: "center",
              maxWidth: 260,
              letterSpacing: "0.05em",
            }}
          >
            {modelAName}
          </div>
          {battle.modelASuccess !== null && (
            <div
              style={{
                marginTop: 16,
                fontSize: 20,
                color: battle.modelASuccess ? "#05df72" : "#fb2c36",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {battle.modelASuccess ? "Solved" : "Failed"}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: "bold",
              color: "#f8e71c",
              letterSpacing: "0.1em",
            }}
          >
            VS
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.2)",
            padding: "32px 48px",
            border: "2px solid rgba(255,255,255,0.2)",
            minWidth: 280,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: "#e5e5e5",
              textTransform: "uppercase",
              textAlign: "center",
              maxWidth: 260,
              letterSpacing: "0.05em",
            }}
          >
            {modelBName}
          </div>
          {battle.modelBSuccess !== null && (
            <div
              style={{
                marginTop: 16,
                fontSize: 20,
                color: battle.modelBSuccess ? "#05df72" : "#fb2c36",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {battle.modelBSuccess ? "Solved" : "Failed"}
            </div>
          )}
        </div>
      </div>

      {challenge && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            marginTop: 20,
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: "#f8e71c",
              fontWeight: "bold",
            }}
          >
            #{String(challenge.id).padStart(2, "0")}
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#e5e5e5",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {challenge.title}
          </div>
          <div
            style={{
              fontSize: 14,
              color:
                challenge.difficulty === "easy"
                  ? "#a2f176"
                  : challenge.difficulty === "medium"
                    ? "#f8e71c"
                    : "#fb2c36",
              textTransform: "uppercase",
              padding: "4px 8px",
              backgroundColor: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.2)",
              letterSpacing: "0.1em",
            }}
          >
            {challenge.difficulty}
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 30,
          right: 60,
          fontSize: 14,
          color: "#f8e71c",
          letterSpacing: "0.05em",
        }}
      >
        advent0.vercel.app
      </div>
    </div>,
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
