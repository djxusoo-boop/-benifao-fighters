CREATE TABLE `game_activity_hourly` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_utc` text NOT NULL,
	`hour_utc` integer NOT NULL,
	`event_type` text NOT NULL,
	`mode` text DEFAULT '' NOT NULL,
	`fighter` text DEFAULT '' NOT NULL,
	`outcome` text DEFAULT '' NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_activity_hourly_bucket_idx` ON `game_activity_hourly` (`day_utc`,`hour_utc`,`event_type`,`mode`,`fighter`,`outcome`);--> statement-breakpoint
CREATE INDEX `game_activity_day_event_idx` ON `game_activity_hourly` (`day_utc`,`event_type`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
