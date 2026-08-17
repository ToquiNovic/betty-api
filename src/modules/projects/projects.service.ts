import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, or, sql, SQL } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../../database/drizzle.provider';
import {
  projects,
  projectSteps,
  projectMaterials,
  projectFirmware,
  projectTags,
} from '../../database/schema/projects.schema';
import { users } from '../../database/schema/users.schema';
import { StorageService } from '../storage/storage.service';
import {
  CreateFirmwareDto,
  CreateMaterialDto,
  CreateProjectDto,
  CreateStepDto,
  ProjectQueryDto,
  UpdateMaterialDto,
  UpdateProjectDto,
  UpdateStepDto,
} from './dto/project.dto';
import { MulterFile } from '@/common/types/multer.type';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: DrizzleDb,
    private readonly storageService: StorageService,
  ) {}

  /**
   * List projects with filters and tags
   */
  async getProjects(query: ProjectQueryDto, isPublicOnly = true) {
    const conditions: (SQL | undefined)[] = [];

    if (isPublicOnly) {
      conditions.push(eq(projects.isPublished, true));
    }

    if (query.difficulty) {
      conditions.push(eq(projects.difficulty, query.difficulty));
    }

    if (query.boardType) {
      conditions.push(eq(projects.boardType, query.boardType));
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      const searchCondition = or(
        ilike(projects.title, searchPattern),
        ilike(projects.description, searchPattern),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const validConditions = conditions.filter((c): c is SQL => c !== undefined);
    const whereClause = validConditions.length > 0 ? and(...validConditions) : undefined;

    const limit = query.limit || 20;
    const offset = query.offset || 0;

    let projectRows = await this.db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        coverImageUrl: projects.coverImageUrl,
        difficulty: projects.difficulty,
        boardType: projects.boardType,
        estimatedTime: projects.estimatedTime,
        isPublished: projects.isPublished,
        model3dUrl: projects.model3dUrl,
        model3dFormat: projects.model3dFormat,
        createdById: projects.createdById,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(whereClause)
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset);

    if (query.tag) {
      const tagRows = await this.db
        .select({ projectId: projectTags.projectId })
        .from(projectTags)
        .where(eq(projectTags.tag, query.tag));
      const taggedProjectIds = new Set(tagRows.map((r) => r.projectId));
      projectRows = projectRows.filter((p) => taggedProjectIds.has(p.id));
    }

    // Enrich with tags, steps count, materials count
    const enrichedProjects = await Promise.all(
      projectRows.map(async (project) => {
        const tags = await this.db
          .select({ tag: projectTags.tag })
          .from(projectTags)
          .where(eq(projectTags.projectId, project.id));

        const [stepsCount] = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(projectSteps)
          .where(eq(projectSteps.projectId, project.id));

        const [materialsCount] = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(projectMaterials)
          .where(eq(projectMaterials.projectId, project.id));

        const [firmwareCount] = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(projectFirmware)
          .where(eq(projectFirmware.projectId, project.id));

        return {
          ...project,
          tags: tags.map((t) => t.tag),
          stepsCount: stepsCount?.count || 0,
          materialsCount: materialsCount?.count || 0,
          hasFirmware: (firmwareCount?.count || 0) > 0,
          has3DModel: !!project.model3dUrl,
        };
      }),
    );

    return enrichedProjects;
  }

  /**
   * Get single project detail with all relations
   */
  async getProjectById(id: string, allowDraft = false) {
    const [project] = await this.db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        coverImageUrl: projects.coverImageUrl,
        difficulty: projects.difficulty,
        boardType: projects.boardType,
        estimatedTime: projects.estimatedTime,
        isPublished: projects.isPublished,
        model3dUrl: projects.model3dUrl,
        model3dFormat: projects.model3dFormat,
        createdById: projects.createdById,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        creatorName: users.name,
        creatorAvatar: users.avatarUrl,
      })
      .from(projects)
      .leftJoin(users, eq(projects.createdById, users.id))
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      throw new NotFoundException('projects.not_found');
    }

    if (!project.isPublished && !allowDraft) {
      throw new NotFoundException('projects.not_found');
    }

    const [steps, materials, firmware, tags] = await Promise.all([
      this.db
        .select()
        .from(projectSteps)
        .where(eq(projectSteps.projectId, id))
        .orderBy(projectSteps.stepOrder),
      this.db
        .select()
        .from(projectMaterials)
        .where(eq(projectMaterials.projectId, id))
        .orderBy(projectMaterials.createdAt),
      this.db
        .select()
        .from(projectFirmware)
        .where(eq(projectFirmware.projectId, id))
        .orderBy(projectFirmware.createdAt),
      this.db
        .select({ tag: projectTags.tag })
        .from(projectTags)
        .where(eq(projectTags.projectId, id)),
    ]);

    return {
      ...project,
      steps,
      materials,
      firmware,
      tags: tags.map((t) => t.tag),
    };
  }

  /**
   * ESP Web Tools manifest JSON
   */
  async getFirmwareManifest(projectId: string, firmwareId: string) {
    const [firmware] = await this.db
      .select()
      .from(projectFirmware)
      .where(and(eq(projectFirmware.id, firmwareId), eq(projectFirmware.projectId, projectId)))
      .limit(1);

    if (!firmware) {
      throw new NotFoundException('projects.firmware_not_found');
    }

    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const offsetNum = firmware.flashOffset ? parseInt(firmware.flashOffset, 16) || 65536 : 65536;

    return {
      name: `${project ? project.title + ' - ' : ''}${firmware.name}`,
      version: firmware.version,
      new_install_prompt_erase: true,
      builds: [
        {
          chipFamily: firmware.chipFamily,
          parts: [
            {
              path: firmware.firmwareUrl,
              offset: offsetNum,
            },
          ],
        },
      ],
    };
  }

  /* =========================================================================
   * ADMIN CRUD METHODS
   * ========================================================================= */

  /**
   * Create new project
   */
  async createProject(
    userId: string,
    dto: CreateProjectDto,
    coverFile?: MulterFile,
  ) {
    let coverImageUrl: string | undefined;

    if (coverFile) {
      const stored = await this.storageService.saveFile('covers', coverFile, 'project_cover');
      coverImageUrl = stored.url;
    }

    const [newProject] = await this.db
      .insert(projects)
      .values({
        title: dto.title,
        description: dto.description,
        coverImageUrl: coverImageUrl || null,
        difficulty: dto.difficulty || 'beginner',
        boardType: dto.boardType || 'ESP32',
        estimatedTime: dto.estimatedTime || { value: 60, unit: 'minutes' },
        isPublished: dto.isPublished || false,
        createdById: userId,
      })
      .returning();

    if (dto.tags && dto.tags.length > 0) {
      const tagInserts = dto.tags.map((tag) => ({
        projectId: newProject.id,
        tag: tag.toLowerCase().trim(),
      }));
      await this.db.insert(projectTags).values(tagInserts);
    }

    return this.getProjectById(newProject.id, true);
  }

  /**
   * Update existing project
   */
  async updateProject(
    id: string,
    dto: UpdateProjectDto,
    coverFile?: MulterFile,
  ) {
    const existing = await this.getProjectById(id, true);

    let coverImageUrl = dto.coverImageUrl;

    if (coverFile) {
      if (existing.coverImageUrl) {
        const parsed = this.storageService.parseUrl(existing.coverImageUrl);
        if (parsed) {
          await this.storageService.deleteFile(parsed.category, parsed.filename);
        }
      }
      const stored = await this.storageService.saveFile('covers', coverFile, 'project_cover');
      coverImageUrl = stored.url;
    }

    const updateData: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.difficulty !== undefined) updateData.difficulty = dto.difficulty;
    if (dto.boardType !== undefined) updateData.boardType = dto.boardType;
    if (dto.estimatedTime !== undefined) updateData.estimatedTime = dto.estimatedTime;
    if (dto.isPublished !== undefined) updateData.isPublished = dto.isPublished;
    if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl;
    if (dto.model3dUrl !== undefined) updateData.model3dUrl = dto.model3dUrl;
    if (dto.model3dFormat !== undefined) updateData.model3dFormat = dto.model3dFormat;

    await this.db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id));

    if (dto.tags !== undefined) {
      await this.db.delete(projectTags).where(eq(projectTags.projectId, id));
      if (dto.tags.length > 0) {
        const tagInserts = dto.tags.map((tag) => ({
          projectId: id,
          tag: tag.toLowerCase().trim(),
        }));
        await this.db.insert(projectTags).values(tagInserts);
      }
    }

    return this.getProjectById(id, true);
  }

  /**
   * Delete project and all files
   */
  async deleteProject(id: string) {
    const project = await this.getProjectById(id, true);

    // Delete cover image
    if (project.coverImageUrl) {
      const parsed = this.storageService.parseUrl(project.coverImageUrl);
      if (parsed) await this.storageService.deleteFile(parsed.category, parsed.filename);
    }

    // Delete 3D model
    if (project.model3dUrl) {
      const parsed = this.storageService.parseUrl(project.model3dUrl);
      if (parsed) await this.storageService.deleteFile(parsed.category, parsed.filename);
    }

    // Delete step images
    for (const step of project.steps) {
      if (step.imageUrl) {
        const parsed = this.storageService.parseUrl(step.imageUrl);
        if (parsed) await this.storageService.deleteFile(parsed.category, parsed.filename);
      }
    }

    // Delete firmware files
    for (const fw of project.firmware) {
      if (fw.firmwareUrl) {
        const parsed = this.storageService.parseUrl(fw.firmwareUrl);
        if (parsed) await this.storageService.deleteFile(parsed.category, parsed.filename);
      }
    }

    await this.db.delete(projects).where(eq(projects.id, id));
    return { message: 'projects.deleted_successfully' };
  }

  /**
   * Toggle project publication
   */
  async togglePublish(id: string, isPublished: boolean) {
    await this.db
      .update(projects)
      .set({ isPublished, updatedAt: new Date() })
      .where(eq(projects.id, id));

    return this.getProjectById(id, true);
  }

  /**
   * Upload 3D Model (.glb, .gltf, .stl)
   */
  async upload3DModel(id: string, modelFile: MulterFile) {
    const project = await this.getProjectById(id, true);

    if (project.model3dUrl) {
      const parsed = this.storageService.parseUrl(project.model3dUrl);
      if (parsed) await this.storageService.deleteFile(parsed.category, parsed.filename);
    }

    const stored = await this.storageService.saveFile('models', modelFile, 'model3d');
    const format = stored.format as 'glb' | 'gltf' | 'stl' | undefined;

    await this.db
      .update(projects)
      .set({
        model3dUrl: stored.url,
        model3dFormat: format || 'glb',
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    return this.getProjectById(id, true);
  }

  /**
   * Remove 3D Model
   */
  async delete3DModel(id: string) {
    const project = await this.getProjectById(id, true);

    if (project.model3dUrl) {
      const parsed = this.storageService.parseUrl(project.model3dUrl);
      if (parsed) await this.storageService.deleteFile(parsed.category, parsed.filename);
    }

    await this.db
      .update(projects)
      .set({
        model3dUrl: null,
        model3dFormat: null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    return this.getProjectById(id, true);
  }

  /* =========================================================================
   * STEP METHODS
   * ========================================================================= */

  async addStep(projectId: string, dto: CreateStepDto, imageFile?: MulterFile) {
    await this.getProjectById(projectId, true);

    let imageUrl: string | undefined;
    if (imageFile) {
      const stored = await this.storageService.saveFile('steps', imageFile, 'step_img');
      imageUrl = stored.url;
    }

    let order = dto.stepOrder;
    if (order === undefined) {
      const [maxOrder] = await this.db
        .select({ max: sql<number>`max(${projectSteps.stepOrder})::int` })
        .from(projectSteps)
        .where(eq(projectSteps.projectId, projectId));
      order = (maxOrder?.max || 0) + 1;
    }

    const [newStep] = await this.db
      .insert(projectSteps)
      .values({
        projectId,
        title: dto.title,
        content: dto.content,
        stepOrder: order,
        imageUrl: imageUrl || null,
        videoUrl: dto.videoUrl || null,
      })
      .returning();

    return newStep;
  }

  async updateStep(
    projectId: string,
    stepId: string,
    dto: UpdateStepDto,
    imageFile?: MulterFile,
  ) {
    const [existing] = await this.db
      .select()
      .from(projectSteps)
      .where(and(eq(projectSteps.id, stepId), eq(projectSteps.projectId, projectId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('projects.step_not_found');
    }

    let imageUrl = dto.imageUrl;
    if (imageFile) {
      if (existing.imageUrl) {
        const parsed = this.storageService.parseUrl(existing.imageUrl);
        if (parsed) await this.storageService.deleteFile(parsed.category, parsed.filename);
      }
      const stored = await this.storageService.saveFile('steps', imageFile, 'step_img');
      imageUrl = stored.url;
    }

    const updateData: Partial<typeof projectSteps.$inferInsert> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.stepOrder !== undefined) updateData.stepOrder = dto.stepOrder;
    if (dto.videoUrl !== undefined) updateData.videoUrl = dto.videoUrl;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const [updated] = await this.db
      .update(projectSteps)
      .set(updateData)
      .where(eq(projectSteps.id, stepId))
      .returning();

    return updated;
  }

  async deleteStep(projectId: string, stepId: string) {
    const [step] = await this.db
      .select()
      .from(projectSteps)
      .where(and(eq(projectSteps.id, stepId), eq(projectSteps.projectId, projectId)))
      .limit(1);

    if (!step) {
      throw new NotFoundException('projects.step_not_found');
    }

    if (step.imageUrl) {
      const parsed = this.storageService.parseUrl(step.imageUrl);
      if (parsed) await this.storageService.deleteFile(parsed.category, parsed.filename);
    }

    await this.db.delete(projectSteps).where(eq(projectSteps.id, stepId));
    return { message: 'projects.step_deleted_successfully' };
  }

  async reorderSteps(projectId: string, stepIds: string[]) {
    await this.getProjectById(projectId, true);

    await Promise.all(
      stepIds.map((id, index) =>
        this.db
          .update(projectSteps)
          .set({ stepOrder: index + 1 })
          .where(and(eq(projectSteps.id, id), eq(projectSteps.projectId, projectId))),
      ),
    );

    return this.db
      .select()
      .from(projectSteps)
      .where(eq(projectSteps.projectId, projectId))
      .orderBy(projectSteps.stepOrder);
  }

  /* =========================================================================
   * MATERIAL METHODS
   * ========================================================================= */

  async addMaterial(projectId: string, dto: CreateMaterialDto, imageFile?: MulterFile) {
    await this.getProjectById(projectId, true);

    let imageUrl: string | undefined;
    if (imageFile) {
      const stored = await this.storageService.saveFile('steps', imageFile, 'mat_img');
      imageUrl = stored.url;
    }

    const [newMaterial] = await this.db
      .insert(projectMaterials)
      .values({
        projectId,
        name: dto.name,
        description: dto.description || null,
        quantity: dto.quantity || 1,
        unit: dto.unit || 'pcs',
        purchaseUrl: dto.purchaseUrl || null,
        imageUrl: imageUrl || null,
        estimatedCost: dto.estimatedCost ? dto.estimatedCost.toString() : null,
        currency: dto.currency || 'USD',
      })
      .returning();

    return newMaterial;
  }

  async updateMaterial(
    projectId: string,
    materialId: string,
    dto: UpdateMaterialDto,
    imageFile?: MulterFile,
  ) {
    const [existing] = await this.db
      .select()
      .from(projectMaterials)
      .where(and(eq(projectMaterials.id, materialId), eq(projectMaterials.projectId, projectId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('projects.material_not_found');
    }

    let imageUrl = existing.imageUrl;
    if (imageFile) {
      if (existing.imageUrl) {
        const parsed = this.storageService.parseUrl(existing.imageUrl);
        if (parsed) await this.storageService.deleteFile(parsed.category, parsed.filename);
      }
      const stored = await this.storageService.saveFile('steps', imageFile, 'mat_img');
      imageUrl = stored.url;
    }

    const updateData: Partial<typeof projectMaterials.$inferInsert> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.purchaseUrl !== undefined) updateData.purchaseUrl = dto.purchaseUrl;
    if (dto.estimatedCost !== undefined)
      updateData.estimatedCost = dto.estimatedCost ? dto.estimatedCost.toString() : null;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const [updated] = await this.db
      .update(projectMaterials)
      .set(updateData)
      .where(eq(projectMaterials.id, materialId))
      .returning();

    return updated;
  }

  async deleteMaterial(projectId: string, materialId: string) {
    const [material] = await this.db
      .select()
      .from(projectMaterials)
      .where(and(eq(projectMaterials.id, materialId), eq(projectMaterials.projectId, projectId)))
      .limit(1);

    if (!material) {
      throw new NotFoundException('projects.material_not_found');
    }

    if (material.imageUrl) {
      const parsed = this.storageService.parseUrl(material.imageUrl);
      if (parsed) await this.storageService.deleteFile(parsed.category, parsed.filename);
    }

    await this.db.delete(projectMaterials).where(eq(projectMaterials.id, materialId));
    return { message: 'projects.material_deleted_successfully' };
  }

  /* =========================================================================
   * FIRMWARE METHODS
   * ========================================================================= */

  async addFirmware(
    projectId: string,
    dto: CreateFirmwareDto,
    firmwareFile: MulterFile,
  ) {
    await this.getProjectById(projectId, true);

    const stored = await this.storageService.saveFile('firmware', firmwareFile, 'fw');

    const [newFirmware] = await this.db
      .insert(projectFirmware)
      .values({
        projectId,
        name: dto.name,
        chipFamily: dto.chipFamily || 'ESP32',
        version: dto.version || '1.0.0',
        firmwareUrl: stored.url,
        flashOffset: dto.flashOffset || '0x10000',
        flashInstructions: dto.flashInstructions || null,
        fileSizeBytes: stored.sizeBytes,
      })
      .returning();

    return newFirmware;
  }

  async deleteFirmware(projectId: string, firmwareId: string) {
    const [firmware] = await this.db
      .select()
      .from(projectFirmware)
      .where(and(eq(projectFirmware.id, firmwareId), eq(projectFirmware.projectId, projectId)))
      .limit(1);

    if (!firmware) {
      throw new NotFoundException('projects.firmware_not_found');
    }

    if (firmware.firmwareUrl) {
      const parsed = this.storageService.parseUrl(firmware.firmwareUrl);
      if (parsed) await this.storageService.deleteFile(parsed.category, parsed.filename);
    }

    await this.db.delete(projectFirmware).where(eq(projectFirmware.id, firmwareId));
    return { message: 'projects.firmware_deleted_successfully' };
  }
}
