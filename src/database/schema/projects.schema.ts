import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const difficultyEnum = pgEnum('difficulty_level', [
  'beginner',
  'intermediate',
  'advanced',
]);

export const chipFamilyEnum = pgEnum('chip_family', [
  'ESP32',
  'ESP8266',
  'ESP32-S2',
  'ESP32-S3',
  'ESP32-C3',
  'other',
]);

export const modelFormatEnum = pgEnum('model_3d_format', [
  'glb',
  'gltf',
  'stl',
]);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique(),
  description: text('description').notNull(),
  coverImageUrl: varchar('cover_image_url', { length: 500 }),
  difficulty: difficultyEnum('difficulty').notNull().default('beginner'),
  boardType: varchar('board_type', { length: 100 }).notNull().default('ESP32'),
  estimatedTime: jsonb('estimated_time').default({ value: 60, unit: 'minutes' }),
  isPublished: boolean('is_published').default(false).notNull(),
  model3dUrl: varchar('model_3d_url', { length: 500 }),
  model3dFormat: modelFormatEnum('model_3d_format'),
  createdById: uuid('created_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export const projectSteps = pgTable('project_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull().default(1),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  videoUrl: varchar('video_url', { length: 500 }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export const projectMaterials = pgTable('project_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  quantity: integer('quantity').notNull().default(1),
  unit: varchar('unit', { length: 50 }).notNull().default('pcs'),
  purchaseUrl: varchar('purchase_url', { length: 500 }),
  imageUrl: varchar('image_url', { length: 500 }),
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('USD'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export const projectFirmware = pgTable('project_firmware', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  chipFamily: chipFamilyEnum('chip_family').notNull().default('ESP32'),
  version: varchar('version', { length: 50 }).notNull().default('1.0.0'),
  firmwareUrl: varchar('firmware_url', { length: 500 }).notNull(),
  flashOffset: varchar('flash_offset', { length: 20 }).default('0x10000'),
  manifest: jsonb('manifest'),
  flashInstructions: text('flash_instructions'),
  fileSizeBytes: integer('file_size_bytes'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export const projectTags = pgTable('project_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 50 }).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectStep = typeof projectSteps.$inferSelect;
export type NewProjectStep = typeof projectSteps.$inferInsert;
export type ProjectMaterial = typeof projectMaterials.$inferSelect;
export type NewProjectMaterial = typeof projectMaterials.$inferInsert;
export type ProjectFirmware = typeof projectFirmware.$inferSelect;
export type NewProjectFirmware = typeof projectFirmware.$inferInsert;
export type ProjectTag = typeof projectTags.$inferSelect;
export type NewProjectTag = typeof projectTags.$inferInsert;
