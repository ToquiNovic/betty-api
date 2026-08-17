DROP TABLE IF EXISTS "project_tags" CASCADE;
DROP TABLE IF EXISTS "project_firmware" CASCADE;
DROP TABLE IF EXISTS "project_materials" CASCADE;
DROP TABLE IF EXISTS "project_steps" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;

DROP TYPE IF EXISTS "difficulty_level" CASCADE;
DROP TYPE IF EXISTS "chip_family" CASCADE;
DROP TYPE IF EXISTS "model_3d_format" CASCADE;

CREATE TYPE "public"."difficulty_level" AS ENUM('beginner', 'intermediate', 'advanced');
CREATE TYPE "public"."chip_family" AS ENUM('ESP32', 'ESP8266', 'ESP32-S2', 'ESP32-S3', 'ESP32-C3', 'other');
CREATE TYPE "public"."model_3d_format" AS ENUM('glb', 'gltf', 'stl');

CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "slug" varchar(255) UNIQUE,
  "description" text NOT NULL,
  "cover_image_url" varchar(500),
  "difficulty" "difficulty_level" DEFAULT 'beginner' NOT NULL,
  "board_type" varchar(100) DEFAULT 'ESP32' NOT NULL,
  "estimated_time" jsonb DEFAULT '{"value": 60, "unit": "minutes"}'::jsonb,
  "is_published" boolean DEFAULT false NOT NULL,
  "model_3d_url" varchar(500),
  "model_3d_format" "model_3d_format",
  "created_by_id" uuid REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "project_steps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "public"."projects"("id") ON DELETE CASCADE,
  "step_order" integer DEFAULT 1 NOT NULL,
  "title" varchar(255) NOT NULL,
  "content" text NOT NULL,
  "image_url" varchar(500),
  "video_url" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "project_materials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "public"."projects"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit" varchar(50) DEFAULT 'pcs' NOT NULL,
  "estimated_cost" numeric(10, 2),
  "currency" varchar(10) DEFAULT 'USD' NOT NULL,
  "purchase_url" varchar(500),
  "image_url" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "project_firmware" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "public"."projects"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "chip_family" "chip_family" DEFAULT 'ESP32' NOT NULL,
  "version" varchar(50) DEFAULT '1.0.0' NOT NULL,
  "firmware_url" varchar(500) NOT NULL,
  "flash_offset" varchar(50) DEFAULT '0x10000' NOT NULL,
  "instructions" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "project_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "public"."projects"("id") ON DELETE CASCADE,
  "tag" varchar(100) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_steps_project_idx" ON "project_steps" ("project_id");
CREATE INDEX IF NOT EXISTS "project_materials_project_idx" ON "project_materials" ("project_id");
CREATE INDEX IF NOT EXISTS "project_firmware_project_idx" ON "project_firmware" ("project_id");
CREATE INDEX IF NOT EXISTS "project_tags_project_idx" ON "project_tags" ("project_id");
CREATE INDEX IF NOT EXISTS "project_tags_tag_idx" ON "project_tags" ("tag");
