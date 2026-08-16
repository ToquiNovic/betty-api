import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import * as mqtt from 'mqtt';
import { DRIZZLE_ORM, DrizzleDb } from '../../database/drizzle.provider';
import { sensorData } from '../../database/schema/sensor-data.schema';
import { sensors } from '../../database/schema/sensors.schema';
import { CacheService } from '../cache/cache.service';
import { MqttWebhookDto } from './application/dtos/mqtt.dto';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient | null = null;

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: DrizzleDb,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  onModuleInit() {
    const brokerUrl = this.configService.get<string>('mqtt.brokerUrl', 'mqtt://localhost:1883');
    const clientId = this.configService.get<string>('mqtt.clientId', 'betty-api-server');
    const username = this.configService.get<string>('mqtt.username', 'betty_system_admin');
    const password = this.configService.get<string>('mqtt.password', 'betty_system_secret');

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId,
        username,
        password,
        reconnectPeriod: 5000,
        connectTimeout: 5000,
      });

      this.client.on('connect', () => {
        this.logger.log(`Connected to EMQX MQTT Broker at ${brokerUrl}`);
      });

      this.client.on('error', (err) => {
        this.logger.warn(`MQTT Client error: ${err.message}`);
      });
    } catch (error) {
      this.logger.warn(`Could not initialize MQTT client: ${error.message}`);
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  /**
   * Ingest sensor data received via EMQX Rule Engine webhook or direct payload
   */
  async ingestData(dto: MqttWebhookDto) {
    // 1. Extract sensor ID from topic: betty/sensor/:id/data or dto.username
    let sensorId = dto.username;
    const topicParts = dto.topic.split('/');
    if (topicParts.length >= 4 && topicParts[0] === 'betty' && topicParts[1] === 'sensor') {
      sensorId = topicParts[2];
    }

    if (!sensorId) {
      throw new BadRequestException('Invalid topic or sensor ID not found');
    }

    // 2. Parse payload
    let rawPayload = dto.payload;
    if (typeof rawPayload === 'string') {
      try {
        rawPayload = JSON.parse(rawPayload);
      } catch {
        rawPayload = { raw_value: rawPayload };
      }
    }

    // 3. Extract origin type: 'sensor' or 'metaverso'
    const originType = rawPayload.origin_type === 'metaverso' ? 'metaverso' : 'sensor';
    const recordedAt = rawPayload.timestamp ? new Date(rawPayload.timestamp) : new Date();

    // 4. Persist to PostgreSQL / TimescaleDB sensor_data table
    const [savedData] = await this.db
      .insert(sensorData)
      .values({
        sensorId,
        originType,
        payload: rawPayload,
        recordedAt,
        receivedAt: new Date(),
      })
      .returning();

    // 5. Invalidate cache for sensor queries in Dragonfly
    await this.cacheService.delPattern(`sensor_data:${sensorId}:*`);

    // 6. Broadcast event to Dragonfly Pub/Sub for Realtime WebSocket push
    const eventPayload = {
      sensorId,
      originType,
      payload: rawPayload,
      recordedAt: savedData.recordedAt,
      receivedAt: savedData.receivedAt,
    };

    await this.cacheService.publish(`sensor:${sensorId}:data`, eventPayload);

    return {
      success: true,
      message: 'sensors.data_saved',
      data: savedData,
    };
  }

  /**
   * Publish command to an IoT device via MQTT
   */
  async publishCommand(sensorId: string, command: string, payload: any = {}): Promise<boolean> {
    if (!this.client || !this.client.connected) {
      this.logger.warn(`Cannot publish to sensor ${sensorId}: MQTT client not connected`);
      return false;
    }

    const topic = `betty/sensor/${sensorId}/command`;
    const message = JSON.stringify({ command, payload, timestamp: new Date().toISOString() });

    return new Promise((resolve) => {
      this.client!.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Error publishing command to ${topic}: ${err.message}`);
          resolve(false);
        } else {
          this.logger.log(`Published command to ${topic}`);
          resolve(true);
        }
      });
    });
  }
}
