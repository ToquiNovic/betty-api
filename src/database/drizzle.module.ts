import { Global, Inject, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleProvider, DRIZZLE_ORM, DrizzleDb } from './drizzle.provider';
import { seedRoles } from './seeds/roles.seed';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [DrizzleProvider],
  exports: [DRIZZLE_ORM],
})
export class DrizzleModule implements OnModuleInit {
  private readonly logger = new Logger(DrizzleModule.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: DrizzleDb,
  ) {}

  async onModuleInit() {
    try {
      await seedRoles(this.db);
      this.logger.log('Default system roles initialized in database');
    } catch (err) {
      this.logger.warn(`Could not seed roles: ${err.message}`);
    }
  }
}
