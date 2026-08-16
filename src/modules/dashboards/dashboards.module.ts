import { Module } from '@nestjs/common';
import { SensorsModule } from '../sensors/sensors.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';

@Module({
  imports: [SensorsModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
  exports: [DashboardsService],
})
export class DashboardsModule {}
