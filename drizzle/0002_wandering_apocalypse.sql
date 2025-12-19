CREATE TABLE "vendor_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(255) NOT NULL,
	"price" integer NOT NULL,
	"price_type" varchar(50) DEFAULT 'fixed',
	"duration_minutes" integer,
	"delivery_time" varchar(120),
	"image" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profession" varchar(255) NOT NULL,
	"category" varchar(255) NOT NULL,
	"bio" text,
	"image" varchar(255) NOT NULL,
	"cover_image" varchar(255),
	"price" varchar(255) NOT NULL,
	"min_price" integer,
	"max_price" integer,
	"location" varchar(255) NOT NULL,
	"city" varchar(120),
	"country" varchar(120),
	"rating" real DEFAULT 0 NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"response_time" varchar(255) NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "wallets" RENAME COLUMN "event_planner_id" TO "owner_id";--> statement-breakpoint
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_event_planner_id_event_planners_id_fk";
--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "balance" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "owner_type" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_services" ADD CONSTRAINT "vendor_services_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;