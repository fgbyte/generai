CREATE TABLE "instagram_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ig_user_id" text NOT NULL,
	"ig_username" varchar(255),
	"fb_page_id" text NOT NULL,
	"fb_page_name" varchar(255),
	"page_access_token" text NOT NULL,
	"token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instagram_publish_log" (
	"id" text PRIMARY KEY NOT NULL,
	"instagram_account_id" text NOT NULL,
	"container_id" text,
	"media_id" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"error_code" text,
	"error_subcode" text,
	"error_message" text,
	"media_type" varchar(50) NOT NULL,
	"image_url" text,
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD CONSTRAINT "instagram_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_publish_log" ADD CONSTRAINT "instagram_publish_log_instagram_account_id_instagram_accounts_id_fk" FOREIGN KEY ("instagram_account_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE cascade ON UPDATE no action;