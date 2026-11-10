CREATE TABLE `online_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host_token` text NOT NULL,
	`guest_token` text,
	`offer` text NOT NULL,
	`answer` text,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `online_room_host_idx` ON `online_rooms` (`host_token`);--> statement-breakpoint
CREATE INDEX `online_room_expiry_idx` ON `online_rooms` (`expires_at`);