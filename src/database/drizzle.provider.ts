import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE_ORM = 'DRIZZLE_ORM';
export type DrizzleDb = PostgresJsDatabase<typeof schema>;

export const DrizzleProvider: FactoryProvider = {
  provide: DRIZZLE_ORM,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const connectionString =
      configService.get<string>('database.url') ||
      'postgres://betty:betty_secret_pass@localhost:5432/betty_db';

    // Interop safety for postgres default export across CJS / ESM
    const postgresClient = typeof postgres === 'function' ? postgres : (postgres as any).default;

    const client = postgresClient(connectionString, {
      max: 20,
      idle_timeout: 30,
      connect_timeout: 10,
    });

    return drizzle(client, { schema });
  },
};
