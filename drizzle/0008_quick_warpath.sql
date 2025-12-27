CREATE TABLE "vendor_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"service_id" uuid,
	"user_id" uuid NOT NULL,
	"event_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"amount" integer NOT NULL,
	"scheduled_date" timestamp,
	"notes" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"payment_ref" varchar(255),
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp,
	"cancelled_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "vendor_bookings" ADD CONSTRAINT "vendor_bookings_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_bookings" ADD CONSTRAINT "vendor_bookings_service_id_vendor_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."vendor_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_bookings" ADD CONSTRAINT "vendor_bookings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_bookings" ADD CONSTRAINT "vendor_bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;