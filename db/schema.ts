import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const leaderboardScores = sqliteTable("leaderboard_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerName: text("player_name").notNull(),
  nameKey: text("name_key"),
  submissionId: text("submission_id"),
  mode: text("mode").notNull(),
  score: integer("score").notNull(),
  fighter: text("fighter").notNull().default("maletilla"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("leaderboard_mode_score_idx").on(table.mode, table.score),
  uniqueIndex("leaderboard_submission_idx").on(table.submissionId),
]);

// Deliberately aggregate-only activity. There is no IP, player name, account,
// user-agent, cookie id or other visitor identifier in this table.
export const gameActivityHourly = sqliteTable("game_activity_hourly", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  day: text("day_utc").notNull(),
  hour: integer("hour_utc").notNull(),
  eventType: text("event_type").notNull(),
  mode: text("mode").notNull().default(""),
  fighter: text("fighter").notNull().default(""),
  outcome: text("outcome").notNull().default(""),
  count: integer("count").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("game_activity_hourly_bucket_idx").on(table.day, table.hour, table.eventType, table.mode, table.fighter, table.outcome),
  index("game_activity_day_event_idx").on(table.day, table.eventType),
]);

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// Short-lived anonymous presence. No IP, names or browsing history.
export const liveSessions = sqliteTable("live_sessions", {
  token: text("token").primaryKey(),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [index("live_sessions_expiry_idx").on(table.expiresAt)]);
