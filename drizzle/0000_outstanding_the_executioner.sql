CREATE TABLE "profiles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"phone" varchar(20),
	"avatar_url" varchar,
	"agreed_to_terms" boolean DEFAULT false NOT NULL,
	"google_id" text,
	"facebook_id" text,
	"instagram_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "profiles_username_unique" UNIQUE("username")
);
