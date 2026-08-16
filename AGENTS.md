# 🤖 AGENTS.md — Agent & Developer Operational Manual

> **Manual de Operaciones para Agentes de IA y Desarrolladores de Betty API**
> Este documento define las directrices arquitectónicas, protocolos de interacción, convenciones de código y flujos de trabajo para agentes autónomos y asistentes de IA.

---

## 🎯 Visión y Propósito del Proyecto

**Betty API** es una plataforma PaaS de código abierto orientada a comunidades universitarias e investigación en Internet de las Cosas (IoT), Gemelos Digitales y Metaversos.

### Pilares Fundamentales:
1. **Ingesta de Alto Throughput**: Broker MQTT (**EMQX 5.8**) con autenticación HTTP vía API Keys criptográficas por sensor (`betty_live_...`).
2. **Soporte Multiorigen**: Telemetría clasificada como `sensor` (físico) o `metaverso` (entorno virtual/simulación).
3. **Colaboración Académica y Roles Duales (RBAC Relacional Unificado)**:
   - **Roles del Sistema (`scope: system`)**: `admin` (control global de la plataforma) y `user` vinculados en `users.role_id ➡️ roles.id`.
   - **Roles de Equipo (`scope: team`)**: `owner`, `team_admin`, `member` y `viewer` vinculados en `team_members.role_id ➡️ roles.id` con permisos JSONB, códigos alfanuméricos de 8 caracteres y enlaces seguros de 7 días.
4. **Privacidad Granular**: Sensores de propiedad personal (privados) o compartidos en equipos de investigación.
5. **Dashboards en Tiempo Real & Públicos**: Tableros personalizables con 6 tipos de widgets (`line_chart`, `gauge`, `table`, `map`, `metric`, `bar_chart`), soporte para múltiples tableros (1:N), opción de publicación abierta (`GET /api/dashboards/public/:id`) y push de datos instantáneo vía **Socket.IO Gateway** (`/realtime`) sincronizado por **Dragonfly Pub/Sub**.
6. **Autenticación Dual**: Google OAuth 2.0 (Google Cloud Console) y Email/Contraseña con hasheo `bcrypt` y reseteo vía **Resend**.
7. **Series Temporales Eficientes**: **PostgreSQL 16 + TimescaleDB** (hypertables con particionamiento temporal automático y clave compuesta `[id, recorded_at]`) y **Drizzle ORM**.
8. **Cache en Memoria Multihilo**: **Dragonfly** (100% compatible con Redis RESP, multihilo).
9. **Documentación Interactiva Moderna**: **Scalar** sobre OpenAPI disponible en `/api/docs`.

---

## 🏛️ Arquitectura del Sistema y Capas

El proyecto sigue rigurosamente **Clean Architecture (Arquitectura Hexagonal)** y **Clean Code**:

```
src/
├── common/                  # Componentes transversales
│   ├── decorators/          # @CurrentUser, @Public, @Roles
│   ├── filters/             # AllExceptionsFilter (i18n aware)
│   ├── guards/              # JwtAuthGuard, GoogleAuthGuard, RolesGuard
│   ├── interceptors/        # LoggingInterceptor, TransformInterceptor
│   └── utils/               # ApiResponseDto, CryptoUtil
├── config/                  # Configuraciones tipadas de entorno
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── cache.config.ts
│   ├── mqtt.config.ts
│   ├── auth.config.ts
│   └── resend.config.ts
├── database/                # Infraestructura de persistencia Drizzle
│   ├── migrations/          # Archivos SQL de migración
│   ├── schema/              # Schemas Drizzle con timestamps tipados
│   ├── seeds/               # Seeders automáticos (roles del sistema y equipos)
│   ├── drizzle.provider.ts  # Pool postgres.js
│   └── drizzle.module.ts
├── i18n/                    # Diccionarios de internacionalización (es, en)
│   ├── es/translations.json
│   └── en/translations.json
└── modules/                 # Módulos de dominio y aplicación
    ├── auth/                # Login Google/Email, JWT, Resend reset
    ├── users/               # Perfiles de usuario y administración
    ├── roles/               # Catálogo de roles del sistema y de equipo
    ├── teams/               # Equipos, membresías e invitaciones
    ├── sensors/             # Sensores, API Keys, auditoría y telemetría
    ├── mqtt/                # HTTP Auth y Webhooks para EMQX
    ├── dashboards/          # Tableros públicos/privados y widgets configurables
    ├── realtime/            # WebSocket Gateway (Socket.IO + Dragonfly Pub/Sub)
    ├── cache/               # Servicio de Dragonfly Cache & Pub/Sub
    └── email/               # Servicio transaccional Resend
```

---

## 📜 Reglas y Convenciones para Agentes

### 1. Manejo de la Base de Datos y Schemas (Drizzle ORM)
- **Modo de Timestamp**: Define siempre los timestamps con modo explícito:
  ```typescript
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull()
  ```
- **Relaciones**: Declara y exporta todas las relaciones en `src/database/schema/index.ts`.
- **Inyección de DB**: Inyecta la base de datos usando el token `@Inject(DRIZZLE_ORM) private readonly db: DrizzleDb`.

### 2. Seguridad y Gestión de API Keys
- **Generación**: Usa siempre `CryptoUtil.generateApiKey()`.
- **Almacenamiento**: Almacena únicamente el hash SHA-256 (`apiKeyHash`) y el prefijo (`apiKeyPrefix`). **NUNCA** guardes ni imprimas la clave en texto plano (`rawApiKey`) en logs o en la base de datos.
- **Auditoría**: Cada creación, rotación o revocación debe registrarse en la tabla `api_key_audit_log`.

### 3. Ingesta y Formato de Datos MQTT
- **Topics MQTT**: Formato estándar: `betty/sensor/<sensorId>/data`.
- **Payload**: Debe aceptar `origin_type` (`'sensor'` o `'metaverso'`).
- **Pipeline de Ingesta**:
  1. EMQX invoca `POST /api/mqtt/auth` con `username: sensorId` y `password: rawApiKey`.
  2. Al recibir datos, EMQX invoca `POST /api/mqtt/webhook`.
  3. `MqttService` persiste en `sensor_data` (TimescaleDB).
  4. Invalida la caché de consultas de ese sensor en Dragonfly.
  5. Publica en Dragonfly Pub/Sub canal `sensor:<sensorId>:data`.
  6. `RealtimeGateway` retransmite a los clientes Socket.IO suscritos a `sensor:<sensorId>`.

### 4. Internacionalización (i18n)
- Todos los mensajes de respuesta y errores deben registrarse tanto en `src/i18n/es/translations.json` como en `src/i18n/en/translations.json`.

---

## 🛠️ Comandos de Desarrollo y Verificación

```bash
# Instalar dependencias con pnpm
pnpm install

# Levantar entorno completo en Docker (API en dev mode con hot-reload)
docker compose up -d

# Levantar solo infraestructura dependiente (Postgres, Dragonfly, EMQX)
docker compose up postgres dragonfly emqx -d

# Aplicar migraciones Drizzle
pnpm run db:push

# Iniciar servidor en desarrollo local con hot-reload
pnpm run start:dev

# Ejecutar suite de pruebas unitarias
pnpm test

# Compilar para producción
pnpm run build
```

---

## 🔒 Variables de Entorno Clave

| Variable | Descripción | Valor por Defecto |
|:---|:---|:---|
| `PORT` | Puerto de la API REST / WebSocket | `3000` |
| `DATABASE_URL` | Conexión PostgreSQL + TimescaleDB | `postgres://betty:betty_secret_pass@localhost:5432/betty_db` |
| `DRAGONFLY_HOST` | Host de Dragonfly Cache | `localhost` |
| `DRAGONFLY_PORT` | Puerto host de Dragonfly | `6380` |
| `DRAGONFLY_PASSWORD` | Contraseña de Dragonfly | `dragonfly_secret_pass` |
| `MQTT_BROKER_URL` | URL de conexión al broker EMQX | `mqtt://localhost:1883` |
| `JWT_SECRET` | Secreto para firma de JWT de acceso | Cadena de 32+ caracteres |
| `JWT_REFRESH_SECRET` | Secreto para tokens de refresco | Cadena de 32+ caracteres |
| `GOOGLE_CLIENT_ID` | Client ID de Google Cloud Console | `*.apps.googleusercontent.com` |
| `RESEND_API_KEY` | Clave API de Resend para correos | `re_*` |
