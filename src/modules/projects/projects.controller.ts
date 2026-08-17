import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CreateFirmwareDto,
  CreateMaterialDto,
  CreateProjectDto,
  CreateStepDto,
  ProjectQueryDto,
  ReorderStepsDto,
  UpdateMaterialDto,
  UpdateProjectDto,
  UpdateStepDto,
} from './dto/project.dto';
import { ProjectsService } from './projects.service';
import { IsBoolean } from 'class-validator';
import { MulterFile } from '@/common/types/multer.type';

export class ToggleProjectPublishDto {
  @IsBoolean()
  isPublished: boolean;
}

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all published projects (public)' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  async getPublicProjects(@Query() query: ProjectQueryDto) {
    return this.projectsService.getProjects(query, true);
  }

  @Public()
  @Get(':id/firmware/:firmwareId/manifest')
  @ApiOperation({ summary: 'Get ESP Web Tools manifest JSON for firmware flashing' })
  async getFirmwareManifest(
    @Param('id') id: string,
    @Param('firmwareId') firmwareId: string,
  ) {
    return this.projectsService.getFirmwareManifest(id, firmwareId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full project detail (steps, materials, firmware, 3D model) - requires login' })
  async getProjectDetail(
    @Param('id') id: string,
    @CurrentUser('role') role?: string,
  ) {
    const isSystemAdmin = role === 'admin';
    return this.projectsService.getProjectById(id, isSystemAdmin);
  }
}

@ApiTags('Projects Admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('admin')
@Controller('admin/projects')
export class ProjectsAdminController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects including drafts (admin only)' })
  async getAllProjectsAdmin(@Query() query: ProjectQueryDto) {
    return this.projectsService.getProjects(query, false);
  }

  @Post()
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create new project with optional cover image' })
  async createProject(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
    @UploadedFile() cover?: MulterFile,
  ) {
    return this.projectsService.createProject(userId, dto, cover);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('cover'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update project metadata with optional cover replacement' })
  async updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @UploadedFile() cover?: MulterFile,
  ) {
    return this.projectsService.updateProject(id, dto, cover);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project and all associated files' })
  async deleteProject(@Param('id') id: string) {
    return this.projectsService.deleteProject(id);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish or unpublish project' })
  async togglePublish(
    @Param('id') id: string,
    @Body() dto: ToggleProjectPublishDto,
  ) {
    return this.projectsService.togglePublish(id, dto.isPublished);
  }

  @Post(':id/model')
  @UseInterceptors(FileInterceptor('model'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload or replace 3D model (.glb, .gltf, .stl)' })
  async upload3DModel(
    @Param('id') id: string,
    @UploadedFile() model: MulterFile,
  ) {
    return this.projectsService.upload3DModel(id, model);
  }

  @Delete(':id/model')
  @ApiOperation({ summary: 'Remove 3D model from project' })
  async delete3DModel(@Param('id') id: string) {
    return this.projectsService.delete3DModel(id);
  }

  /* Steps */
  @Post(':id/steps')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Add a step to project' })
  async addStep(
    @Param('id') id: string,
    @Body() dto: CreateStepDto,
    @UploadedFile() image?: MulterFile,
  ) {
    return this.projectsService.addStep(id, dto, image);
  }

  @Patch(':id/steps/:stepId')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update project step' })
  async updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepDto,
    @UploadedFile() image?: MulterFile,
  ) {
    return this.projectsService.updateStep(id, stepId, dto, image);
  }

  @Delete(':id/steps/:stepId')
  @ApiOperation({ summary: 'Delete step from project' })
  async deleteStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
  ) {
    return this.projectsService.deleteStep(id, stepId);
  }

  @Put(':id/steps/reorder')
  @ApiOperation({ summary: 'Reorder project steps' })
  async reorderSteps(
    @Param('id') id: string,
    @Body() dto: ReorderStepsDto,
  ) {
    return this.projectsService.reorderSteps(id, dto.stepIds);
  }

  /* Materials */
  @Post(':id/materials')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Add material to project' })
  async addMaterial(
    @Param('id') id: string,
    @Body() dto: CreateMaterialDto,
    @UploadedFile() image?: MulterFile,
  ) {
    return this.projectsService.addMaterial(id, dto, image);
  }

  @Patch(':id/materials/:materialId')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update project material' })
  async updateMaterial(
    @Param('id') id: string,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateMaterialDto,
    @UploadedFile() image?: MulterFile,
  ) {
    return this.projectsService.updateMaterial(id, materialId, dto, image);
  }

  @Delete(':id/materials/:materialId')
  @ApiOperation({ summary: 'Delete material from project' })
  async deleteMaterial(
    @Param('id') id: string,
    @Param('materialId') materialId: string,
  ) {
    return this.projectsService.deleteMaterial(id, materialId);
  }

  /* Firmware */
  @Post(':id/firmware')
  @UseInterceptors(FileInterceptor('firmware'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload firmware .bin file and register build' })
  async addFirmware(
    @Param('id') id: string,
    @Body() dto: CreateFirmwareDto,
    @UploadedFile() firmware: MulterFile,
  ) {
    return this.projectsService.addFirmware(id, dto, firmware);
  }

  @Delete(':id/firmware/:firmwareId')
  @ApiOperation({ summary: 'Delete firmware from project' })
  async deleteFirmware(
    @Param('id') id: string,
    @Param('firmwareId') firmwareId: string,
  ) {
    return this.projectsService.deleteFirmware(id, firmwareId);
  }
}
