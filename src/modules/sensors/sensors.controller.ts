import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateSensorDto,
  QuerySensorDataDto,
  UpdateSensorDto,
} from './application/dtos/sensor.dto';
import { SensorsService } from './sensors.service';

@ApiTags('Sensors')
@ApiBearerAuth()
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new sensor (private or for a team)' })
  @ApiResponse({
    status: 201,
    description: 'Sensor registered. Returns raw API key ONCE.',
  })
  async createSensor(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSensorDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.sensorsService.createSensor(userId, dto, ip, userAgent);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of available sensors (owned + team sensors)' })
  async getUserSensors(@CurrentUser('id') userId: string) {
    return this.sensorsService.getUserSensors(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sensor details by ID' })
  async getSensorById(
    @Param('id') sensorId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.sensorsService.getSensorById(sensorId, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sensor information' })
  async updateSensor(
    @Param('id') sensorId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSensorDto,
  ) {
    return this.sensorsService.updateSensor(sensorId, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sensor and its data' })
  async deleteSensor(
    @Param('id') sensorId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.sensorsService.deleteSensor(sensorId, userId);
  }

  @Post(':id/api-key/rotate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate sensor API Key (returns new raw key once)' })
  async rotateApiKey(
    @Param('id') sensorId: string,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.sensorsService.rotateApiKey(sensorId, userId, ip, userAgent);
  }

  @Post(':id/api-key/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke sensor API Key (deactivates sensor ingestion)' })
  async revokeApiKey(
    @Param('id') sensorId: string,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.sensorsService.revokeApiKey(sensorId, userId, ip, userAgent);
  }

  @Get(':id/data')
  @ApiOperation({ summary: 'Query time-series sensor data with optional filters' })
  async getSensorData(
    @Param('id') sensorId: string,
    @CurrentUser('id') userId: string,
    @Query() query: QuerySensorDataDto,
  ) {
    return this.sensorsService.getSensorData(sensorId, userId, query);
  }
}
