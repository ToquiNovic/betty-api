import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { ProjectsAdminController, ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [StorageModule],
  controllers: [ProjectsController, ProjectsAdminController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
