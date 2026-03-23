CREATE TYPE "public"."wallet_owner_type" AS ENUM('event_planner', 'vendor');--> statement-breakpoint
CREATE TYPE "public"."wallet_tx_source" AS ENUM('ticket_sale', 'vendor_payment', 'withdrawal_payout', 'refund_reversal');--> statement-breakpoint
CREATE TYPE "public"."wallet_tx_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'paid', 'rejected');--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"type" "wallet_tx_type" NOT NULL,
	"source" "wallet_tx_source" NOT NULL,
	"amount" real NOT NULL,
	"balance_before" real NOT NULL,
	"balance_after" real NOT NULL,
	"reference" varchar NOT NULL,
	"narration" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount" real NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"bank_code" varchar(20) NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"account_name" varchar(150) NOT NULL,
	"payout_reference" varchar,
	"paid_at" timestamp,
	"rejection_reason" varchar(255),
	"reviewed_at" timestamp,
	"reviewed_by" uuid,
	"narration" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "transactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "transactions" CASCADE;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "currency" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "owner_type" "wallet_owner_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_user_id_owner_type_unique" ON "wallets" USING btree ("user_id","owner_type");--> statement-breakpoint
ALTER TABLE "wallets" DROP COLUMN "account_id";