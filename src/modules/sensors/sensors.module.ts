import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';

@Module({
  imports: [TeamsModule],
  controllers: [SensorsController],
  providers: [SensorsService],
  exports: [SensorsService],
})
export class SensorsModule {}
