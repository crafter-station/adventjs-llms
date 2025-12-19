import {
  boolean,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const challenges = pgTable("challenges", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  difficulty: text("difficulty", {
    enum: ["easy", "medium", "hard"],
  }).notNull(),
  description: text("description").notNull(),
  functionSignature: text("function_signature").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;

export const battles = pgTable("battles", {
  id: uuid("id").defaultRandom().primaryKey(),
  triggerRunId: text("trigger_run_id").notNull().unique(),
  triggerPublicToken: text("trigger_public_token").notNull(),
  modelA: text("model_a").notNull(),
  modelB: text("model_b").notNull(),
  challengeId: integer("challenge_id").notNull(),

  modelASuccess: boolean("model_a_success"),
  modelBSuccess: boolean("model_b_success"),

  modelAExecutionCount: integer("model_a_execution_count"),
  modelBExecutionCount: integer("model_b_execution_count"),

  modelATimeToSolution: integer("model_a_time_to_solution"),
  modelBTimeToSolution: integer("model_b_time_to_solution"),

  modelAInputTokens: integer("model_a_input_tokens"),
  modelAOutputTokens: integer("model_a_output_tokens"),
  modelBInputTokens: integer("model_b_input_tokens"),
  modelBOutputTokens: integer("model_b_output_tokens"),

  modelACost: real("model_a_cost"),
  modelBCost: real("model_b_cost"),

  modelASolution: text("model_a_solution"),
  modelBSolution: text("model_b_solution"),
  modelAError: text("model_a_error"),
  modelBError: text("model_b_error"),

  status: text("status", { enum: ["pending", "completed", "failed"] })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type Battle = typeof battles.$inferSelect;
export type NewBattle = typeof battles.$inferInsert;
