ALTER TABLE "vendors" RENAME COLUMN "profession" TO "name";--> statement-breakpoint
ALTER TABLE "vendors" RENAME COLUMN "bio" TO "price_range";--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "email" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "phone" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "vendors" DROP COLUMN "cover_image";--> statement-breakpoint
ALTER TABLE "vendors" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "vendors" DROP COLUMN "min_price";--> statement-breakpoint
ALTER TABLE "vendors" DROP COLUMN "max_price";--> statement-breakpoint
ALTER TABLE "vendors" DROP COLUMN "country";