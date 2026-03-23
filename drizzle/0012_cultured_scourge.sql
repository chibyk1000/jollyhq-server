-- 1. Set default (for future inserts)
ALTER TABLE "wallets"
ALTER COLUMN "owner_type" SET DEFAULT 'event_planner';

-- 2. Fill existing NULL rows
UPDATE "wallets"
SET "owner_type" = 'event_planner'
WHERE "owner_type" IS NULL;

-- 3. Enforce NOT NULL
ALTER TABLE "wallets"
ALTER COLUMN "owner_type" SET NOT NULL;