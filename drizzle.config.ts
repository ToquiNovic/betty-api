import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://betty:betty_secret_pass@localhost:5432/betty_db',
  },
  verbose: true,
  strict: true,
});
