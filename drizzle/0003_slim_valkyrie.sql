CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'pending',
	"reference" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_planner_id" uuid NOT NULL,
	"balance" numeric(14, 2),
	"currency" varchar(10) DEFAULT 'NGN',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_event_planner_id_event_planners_id_fk" FOREIGN KEY ("event_planner_id") REFERENCES "public"."event_planners"("id") ON DELETE cascade ON UPDATE no action;