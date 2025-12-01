CREATE TABLE "event_discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planner_id" uuid NOT NULL,
	"image_url" text,
	"event_type" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"event_date" timestamp NOT NULL,
	"event_time" timestamp NOT NULL,
	"location" varchar(255),
	"description" text,
	"created_at" timestamp DEFAULT NOW(),
	"updated_at" timestamp DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE "event_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_free" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "event_discounts" ADD CONSTRAINT "event_discounts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_planner_id_event_planners_id_fk" FOREIGN KEY ("planner_id") REFERENCES "public"."event_planners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tickets" ADD CONSTRAINT "event_tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;