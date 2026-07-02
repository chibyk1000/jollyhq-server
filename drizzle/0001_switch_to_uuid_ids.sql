ALTER TABLE "account" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "chat_members" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "chat_members" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "chat_members" ALTER COLUMN "chat_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "chat_members" ALTER COLUMN "profile_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "event_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "vendor_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event_discounts" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event_discounts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "event_discounts" ALTER COLUMN "event_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event_planners" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event_planners" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "event_planners" ALTER COLUMN "profile_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "planner_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event_tickets" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "event_tickets" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "event_tickets" ALTER COLUMN "event_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "favorite_events" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "favorite_events" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "favorite_events" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "favorite_events" ALTER COLUMN "event_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "chat_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "sender_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "message_reads" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "message_reads" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "message_reads" ALTER COLUMN "message_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "message_reads" ALTER COLUMN "profile_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "wallet_transactions" ALTER COLUMN "wallet_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "event_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "ticket_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ALTER COLUMN "wallet_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ALTER COLUMN "reviewed_by" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "vendor_services" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "vendor_services" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "vendor_services" ALTER COLUMN "vendor_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "vendor_bookings" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "vendor_bookings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "vendor_bookings" ALTER COLUMN "vendor_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "vendor_bookings" ALTER COLUMN "service_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "vendor_bookings" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "vendor_bookings" ALTER COLUMN "event_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "typing_status" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "typing_status" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "typing_status" ALTER COLUMN "chat_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "typing_status" ALTER COLUMN "profile_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_tickets" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_tickets" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user_tickets" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_tickets" ALTER COLUMN "ticket_id" SET DATA TYPE uuid;