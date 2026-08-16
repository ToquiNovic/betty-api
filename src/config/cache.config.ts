import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  host: process.env.DRAGONFLY_HOST || 'localhost',
  port: parseInt(process.env.DRAGONFLY_PORT || '6379', 10),
  password: process.env.DRAGONFLY_PASSWORD || 'dragonfly_secret_pass',
  ttlDefault: 3600, // 1 hour default
  ttlSensorData: 300, // 5 min for sensor data caching
}));
