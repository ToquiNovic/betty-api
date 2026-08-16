import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { sensors } from './sensors.schema';

export const apiKeyActionEnum = pgEnum('api_key_action', ['created', 'revoked', 'rotated']);

export const apiKeyAuditLog = pgTable('api_key_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  sensorId: uuid('sensor_id')
    .notNull()
    .references(() => sensors.id, { onDelete: 'cascade' }),
  action: apiKeyActionEnum('action').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export type ApiKeyAuditLog = typeof apiKeyAuditLog.$inferSelect;
export type NewApiKeyAuditLog = typeof apiKeyAuditLog.$inferInsert;
