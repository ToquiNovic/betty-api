import { registerAs } from '@nestjs/config';

export default registerAs('mqtt', () => ({
  brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  clientId: process.env.MQTT_CLIENT_ID || 'betty-api-server',
  username: process.env.MQTT_USERNAME || 'betty_system_admin',
  password: process.env.MQTT_PASSWORD || 'betty_system_secret',
}));
