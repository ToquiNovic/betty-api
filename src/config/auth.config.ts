import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production_32chars!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_change_in_production_32chars!',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
}));
