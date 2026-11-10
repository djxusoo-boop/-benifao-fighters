CREATE TABLE `live_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `live_sessions_expiry_idx` ON `live_sessions` (`expires_at`);