CREATE TYPE "public"."chat_direct_type" AS ENUM('user_vendor', 'vendor_planner');--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "direct_type" "chat_direct_type";--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_has_context" CHECK ("chats"."event_id" IS NOT NULL OR "chats"."vendor_id" IS NOT NULL OR "chats"."direct_type" IS NOT NULL);