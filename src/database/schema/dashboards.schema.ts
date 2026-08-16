import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { sensors } from './sensors.schema';
import { users } from './users.schema';

export const widgetTypeEnum = pgEnum('widget_type', [
  'line_chart',
  'gauge',
  'table',
  'map',
  'metric',
  'bar_chart',
]);

export const dashboards = pgTable('dashboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  layout: jsonb('layout').default([]),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export const dashboardWidgets = pgTable('dashboard_widgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  dashboardId: uuid('dashboard_id')
    .notNull()
    .references(() => dashboards.id, { onDelete: 'cascade' }),
  sensorId: uuid('sensor_id')
    .notNull()
    .references(() => sensors.id, { onDelete: 'cascade' }),
  widgetType: widgetTypeEnum('widget_type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  config: jsonb('config').default({}),
  position: jsonb('position').default({ x: 0, y: 0, w: 6, h: 4 }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export type Dashboard = typeof dashboards.$inferSelect;
export type NewDashboard = typeof dashboards.$inferInsert;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type NewDashboardWidget = typeof dashboardWidgets.$inferInsert;
