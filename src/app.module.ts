import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import cacheConfig from './config/cache.config';
import databaseConfig from './config/database.config';
import mqttConfig from './config/mqtt.config';
import resendConfig from './config/resend.config';
import storageConfig from './config/storage.config';
import { DrizzleModule } from './database/drizzle.module';
import { AppI18nModule } from './i18n/i18n.module';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from './modules/cache/cache.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';
import { EmailModule } from './modules/email/email.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RolesModule } from './modules/roles/roles.module';
import { SensorsModule } from './modules/sensors/sensors.module';
import { StorageModule } from './modules/storage/storage.module';
import { TeamsModule } from './modules/teams/teams.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        cacheConfig,
        mqttConfig,
        authConfig,
        resendConfig,
        storageConfig,
      ],
      envFilePath: ['.env'],
    }),
    AppI18nModule,
    DrizzleModule,
    CacheModule,
    EmailModule,
    RolesModule,
    UsersModule,
    AuthModule,
    TeamsModule,
    SensorsModule,
    MqttModule,
    DashboardsModule,
    RealtimeModule,
    StorageModule,
    ProjectsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}

