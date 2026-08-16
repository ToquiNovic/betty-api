import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  CreateDashboardDto,
  CreateWidgetDto,
  UpdateDashboardDto,
  UpdateWidgetDto,
} from './application/dtos/dashboard.dto';
import { DashboardsService } from './dashboards.service';
import { IsBoolean } from 'class-validator';

export class TogglePublishDto {
  @IsBoolean()
  isPublic: boolean;
}

@ApiTags('Dashboards')
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'List all public dashboards (no auth required)' })
  @ApiResponse({ status: 200, description: 'List of publicly accessible dashboards' })
  async getPublicDashboards(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.dashboardsService.getPublicDashboards(limit, offset);
  }

  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'View a public dashboard with real-time metrics (no auth required)' })
  @ApiResponse({ status: 200, description: 'Public dashboard details and widgets' })
  async getPublicDashboardById(@Param('id') dashboardId: string) {
    return this.dashboardsService.getPublicDashboardById(dashboardId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard created successfully' })
  async createDashboard(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDashboardDto,
  ) {
    return this.dashboardsService.createDashboard(userId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all private and owned dashboards of the current user' })
  async getUserDashboards(@CurrentUser('id') userId: string) {
    return this.dashboardsService.getUserDashboards(userId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard with all widgets and latest sensor data' })
  async getDashboardById(
    @Param('id') dashboardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dashboardsService.getDashboardById(dashboardId, userId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update dashboard title, description, isPublic or layout grid' })
  async updateDashboard(
    @Param('id') dashboardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDashboardDto,
  ) {
    return this.dashboardsService.updateDashboard(dashboardId, userId, dto);
  }

  @Patch(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish or unpublish dashboard to make it publicly accessible' })
  async togglePublish(
    @Param('id') dashboardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: TogglePublishDto,
  ) {
    return this.dashboardsService.togglePublish(dashboardId, userId, dto.isPublic);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete dashboard and all its widgets' })
  async deleteDashboard(
    @Param('id') dashboardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dashboardsService.deleteDashboard(dashboardId, userId);
  }

  @Post(':id/widgets')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new widget to dashboard linked to a sensor' })
  async addWidget(
    @Param('id') dashboardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWidgetDto,
  ) {
    return this.dashboardsService.addWidget(dashboardId, userId, dto);
  }

  @Patch(':id/widgets/:widgetId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update widget configuration or position' })
  async updateWidget(
    @Param('id') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWidgetDto,
  ) {
    return this.dashboardsService.updateWidget(dashboardId, widgetId, userId, dto);
  }

  @Delete(':id/widgets/:widgetId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a widget from dashboard' })
  async deleteWidget(
    @Param('id') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dashboardsService.deleteWidget(dashboardId, widgetId, userId);
  }
}
