import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, or } from 'drizzle-orm';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { DRIZZLE_ORM, DrizzleDb } from '../../database/drizzle.provider';
import { apiKeyAuditLog } from '../../database/schema/api-keys.schema';
import { sensorData } from '../../database/schema/sensor-data.schema';
import { sensors } from '../../database/schema/sensors.schema';
import { teamMembers, teams } from '../../database/schema/teams.schema';
import { CacheService } from '../cache/cache.service';
import { TeamsService } from '../teams/teams.service';
import {
  CreateSensorDto,
  QuerySensorDataDto,
  UpdateSensorDto,
} from './application/dtos/sensor.dto';

@Injectable()
export class SensorsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: DrizzleDb,
    private readonly teamsService: TeamsService,
    private readonly cacheService: CacheService,
  ) {}

  async createSensor(
    userId: string,
    dto: CreateSensorDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (dto.teamId) {
      // Verify user belongs to this team
      await this.teamsService.verifyMembership(dto.teamId, userId);
    }

    const { rawKey, keyHash, prefix } = CryptoUtil.generateApiKey();

    const [newSensor] = await this.db
      .insert(sensors)
      .values({
        name: dto.name,
        description: dto.description,
        ownerId: userId,
        teamId: dto.teamId || null,
        apiKeyHash: keyHash,
        apiKeyPrefix: prefix,
        mqttTopic: 'pending', // Will update with ID
        status: 'active',
        metadata: dto.metadata || {},
      })
      .returning();

    const mqttTopic = `betty/sensor/${newSensor.id}/data`;
    await this.db
      .update(sensors)
      .set({ mqttTopic })
      .where(eq(sensors.id, newSensor.id));

    // Audit log
    await this.db.insert(apiKeyAuditLog).values({
      sensorId: newSensor.id,
      action: 'created',
      ipAddress,
      userAgent,
    });

    return {
      ...newSensor,
      mqttTopic,
      rawApiKey: rawKey,
      warning: 'sensors.api_key_generated',
    };
  }

  async getUserSensors(userId: string) {
    // 1. Get user's teams
    const userTeams = await this.db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    const teamIds = userTeams.map((t) => t.teamId);

    // 2. Fetch sensors that are owned by user OR belong to one of user's teams
    const conditions = [eq(sensors.ownerId, userId)];
    if (teamIds.length > 0) {
      conditions.push(inArray(sensors.teamId, teamIds));
    }

    const sensorList = await this.db
      .select({
        id: sensors.id,
        name: sensors.name,
        description: sensors.description,
        ownerId: sensors.ownerId,
        teamId: sensors.teamId,
        apiKeyPrefix: sensors.apiKeyPrefix,
        mqttTopic: sensors.mqttTopic,
        status: sensors.status,
        metadata: sensors.metadata,
        createdAt: sensors.createdAt,
        updatedAt: sensors.updatedAt,
      })
      .from(sensors)
      .where(or(...conditions))
      .orderBy(desc(sensors.createdAt));

    return sensorList;
  }

  async getSensorById(sensorId: string, userId: string) {
    await this.verifySensorAccess(sensorId, userId);

    const [sensor] = await this.db
      .select({
        id: sensors.id,
        name: sensors.name,
        description: sensors.description,
        ownerId: sensors.ownerId,
        teamId: sensors.teamId,
        apiKeyPrefix: sensors.apiKeyPrefix,
        mqttTopic: sensors.mqttTopic,
        status: sensors.status,
        metadata: sensors.metadata,
        createdAt: sensors.createdAt,
        updatedAt: sensors.updatedAt,
      })
      .from(sensors)
      .where(eq(sensors.id, sensorId))
      .limit(1);

    if (!sensor) {
      throw new NotFoundException('sensors.not_found');
    }

    return sensor;
  }

  async updateSensor(sensorId: string, userId: string, dto: UpdateSensorDto) {
    await this.verifySensorOwnerOrAdmin(sensorId, userId);

    const [updated] = await this.db
      .update(sensors)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(sensors.id, sensorId))
      .returning({
        id: sensors.id,
        name: sensors.name,
        description: sensors.description,
        ownerId: sensors.ownerId,
        teamId: sensors.teamId,
        apiKeyPrefix: sensors.apiKeyPrefix,
        mqttTopic: sensors.mqttTopic,
        status: sensors.status,
        metadata: sensors.metadata,
        updatedAt: sensors.updatedAt,
      });

    return updated;
  }

  async rotateApiKey(
    sensorId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.verifySensorOwnerOrAdmin(sensorId, userId);

    const { rawKey, keyHash, prefix } = CryptoUtil.generateApiKey();

    await this.db
      .update(sensors)
      .set({
        apiKeyHash: keyHash,
        apiKeyPrefix: prefix,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(sensors.id, sensorId));

    await this.db.insert(apiKeyAuditLog).values({
      sensorId,
      action: 'rotated',
      ipAddress,
      userAgent,
    });

    return {
      sensorId,
      rawApiKey: rawKey,
      apiKeyPrefix: prefix,
      warning: 'sensors.api_key_rotated',
    };
  }

  async revokeApiKey(
    sensorId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.verifySensorOwnerOrAdmin(sensorId, userId);

    await this.db
      .update(sensors)
      .set({
        status: 'revoked',
        updatedAt: new Date(),
      })
      .where(eq(sensors.id, sensorId));

    await this.db.insert(apiKeyAuditLog).values({
      sensorId,
      action: 'revoked',
      ipAddress,
      userAgent,
    });

    return { message: 'sensors.api_key_revoked' };
  }

  async deleteSensor(sensorId: string, userId: string) {
    await this.verifySensorOwnerOrAdmin(sensorId, userId);
    await this.db.delete(sensors).where(eq(sensors.id, sensorId));
    // Clear sensor cache
    await this.cacheService.delPattern(`sensor_data:${sensorId}:*`);
    return { message: 'common.success' };
  }

  async getSensorData(sensorId: string, userId: string, query: QuerySensorDataDto) {
    await this.verifySensorAccess(sensorId, userId);

    const cacheKey = `sensor_data:${sensorId}:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const conditions = [eq(sensorData.sensorId, sensorId)];

    if (query.originType) {
      conditions.push(eq(sensorData.originType, query.originType));
    }
    if (query.startDate) {
      conditions.push(gte(sensorData.recordedAt, new Date(query.startDate)));
    }
    if (query.endDate) {
      conditions.push(lte(sensorData.recordedAt, new Date(query.endDate)));
    }

    const data = await this.db
      .select()
      .from(sensorData)
      .where(and(...conditions))
      .orderBy(desc(sensorData.recordedAt))
      .limit(query.limit || 100);

    // Cache results for 60 seconds
    await this.cacheService.set(cacheKey, data, 60);

    return data;
  }

  // --- Access Control Helpers ---

  async verifySensorAccess(sensorId: string, userId: string) {
    const [sensor] = await this.db.select().from(sensors).where(eq(sensors.id, sensorId)).limit(1);
    if (!sensor) {
      throw new NotFoundException('sensors.not_found');
    }

    // If owned directly
    if (sensor.ownerId === userId) {
      return sensor;
    }

    // If associated with a team, check membership
    if (sensor.teamId) {
      await this.teamsService.verifyMembership(sensor.teamId, userId);
      return sensor;
    }

    throw new ForbiddenException('sensors.access_denied');
  }

  async verifySensorOwnerOrAdmin(sensorId: string, userId: string) {
    const [sensor] = await this.db.select().from(sensors).where(eq(sensors.id, sensorId)).limit(1);
    if (!sensor) {
      throw new NotFoundException('sensors.not_found');
    }

    if (sensor.ownerId === userId) {
      return sensor;
    }

    if (sensor.teamId) {
      await this.teamsService.verifyRole(sensor.teamId, userId, ['owner', 'admin']);
      return sensor;
    }

    throw new ForbiddenException('sensors.access_denied');
  }
}
