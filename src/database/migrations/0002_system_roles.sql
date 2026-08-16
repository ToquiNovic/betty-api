DO $$ BEGIN
  CREATE TYPE "public"."system_role" AS ENUM('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "system_role" DEFAULT 'user' NOT NULL;
