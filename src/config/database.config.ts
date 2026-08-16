import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgres://betty:betty_secret_pass@localhost:5432/betty_db',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'betty',
  password: process.env.POSTGRES_PASSWORD || 'betty_secret_pass',
  db: process.env.POSTGRES_DB || 'betty_db',
}));
