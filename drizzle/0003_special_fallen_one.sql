ALTER TABLE "wallets" RENAME COLUMN "owner_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" DROP COLUMN "owner_type";