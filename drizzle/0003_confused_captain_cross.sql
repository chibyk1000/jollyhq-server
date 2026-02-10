ALTER TABLE "user" ADD COLUMN "display_username" varchar(100);--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_display_username_unique" UNIQUE("display_username");