# 🏛️ Architecture Decision Records (ADR) — Betty API

Este documento consolida las decisiones de arquitectura de software tomadas durante el diseño e implementación de **Betty API**.

---

## 📑 Índice de Decisiones de Arquitectura

| ID | Título | Estado | Fecha | Resumen |
|:---|:---|:---|:---|:---|
| [ADR-001](./adr/001-framework-nestjs.md) | **Adopción del Framework NestJS** | Aceptado | 2026-08 | Modularidad, DI empresarial y soporte integrado para WebSockets y microservicios. |
| [ADR-002](./adr/002-orm-drizzle.md) | **Elección de Drizzle ORM sobre Prisma y TypeORM** | Aceptado | 2026-08 | Enfoque SQL-first de alto rendimiento, bundle mínimo (~12 KB) e inferencia estricta de tipos. |
| [ADR-003](./adr/003-mqtt-broker-emqx.md) | **Selección de EMQX como Broker MQTT Autohosteado** | Aceptado | 2026-08 | Autenticación HTTP nativa, rule engine con webhooks y dashboard web visual. |
| [ADR-004](./adr/004-cache-dragonfly.md) | **Uso de Dragonfly como Motor de Cache y Pub/Sub** | Aceptado | 2026-08 | Cache multihilo con compatibilidad total con Redis RESP y alto throughput. |
| [ADR-005](./adr/005-auth-strategy-api-keys.md) | **Autenticación IoT mediante API Keys Criptográficas** | Aceptado | 2026-08 | Claves por sensor (`betty_live_...`), almacenamiento de hash SHA-256 y revocación instantánea. |
| [ADR-006](./adr/006-clean-architecture.md) | **Arquitectura Hexagonal y Patrones de Diseño** | Aceptado | 2026-08 | Desacoplamiento de capas (Domain, Application, Infrastructure, Interface) con 10 patrones de diseño. |
| [ADR-007](./adr/007-timescaledb.md) | **Particionamiento y Series Temporales con TimescaleDB** | Aceptado | 2026-08 | Hypertables en PostgreSQL 16 para inserciones masivas de telemetría y queries temporales rápidas. |
| [ADR-008](./adr/008-documentation-scalar.md) | **Adopción de Scalar para Documentación Interactiva** | Aceptado | 2026-08 | Documentación OpenAPI moderna, temas personalizados y cliente HTTP interactivo integrado. |
| [ADR-009](./adr/009-unified-relational-rbac.md) | **Modelo RBAC Relacional Unificado** | Aceptado | 2026-08 | Tabla `roles` con discriminador `scope` ('system' \| 'team') vinculada a `users` y `team_members`. |

---

## Resumen Ejecutivo de Decisiones

### 1. Ingesta y Seguridad de Dispositivos IoT
Para conectar microcontroladores físicos (ESP32, Raspberry Pi) y gemelos digitales en metaversos sin comprometer la seguridad ni sobrecargar a los usuarios con credenciales complejas:
- Se generan **API Keys criptográficas únicas por sensor** con prefijo `betty_live_`.
- El broker **EMQX 5.8** consulta a Betty API mediante un webhook HTTP (`POST /api/mqtt/auth`) para verificar las credenciales contra el hash SHA-256 almacenado en PostgreSQL.
- Se registra cada acción en `api_key_audit_log`.

### 2. Rendimiento en Series Temporales
- La tabla `sensor_data` se estructura como una **Hypertable de TimescaleDB** particionada automáticamente por `recorded_at`.
- Los datos se clasifican según su `origin_type` (`sensor` o `metaverso`) para permitir análisis comparativos entre datos reales simulados y físicos.
- Las consultas de tableros se cachean en **Dragonfly** con TTL dinámico.

### 3. Visualización en Tiempo Real y Dashboards
- Cada lectura de sensor recibida por el webhook MQTT se publica en el canal Pub/Sub de Dragonfly (`sensor:<sensorId>:data`).
- El **WebSocket Gateway** de NestJS (Socket.IO en `/realtime`) distribuye las métricas de inmediato a los tableros y widgets conectados.
- Soporte para tableros ilimitados por usuario y publicación de dashboards de acceso abierto (`GET /api/dashboards/public/:id`).

### 4. Documentación y Experiencia de Desarrollador
- Se adopta **Scalar** para renderizar la documentación OpenAPI en `/api/docs` con tema oscuro y cliente de peticiones integrado.
