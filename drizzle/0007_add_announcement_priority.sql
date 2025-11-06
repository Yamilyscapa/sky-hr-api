CREATE TYPE "announcement_priority" AS ENUM ('normal', 'important', 'urgent');
--> statement-breakpoint
ALTER TABLE "announcement"
  ADD COLUMN "priority" "announcement_priority" DEFAULT 'normal' NOT NULL,
  ADD COLUMN "published_at" timestamp DEFAULT now() NOT NULL,
  ADD COLUMN "expires_at" timestamp,
  ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
