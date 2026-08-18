import { Global, Inject, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleProvider, DRIZZLE_ORM, DrizzleDb } from './drizzle.provider';
import { seedRoles } from './seeds/roles.seed';
import * as fs from 'fs';
import * as path from 'path';
import { sql } from 'drizzle-orm';

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
      await this.runMigrations();
    } catch (err: any) {
      this.logger.warn(`Migration check completed with notice: ${err.message}`);
    }

    try {
      await seedRoles(this.db);
      this.logger.log('Default system roles initialized in database');
    } catch (err: any) {
      this.logger.warn(`Could not seed roles: ${err.message}`);
    }
  }

  private async runMigrations() {
    const possiblePaths = [
      path.resolve(__dirname, 'migrations'),
      path.resolve(__dirname, '../database/migrations'),
      path.resolve(process.cwd(), 'src/database/migrations'),
      path.resolve(process.cwd(), 'dist/src/database/migrations'),
    ];

    let migrationsDir: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        migrationsDir = p;
        break;
      }
    }

    if (!migrationsDir) {
      this.logger.debug('No migrations directory found, skipping auto-migration');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      try {
        const filePath = path.join(migrationsDir, file);
        const sqlContent = fs.readFileSync(filePath, 'utf-8');
        const statements = sqlContent
          .split('--> statement-breakpoint')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          await this.db.execute(sql.raw(statement));
        }
        this.logger.log(`Migration ${file} applied successfully`);
      } catch (err: any) {
        if (
          err.message?.includes('already exists') ||
          err.code === '42P07' ||
          err.code === '42710'
        ) {
          this.logger.debug(`Migration ${file} already applied`);
        } else {
          this.logger.warn(`Migration ${file} notice: ${err.message}`);
        }
      }
    }
  }
}
