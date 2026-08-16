import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './domain/ports/user.repository.port';
import { DrizzleUserRepository } from './infrastructure/repositories/drizzle-user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY,
      useClass: DrizzleUserRepository,
    },
  ],
  exports: [UsersService, USER_REPOSITORY],
})
export class UsersModule {}
