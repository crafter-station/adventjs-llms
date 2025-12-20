import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/db";
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
  const { id } = await params;

  const [battle] = await db
    .select()
    .from(battles)
    .where(eq(battles.id, id))
    .limit(1);

  if (!battle) {
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#841424",
          fontSize: 48,
          color: "#e5e5e5",
        }}
      >
        Battle Not Found
      </div>,
      { ...size },
    );
  }

  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, battle.challengeId))
    .limit(1);

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
          "radial-gradient(circle at 25% 25%, rgba(164, 48, 63, 0.4) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(132, 20, 36, 0.3) 0%, transparent 50%)",
        padding: 60,
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
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#e5e5e5",
              fontSize: 32,
              fontWeight: "bold",
              color: "#841424",
              fontFamily: "monospace",
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
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: statusColor,
            }}
          />
          <div
            style={{
              fontSize: 18,
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
          gap: 60,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.2)",
            padding: "40px 60px",
            border: "2px solid rgba(255,255,255,0.2)",
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: "bold",
              color: "#e5e5e5",
              textTransform: "uppercase",
              textAlign: "center",
              maxWidth: 300,
            }}
          >
            {modelAName}
          </div>
          {battle.modelASuccess !== null && (
            <div
              style={{
                marginTop: 16,
                fontSize: 24,
                color: battle.modelASuccess ? "#05df72" : "#fb2c36",
                textTransform: "uppercase",
              }}
            >
              {battle.modelASuccess ? "Solved" : "Failed"}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 48,
            fontWeight: "bold",
            color: "#f8e71c",
          }}
        >
          VS
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.2)",
            padding: "40px 60px",
            border: "2px solid rgba(255,255,255,0.2)",
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: "bold",
              color: "#e5e5e5",
              textTransform: "uppercase",
              textAlign: "center",
              maxWidth: 300,
            }}
          >
            {modelBName}
          </div>
          {battle.modelBSuccess !== null && (
            <div
              style={{
                marginTop: 16,
                fontSize: 24,
                color: battle.modelBSuccess ? "#05df72" : "#fb2c36",
                textTransform: "uppercase",
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
              fontSize: 20,
              color: "#f8e71c",
              fontWeight: "bold",
            }}
          >
            #{String(challenge.id).padStart(2, "0")}
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#e5e5e5",
              textTransform: "uppercase",
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
            }}
          >
            {challenge.difficulty}
          </div>
        </div>
      )}
    </div>,
    { ...size },
  );
}
