ALTER TABLE "user_preferences" ALTER COLUMN "default_platform" SET DEFAULT 'Instagram';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "points_reset_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "user" SET "points_reset_at" = "created_at";