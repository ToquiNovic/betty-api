import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MqttAuthController } from './mqtt-auth.controller';
import { MqttController } from './mqtt.controller';
import { MqttService } from './mqtt.service';

@Module({
  imports: [ConfigModule],
  controllers: [MqttAuthController, MqttController],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
