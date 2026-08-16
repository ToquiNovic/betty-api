import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');

  // Security headers & compression
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global API Prefix
  app.setGlobalPrefix(apiPrefix);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // OpenAPI Specification for Scalar
  const openApiConfig = new DocumentBuilder()
    .setTitle('Betty PaaS API')
    .setDescription(
      'Plataforma IoT Open Source para Gemelos Digitales, Metaversos y Entornos Inteligentes. ' +
        'Permite gestión de equipos, registro de sensores IoT, ingesta MQTT de alta velocidad, ' +
        'y visualización en tiempo real mediante WebSockets y tableros personalizados.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Autenticación mediante Email/Contraseña y Google OAuth 2.0')
    .addTag('Users', 'Gestión de perfil de usuario y administración')
    .addTag('Teams', 'Equipos, roles de equipo, membresías e invitaciones por código o link')
    .addTag('Sensors', 'Sensores IoT/Metaverso, API Keys y series temporales')
    .addTag('MQTT Integration', 'Endpoints de autenticación HTTP y webhook para EMQX')
    .addTag('Dashboards', 'Tableros públicos y privados con widgets configurables en tiempo real')
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);

  // Scalar Interactive API Reference Documentation
  app.use(
    `/${apiPrefix}/docs`,
    apiReference({
      spec: {
        content: openApiDocument,
      },
      theme: 'purple',
      darkMode: true,
      layout: 'modern',
      defaultHttpClient: {
        targetKey: 'js',
        clientKey: 'fetch',
      },
    }),
  );

  // Enable shutdown hooks
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`🚀 Betty API running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📑 Scalar API Documentation available on: http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`🔌 WebSocket Gateway available at ws://localhost:${port}/realtime`);
}

bootstrap();
