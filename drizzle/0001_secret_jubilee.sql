CREATE TABLE "event_planners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar(36) NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"business_email" varchar(255),
	"business_phone" varchar(20),
	"website" varchar(255),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"postal_code" varchar(50),
	"bvn" varchar(20),
	"nin" varchar(20),
	"logo_url" varchar(500),
	"id_document_url" varchar(500),
	"business_document_url" varchar(500),
	"instagram" varchar(255),
	"facebook" varchar(255),
	"twitter" varchar(255),
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "role" text[] DEFAULT '{"user"}';--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "current_role" varchar(50) DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "event_planners" ADD CONSTRAINT "event_planners_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;