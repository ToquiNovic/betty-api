import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { eq } from 'drizzle-orm';
import { Public } from '../../common/decorators/public.decorator';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { DRIZZLE_ORM, DrizzleDb } from '../../database/drizzle.provider';
import { sensors } from '../../database/schema/sensors.schema';
import { Inject } from '@nestjs/common';
import { MqttAuthDto } from './application/dtos/mqtt.dto';

@ApiTags('MQTT Integration')
@Controller('mqtt/auth')
export class MqttAuthController {
  private readonly logger = new Logger(MqttAuthController.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: DrizzleDb,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'EMQX HTTP Authentication Hook endpoint' })
  @ApiResponse({ status: 200, description: 'EMQX Auth response ({ result: allow | deny })' })
  async authenticate(@Body() dto: MqttAuthDto) {
    const { username, password } = dto;

    // 1. Check if it's the system internal admin client
    const systemUsername = this.configService.get<string>('mqtt.username', 'betty_system_admin');
    const systemPassword = this.configService.get<string>('mqtt.password', 'betty_system_secret');

    if (username === systemUsername && password === systemPassword) {
      return {
        result: 'allow',
        is_superuser: true,
      };
    }

    // 2. Validate sensor credentials (username = sensorId, password = rawApiKey)
    const keyHash = CryptoUtil.hashSha256(password);

    const [sensor] = await this.db
      .select({
        id: sensors.id,
        status: sensors.status,
        apiKeyHash: sensors.apiKeyHash,
      })
      .from(sensors)
      .where(eq(sensors.id, username))
      .limit(1);

    if (!sensor || sensor.status !== 'active' || sensor.apiKeyHash !== keyHash) {
      this.logger.warn(`MQTT Auth rejected for sensor username: ${username}`);
      return {
        result: 'deny',
      };
    }

    return {
      result: 'allow',
      is_superuser: false,
    };
  }
}
