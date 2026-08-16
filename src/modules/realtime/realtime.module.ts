import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DashboardsModule } from '../dashboards/dashboards.module';
import { SensorsModule } from '../sensors/sensors.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [ConfigModule, JwtModule.register({}), SensorsModule, DashboardsModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
