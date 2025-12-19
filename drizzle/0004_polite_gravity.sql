ALTER TABLE "wallets" RENAME COLUMN "user_id" TO "owner_id";--> statement-breakpoint
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_user_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "owner_type" varchar(50) NOT NULL;