DO $$ BEGIN
  CREATE TYPE "public"."role_scope" AS ENUM('system', 'team');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "scope" "role_scope" DEFAULT 'system' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_id" uuid;
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_id_roles_id_fk";
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

INSERT INTO "roles" ("slug", "name", "scope", "description", "permissions", "is_system")
VALUES 
  ('admin', 'Administrador del Sistema', 'system', 'Control total de la plataforma, usuarios, configuraciones y auditoría global', '["*"]'::jsonb, true),
  ('user', 'Usuario Universitario', 'system', 'Usuario estándar de la comunidad con acceso a creación de equipos, sensores y tableros', '["team:create", "sensor:create", "dashboard:create"]'::jsonb, true),
  ('owner', 'Propietario de Equipo', 'team', 'Control total del equipo, sensores compartidos, tableros y gestión de miembros', '["team:*", "sensor:*", "dashboard:*", "member:*"]'::jsonb, true),
  ('team_admin', 'Administrador de Equipo', 'team', 'Gestión de sensores compartidos, tableros e invitación de miembros', '["team:read", "sensor:*", "dashboard:*", "member:invite", "member:remove"]'::jsonb, true),
  ('member', 'Miembro de Equipo', 'team', 'Acceso a los sensores del equipo, creación de tableros y consultas de telemetría', '["team:read", "sensor:read", "sensor:data", "dashboard:create", "dashboard:read"]'::jsonb, true),
  ('viewer', 'Observador de Equipo', 'team', 'Visualización de tableros y lecturas de sensores compartidos', '["team:read", "sensor:read", "dashboard:read"]'::jsonb, true)
ON CONFLICT ("slug") DO UPDATE SET "scope" = EXCLUDED."scope", "permissions" = EXCLUDED."permissions";

UPDATE "users" u SET "role_id" = r."id" FROM "roles" r WHERE r."slug" = u."role"::text AND u."role_id" IS NULL;
