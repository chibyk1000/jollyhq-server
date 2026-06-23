-- Drop all tables in dependency-safe order (children first, parents last)
-- Run this via psql or your DB client before running drizzle-kit push

-- Disable FK checks temporarily
SET session_replication_role = replica;

DROP TABLE IF EXISTS "message_reads" CASCADE;
DROP TABLE IF EXISTS "typing_status" CASCADE;
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "chat_members" CASCADE;
DROP TABLE IF EXISTS "chats" CASCADE;
DROP TABLE IF EXISTS "user_tickets" CASCADE;
DROP TABLE IF EXISTS "orders" CASCADE;
DROP TABLE IF EXISTS "event_discounts" CASCADE;
DROP TABLE IF EXISTS "event_tickets" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "event_planners" CASCADE;
DROP TABLE IF EXISTS "favorite_events" CASCADE;
DROP TABLE IF EXISTS "vendor_bookings" CASCADE;
DROP TABLE IF EXISTS "vendor_services" CASCADE;
DROP TABLE IF EXISTS "vendors" CASCADE;
DROP TABLE IF EXISTS "wallet_transactions" CASCADE;
DROP TABLE IF EXISTS "withdrawal_requests" CASCADE;
DROP TABLE IF EXISTS "wallets" CASCADE;
DROP TABLE IF EXISTS "user_settings" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "verification" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Drop custom enums
DROP TYPE IF EXISTS "wallet_owner_type" CASCADE;
DROP TYPE IF EXISTS "wallet_tx_type" CASCADE;
DROP TYPE IF EXISTS "wallet_tx_source" CASCADE;
DROP TYPE IF EXISTS "withdrawal_status" CASCADE;
DROP TYPE IF EXISTS "order_status" CASCADE;
DROP TYPE IF EXISTS "chat_direct_type" CASCADE;

-- Re-enable FK checks
SET session_replication_role = DEFAULT;
