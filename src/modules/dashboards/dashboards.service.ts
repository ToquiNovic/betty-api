import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../../database/drizzle.provider';
import { dashboards, dashboardWidgets } from '../../database/schema/dashboards.schema';
import { sensorData } from '../../database/schema/sensor-data.schema';
import { sensors } from '../../database/schema/sensors.schema';
import { CacheService } from '../cache/cache.service';
import { SensorsService } from '../sensors/sensors.service';
import {
  CreateDashboardDto,
  CreateWidgetDto,
  UpdateDashboardDto,
  UpdateWidgetDto,
} from './application/dtos/dashboard.dto';

@Injectable()
export class DashboardsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: DrizzleDb,
    private readonly sensorsService: SensorsService,
    private readonly cacheService: CacheService,
  ) {}

  async createDashboard(userId: string, dto: CreateDashboardDto) {
    const [newDashboard] = await this.db
      .insert(dashboards)
      .values({
        name: dto.name,
        description: dto.description,
        ownerId: userId,
        layout: [],
        isPublic: dto.isPublic || false,
      })
      .returning();

    return newDashboard;
  }

  async getUserDashboards(userId: string) {
    return this.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.ownerId, userId))
      .orderBy(desc(dashboards.createdAt));
  }

  async getPublicDashboards(limit = 20, offset = 0) {
    return this.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.isPublic, true))
      .orderBy(desc(dashboards.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getPublicDashboardById(dashboardId: string) {
    const [dashboard] = await this.db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, dashboardId), eq(dashboards.isPublic, true)))
      .limit(1);

    if (!dashboard) {
      throw new NotFoundException('dashboards.not_found');
    }

    const widgets = await this.db
      .select({
        id: dashboardWidgets.id,
        dashboardId: dashboardWidgets.dashboardId,
        sensorId: dashboardWidgets.sensorId,
        sensorName: sensors.name,
        sensorTopic: sensors.mqttTopic,
        widgetType: dashboardWidgets.widgetType,
        title: dashboardWidgets.title,
        config: dashboardWidgets.config,
        position: dashboardWidgets.position,
        createdAt: dashboardWidgets.createdAt,
      })
      .from(dashboardWidgets)
      .innerJoin(sensors, eq(dashboardWidgets.sensorId, sensors.id))
      .where(eq(dashboardWidgets.dashboardId, dashboardId));

    const enrichedWidgets = await Promise.all(
      widgets.map(async (widget) => {
        const [latestData] = await this.db
          .select()
          .from(sensorData)
          .where(eq(sensorData.sensorId, widget.sensorId))
          .orderBy(desc(sensorData.recordedAt))
          .limit(1);

        return {
          ...widget,
          latestReading: latestData || null,
        };
      }),
    );

    return {
      ...dashboard,
      widgets: enrichedWidgets,
    };
  }

  async togglePublish(dashboardId: string, userId: string, isPublic: boolean) {
    await this.verifyDashboardOwnership(dashboardId, userId);

    const [updated] = await this.db
      .update(dashboards)
      .set({
        isPublic,
        updatedAt: new Date(),
      })
      .where(eq(dashboards.id, dashboardId))
      .returning();

    return updated;
  }

  async getDashboardById(dashboardId: string, userId: string) {
    const [dashboard] = await this.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, dashboardId))
      .limit(1);

    if (!dashboard) {
      throw new NotFoundException('dashboards.not_found');
    }

    if (!dashboard.isPublic && dashboard.ownerId !== userId) {
      throw new ForbiddenException('auth.unauthorized');
    }

    const widgets = await this.db
      .select({
        id: dashboardWidgets.id,
        dashboardId: dashboardWidgets.dashboardId,
        sensorId: dashboardWidgets.sensorId,
        sensorName: sensors.name,
        sensorTopic: sensors.mqttTopic,
        widgetType: dashboardWidgets.widgetType,
        title: dashboardWidgets.title,
        config: dashboardWidgets.config,
        position: dashboardWidgets.position,
        createdAt: dashboardWidgets.createdAt,
      })
      .from(dashboardWidgets)
      .innerJoin(sensors, eq(dashboardWidgets.sensorId, sensors.id))
      .where(eq(dashboardWidgets.dashboardId, dashboardId));

    // Fetch latest data point for each sensor in widget list
    const enrichedWidgets = await Promise.all(
      widgets.map(async (widget) => {
        const [latestData] = await this.db
          .select()
          .from(sensorData)
          .where(eq(sensorData.sensorId, widget.sensorId))
          .orderBy(desc(sensorData.recordedAt))
          .limit(1);

        return {
          ...widget,
          latestReading: latestData || null,
        };
      }),
    );

    return {
      ...dashboard,
      widgets: enrichedWidgets,
    };
  }

  async updateDashboard(dashboardId: string, userId: string, dto: UpdateDashboardDto) {
    await this.verifyDashboardOwnership(dashboardId, userId);

    const [updated] = await this.db
      .update(dashboards)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(dashboards.id, dashboardId))
      .returning();

    return updated;
  }

  async deleteDashboard(dashboardId: string, userId: string) {
    await this.verifyDashboardOwnership(dashboardId, userId);
    await this.db.delete(dashboards).where(eq(dashboards.id, dashboardId));
    return { message: 'common.success' };
  }

  async addWidget(dashboardId: string, userId: string, dto: CreateWidgetDto) {
    await this.verifyDashboardOwnership(dashboardId, userId);

    // Verify user has access to the sensor being added
    await this.sensorsService.verifySensorAccess(dto.sensorId, userId);

    const [widget] = await this.db
      .insert(dashboardWidgets)
      .values({
        dashboardId,
        sensorId: dto.sensorId,
        widgetType: dto.widgetType,
        title: dto.title,
        config: dto.config || {},
        position: dto.position || { x: 0, y: 0, w: 6, h: 4 },
      })
      .returning();

    return widget;
  }

  async updateWidget(
    dashboardId: string,
    widgetId: string,
    userId: string,
    dto: UpdateWidgetDto,
  ) {
    await this.verifyDashboardOwnership(dashboardId, userId);

    const [updated] = await this.db
      .update(dashboardWidgets)
      .set({
        ...dto,
      })
      .where(and(eq(dashboardWidgets.id, widgetId), eq(dashboardWidgets.dashboardId, dashboardId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('dashboards.widget_not_found');
    }

    return updated;
  }

  async deleteWidget(dashboardId: string, widgetId: string, userId: string) {
    await this.verifyDashboardOwnership(dashboardId, userId);

    const deleted = await this.db
      .delete(dashboardWidgets)
      .where(and(eq(dashboardWidgets.id, widgetId), eq(dashboardWidgets.dashboardId, dashboardId)))
      .returning();

    if (deleted.length === 0) {
      throw new NotFoundException('dashboards.widget_not_found');
    }

    return { message: 'common.success' };
  }

  private async verifyDashboardOwnership(dashboardId: string, userId: string) {
    const [dashboard] = await this.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, dashboardId))
      .limit(1);

    if (!dashboard) {
      throw new NotFoundException('dashboards.not_found');
    }

    if (dashboard.ownerId !== userId) {
      throw new ForbiddenException('auth.unauthorized');
    }

    return dashboard;
  }
}
