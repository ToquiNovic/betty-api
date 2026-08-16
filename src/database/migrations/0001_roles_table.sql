CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL UNIQUE,
	"name" varchar(100) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "role_id" uuid;
ALTER TABLE "team_members" DROP CONSTRAINT IF EXISTS "team_members_role_id_roles_id_fk";
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

INSERT INTO "roles" ("slug", "name", "description", "permissions", "is_system")
VALUES 
  ('owner', 'Propietario', 'Control total del equipo, sensores, tableros y gestión de miembros', '["team:*", "sensor:*", "dashboard:*", "member:*"]'::jsonb, true),
  ('admin', 'Administrador', 'Gestión de sensores, tableros e invitación de miembros', '["team:read", "sensor:*", "dashboard:*", "member:invite", "member:remove"]'::jsonb, true),
  ('member', 'Miembro', 'Acceso a los sensores del equipo, creación de tableros y consultas', '["team:read", "sensor:read", "sensor:data", "dashboard:create", "dashboard:read"]'::jsonb, true),
  ('viewer', 'Observador', 'Visualización de tableros y lecturas de sensores', '["team:read", "sensor:read", "dashboard:read"]'::jsonb, true)
ON CONFLICT ("slug") DO NOTHING;
