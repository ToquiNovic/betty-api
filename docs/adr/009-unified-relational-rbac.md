# ADR 009: Modelo RBAC Relacional Unificado para Roles de Sistema y de Equipo

## Estado
Aceptado

## Contexto
El sistema cuenta con dos niveles de autorización diferenciados:
1. **Roles del Sistema (Plataforma Global):** `admin` y `user` para control de acceso a recursos globales y administración de usuarios.
2. **Roles de Equipo (Colaboración Académica):** `owner`, `team_admin`, `member` y `viewer` para control de sensores compartidos y tableros en un equipo específico.

Se evaluó si mantener enums estáticos separados o unificar la administración en una tabla relacional de roles con clave foránea.

## Decisión
Se implementa una **tabla única `roles` con discriminador `scope` (`'system'` | `'team'`)** y claves foráneas tanto en `users` como en `team_members`.

## Estructura
- **`users.role_id ➡️ roles.id`**: Apunta a roles con `scope = 'system'`.
- **`team_members.role_id ➡️ roles.id`**: Apunta a roles con `scope = 'team'`.

## Justificación
1. **Administración Dinámica:** Los administradores de la plataforma pueden consultar y modificar permisos granulares en formato JSONB sin alterar el esquema de la base de datos.
2. **Integridad Referencial:** Claves foráneas reales con `ON DELETE SET NULL` para asegurar consistencia en la base de datos.
3. **Escalabilidad:** Permite crear nuevos roles en el futuro (ej. `research_lead`, `auditor`) simplemente insertando registros en la tabla `roles`.
