ALTER TABLE `leaderboard_scores` ADD `name_key` text;--> statement-breakpoint
ALTER TABLE `leaderboard_scores` ADD `submission_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `leaderboard_submission_idx` ON `leaderboard_scores` (`submission_id`);