import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const leaderboardScores = sqliteTable("leaderboard_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerName: text("player_name").notNull(),
  mode: text("mode").notNull(),
  score: integer("score").notNull(),
  fighter: text("fighter").notNull().default("maletilla"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("leaderboard_mode_score_idx").on(table.mode, table.score),
]);
