import { boolean, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { roles } from './roles.schema';

export const authProviderEnum = pgEnum('auth_provider', ['email', 'google']);
export const systemRoleEnum = pgEnum('system_role', ['admin', 'user']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  authProvider: authProviderEnum('auth_provider').default('email').notNull(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
  role: systemRoleEnum('role').default('user').notNull(),
  googleId: varchar('google_id', { length: 255 }),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
