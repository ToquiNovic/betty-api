import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const roleScopeEnum = pgEnum('role_scope', ['system', 'team']);

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  scope: roleScopeEnum('scope').default('system').notNull(),
  description: text('description'),
  permissions: jsonb('permissions').default([]).notNull(),
  isSystem: boolean('is_system').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
