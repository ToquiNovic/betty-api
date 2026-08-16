import { boolean, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { roles } from './roles.schema';
import { users } from './users.schema';

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  inviteCode: varchar('invite_code', { length: 16 }).notNull().unique(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
    role: varchar('role', { length: 50 }).default('member').notNull(),
    joinedAt: timestamp('joined_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('team_user_unique').on(table.teamId, table.userId),
  ],
);

export const teamInvitations = pgTable('team_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  inviteToken: varchar('invite_token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
  isUsed: boolean('is_used').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type NewTeamInvitation = typeof teamInvitations.$inferInsert;
