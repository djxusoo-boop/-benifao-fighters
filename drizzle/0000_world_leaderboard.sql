CREATE TABLE `leaderboard_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_name` text NOT NULL,
	`mode` text NOT NULL,
	`score` integer NOT NULL,
	`fighter` text DEFAULT 'maletilla' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leaderboard_mode_score_idx` ON `leaderboard_scores` (`mode`,`score`);
