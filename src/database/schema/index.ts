import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { roles } from './roles.schema';
import { teams, teamMembers, teamInvitations } from './teams.schema';
import { sensors } from './sensors.schema';
import { sensorData } from './sensor-data.schema';
import { dashboards, dashboardWidgets } from './dashboards.schema';
import { passwordResetTokens } from './password-resets.schema';
import { apiKeyAuditLog } from './api-keys.schema';

// Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  teamMembers: many(teamMembers),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  systemRole: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  ownedTeams: many(teams),
  teamMemberships: many(teamMembers),
  ownedSensors: many(sensors),
  dashboards: many(dashboards),
  passwordResetTokens: many(passwordResetTokens),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),
  invitations: many(teamInvitations),
  sensors: many(sensors),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  roleDetails: one(roles, {
    fields: [teamMembers.roleId],
    references: [roles.id],
  }),
}));

export const sensorsRelations = relations(sensors, ({ one, many }) => ({
  owner: one(users, {
    fields: [sensors.ownerId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [sensors.teamId],
    references: [teams.id],
  }),
  data: many(sensorData),
  widgets: many(dashboardWidgets),
  auditLogs: many(apiKeyAuditLog),
}));

export const sensorDataRelations = relations(sensorData, ({ one }) => ({
  sensor: one(sensors, {
    fields: [sensorData.sensorId],
    references: [sensors.id],
  }),
}));

export const dashboardsRelations = relations(dashboards, ({ one, many }) => ({
  owner: one(users, {
    fields: [dashboards.ownerId],
    references: [users.id],
  }),
  widgets: many(dashboardWidgets),
}));

export const dashboardWidgetsRelations = relations(dashboardWidgets, ({ one }) => ({
  dashboard: one(dashboards, {
    fields: [dashboardWidgets.dashboardId],
    references: [dashboards.id],
  }),
  sensor: one(sensors, {
    fields: [dashboardWidgets.sensorId],
    references: [sensors.id],
  }),
}));

export * from './roles.schema';
export * from './users.schema';
export * from './teams.schema';
export * from './sensors.schema';
export * from './sensor-data.schema';
export * from './dashboards.schema';
export * from './password-resets.schema';
export * from './api-keys.schema';
