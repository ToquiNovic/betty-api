import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MqttWebhookDto } from './application/dtos/mqtt.dto';
import { MqttService } from './mqtt.service';

@ApiTags('MQTT Integration')
@Controller('mqtt')
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'EMQX Rule Engine Webhook endpoint for ingested sensor data' })
  @ApiResponse({ status: 200, description: 'Sensor data saved and broadcasted to WebSocket clients' })
  async handleWebhook(@Body() dto: MqttWebhookDto) {
    return this.mqttService.ingestData(dto);
  }
}
