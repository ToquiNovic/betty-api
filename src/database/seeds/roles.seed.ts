import { eq } from 'drizzle-orm';
import { DrizzleDb } from '../drizzle.provider';
import { roles } from '../schema/roles.schema';

export const DEFAULT_ROLES = [
  // System Roles (Scope: system)
  {
    slug: 'admin',
    name: 'Administrador del Sistema',
    scope: 'system' as const,
    description: 'Control total de la plataforma, usuarios, configuraciones y auditoría global',
    permissions: ['*'],
    isSystem: true,
  },
  {
    slug: 'user',
    name: 'Usuario Universitario',
    scope: 'system' as const,
    description: 'Usuario estándar de la comunidad con acceso a creación de equipos, sensores y tableros',
    permissions: ['team:create', 'sensor:create', 'dashboard:create'],
    isSystem: true,
  },

  // Team Roles (Scope: team)
  {
    slug: 'owner',
    name: 'Propietario de Equipo',
    scope: 'team' as const,
    description: 'Control total del equipo, sensores compartidos, tableros y gestión de miembros',
    permissions: ['team:*', 'sensor:*', 'dashboard:*', 'member:*'],
    isSystem: true,
  },
  {
    slug: 'team_admin',
    name: 'Administrador de Equipo',
    scope: 'team' as const,
    description: 'Gestión de sensores compartidos, tableros e invitación de miembros',
    permissions: ['team:read', 'sensor:*', 'dashboard:*', 'member:invite', 'member:remove'],
    isSystem: true,
  },
  {
    slug: 'member',
    name: 'Miembro de Equipo',
    scope: 'team' as const,
    description: 'Acceso a los sensores del equipo, creación de tableros y consultas de telemetría',
    permissions: ['team:read', 'sensor:read', 'sensor:data', 'dashboard:create', 'dashboard:read'],
    isSystem: true,
  },
  {
    slug: 'viewer',
    name: 'Observador de Equipo',
    scope: 'team' as const,
    description: 'Visualización de tableros y lecturas de sensores compartidos',
    permissions: ['team:read', 'sensor:read', 'dashboard:read'],
    isSystem: true,
  },
];

export async function seedRoles(db: DrizzleDb) {
  for (const role of DEFAULT_ROLES) {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.slug, role.slug))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(roles).values(role);
    }
  }
}
