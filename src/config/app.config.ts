import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  enableDocs:
    process.env.ENABLE_DOCS === 'true' ||
    process.env.ENABLE_SWAGGER_DOCS === 'true' ||
    (process.env.ENABLE_DOCS !== 'false' && process.env.NODE_ENV !== 'production'),
}));

