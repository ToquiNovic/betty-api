---
name: betty-api-expert
description: Expert skill for developing, maintaining, and scaling Betty API — a high-performance open-source IoT & Metaverse PaaS built with NestJS, Drizzle ORM, TimescaleDB, Dragonfly, EMQX, and Scalar.
---

# Betty API Development Skill

This skill provides expert knowledge, architectural conventions, coding rules, and development workflows for the **Betty API** codebase.

## 🏛️ Architecture & Principles

Betty API follows **Clean Architecture (Hexagonal Architecture)** and **Clean Code** principles:
- **Domain Layer (`src/modules/*/domain/`)**: Pure TypeScript entities and port interfaces. Free from framework dependencies.
- **Application Layer (`src/modules/*/application/`)**: DTOs with `class-validator` / `zod` and Use Cases.
- **Infrastructure Layer (`src/modules/*/infrastructure/`)**: Repository implementations (Drizzle), authentication strategies (Passport), cache adapters (Dragonfly).
- **Interface Layer**: NestJS Controllers, Socket.IO Gateways, and Scalar API Reference documentation.

## 🧱 Module Guidelines

When adding or modifying features in Betty API:
1. **Database Schemas**: Always define schemas in `src/database/schema/*.schema.ts` with explicit timestamp mode: `timestamp('name', { mode: 'date', withTimezone: true })`. Export schemas in `src/database/schema/index.ts`.
2. **Unified Relational RBAC**:
   - Platform/system roles (`scope: 'system'`) attach to `users.role_id ➡️ roles.id`.
   - Team collaborative roles (`scope: 'team'`) attach to `team_members.role_id ➡️ roles.id`.
3. **Data Ingestion**: Sensor telemetry must always support `origin_type` (`'sensor'` or `'metaverso'`). Telemetry must be recorded in `sensor_data` (TimescaleDB hypertable) and broadcasted to Dragonfly Pub/Sub (`sensor:${sensorId}:data`).
4. **API Keys**: Sensor API keys must be generated using `CryptoUtil.generateApiKey()`. Only store `apiKeyHash` (SHA-256) and `apiKeyPrefix`. Never log or store raw API keys. Always write to `api_key_audit_log`.
5. **Dashboards**: Users can create unlimited dashboards. Support both private and open public access (`isPublic: boolean`, `PATCH /api/dashboards/:id/publish`, `GET /api/dashboards/public/:id`).
6. **Documentation**: Interactive API reference is served with **Scalar** on `/api/docs`. Use standard `@nestjs/swagger` decorators.
7. **Caching & Realtime**: Use `CacheService` for Dragonfly operations. Any real-time telemetry emits through `RealtimeGateway` under the `/realtime` namespace.
8. **Internationalization (i18n)**: All user-facing error and response messages must be defined in both `src/i18n/es/translations.json` and `src/i18n/en/translations.json`.

## 🛠️ Common Commands

```bash
# Install dependencies
pnpm install

# Start complete infrastructure with Docker
docker compose up -d

# Start local dependencies in Docker
docker compose up postgres dragonfly emqx -d

# Run database push / migrations
pnpm run db:push

# Start API in development mode
pnpm run start:dev

# Run tests
pnpm test

# Build production bundle
pnpm run build
```
