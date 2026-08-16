import { jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { teams } from './teams.schema';
import { users } from './users.schema';

export const sensorStatusEnum = pgEnum('sensor_status', ['active', 'inactive', 'revoked']);

export const sensors = pgTable('sensors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
  apiKeyHash: varchar('api_key_hash', { length: 255 }).notNull().unique(),
  apiKeyPrefix: varchar('api_key_prefix', { length: 32 }).notNull(),
  mqttTopic: varchar('mqtt_topic', { length: 255 }).notNull(),
  status: sensorStatusEnum('status').default('active').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export type Sensor = typeof sensors.$inferSelect;
export type NewSensor = typeof sensors.$inferInsert;
