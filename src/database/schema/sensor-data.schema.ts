import { bigserial, index, jsonb, pgEnum, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sensors } from './sensors.schema';

export const originTypeEnum = pgEnum('origin_type', ['sensor', 'metaverso']);

export const sensorData = pgTable(
  'sensor_data',
  {
    id: bigserial('id', { mode: 'number' }).notNull(),
    sensorId: uuid('sensor_id')
      .notNull()
      .references(() => sensors.id, { onDelete: 'cascade' }),
    originType: originTypeEnum('origin_type').default('sensor').notNull(),
    payload: jsonb('payload').notNull(),
    recordedAt: timestamp('recorded_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
    receivedAt: timestamp('received_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.recordedAt] }),
    index('sensor_data_sensor_time_idx').on(table.sensorId, table.recordedAt),
    index('sensor_data_origin_idx').on(table.originType),
  ],
);

export type SensorData = typeof sensorData.$inferSelect;
export type NewSensorData = typeof sensorData.$inferInsert;
