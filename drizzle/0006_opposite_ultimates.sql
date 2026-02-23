CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"ticket_id" uuid NOT NULL,
	"quantity" numeric DEFAULT '1' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'NGN',
	"order_reference" varchar(150) NOT NULL,
	"transaction_id" varchar(150),
	"payment_method" varchar(50),
	"status" "order_status" DEFAULT 'PENDING',
	"is_paid" boolean DEFAULT false,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT NOW(),
	"updated_at" timestamp,
	CONSTRAINT "orders_order_reference_unique" UNIQUE("order_reference")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_ticket_id_event_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."event_tickets"("id") ON DELETE cascade ON UPDATE no action;