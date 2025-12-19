import { runs } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { battles } from "@/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [battle] = await db
    .select()
    .from(battles)
    .where(eq(battles.id, id))
    .limit(1);

  if (!battle) {
    return Response.json({ error: "Battle not found" }, { status: 404 });
  }

  if (battle.status === "pending") {
    const run = await runs.retrieve(battle.triggerRunId);

    if (run.status === "COMPLETED" && run.output) {
      const output = run.output as {
        success: boolean;
        modelA: {
          success: boolean;
          executionCount: number;
          solution?: string;
          error?: string;
        };
        modelB: {
          success: boolean;
          executionCount: number;
          solution?: string;
          error?: string;
        };
      };

      const [updatedBattle] = await db
        .update(battles)
        .set({
          status: "completed",
          modelASuccess: output.modelA.success,
          modelBSuccess: output.modelB.success,
          modelAExecutionCount: output.modelA.executionCount,
          modelBExecutionCount: output.modelB.executionCount,
          modelASolution: output.modelA.solution,
          modelBSolution: output.modelB.solution,
          modelAError: output.modelA.error,
          modelBError: output.modelB.error,
          completedAt: new Date(),
        })
        .where(eq(battles.id, id))
        .returning();

      return Response.json({ battle: updatedBattle });
    }

    if (
      run.status === "FAILED" ||
      run.status === "CRASHED" ||
      run.status === "SYSTEM_FAILURE"
    ) {
      const [updatedBattle] = await db
        .update(battles)
        .set({
          status: "failed",
          completedAt: new Date(),
        })
        .where(eq(battles.id, id))
        .returning();

      return Response.json({ battle: updatedBattle });
    }
  }

  return Response.json({ battle });
}
