// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Common
import { JwtAuthGuard } from './common/guards';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { configValidationSchema } from './config/config.schema';

// Core modules
import { AuthModule } from './modules/auth';

// Organization modules

// Permission & Role modules
import { DelegatedAdminModule } from './modules/delegated-admin';
import { SystemRoleModule } from './modules/system-role';
import { SystemUserModule } from './modules/system-user';

// Dictionary & Config modules
import { ConfigModule as AppConfigModule } from './modules/config';
import { DictionaryModule } from './modules/dictionary';

// Log module
import { LogModule } from './modules/log';

// Customer module
import { CustomerModule } from './modules/customer';
import { DatabaseModule } from './modules/database';
import { HealthModule } from './modules/health/health.module';

// PII module

// PII Config module

// Queue module
import { QueueModule } from './modules/queue';

// Import/Export modules
import { ImportModule } from './modules/import';
import { ExportModule } from './modules/export';

// Homepage module
import { HomepageModule } from './modules/homepage';

// Marshmallow module
import { MarshmallowModule } from './modules/marshmallow';

// Report module
import { ReportModule } from './modules/report';

// Integration module
import { IntegrationModule } from './modules/integration';
import { MinioModule } from './modules/minio';
import { OrganizationModule } from './modules/organization';
import { PermissionModule } from './modules/permission';
import { PiiModule } from './modules/pii';
import { PiiConfigModule } from './modules/pii-config';
import { RedisModule } from './modules/redis';
import { RoleModule } from './modules/role';

// Security module
import { SecurityModule } from './modules/security';
import { FingerprintInterceptor } from './modules/security/interceptors/fingerprint.interceptor';
import { GlobalRateLimitMiddleware } from './modules/security/middleware/rate-limit.middleware';

// Email module
import { EmailModule } from './modules/email';

// Settings module
import { SettingsModule } from './modules/settings';
import { SubsidiaryModule } from './modules/subsidiary';
import { TalentModule } from './modules/talent';
import { TenantMiddleware, TenantModule } from './modules/tenant';
@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: configValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    
    // Schedule module for cron jobs
    ScheduleModule.forRoot(),
    
    // Core infrastructure modules
    DatabaseModule,
    RedisModule,
    MinioModule,
    TenantModule,
    
    // Feature modules
    HealthModule,
    AuthModule,
    
    // Organization modules
    SubsidiaryModule,
    TalentModule,
    OrganizationModule,
    
    // Permission & Role modules
    PermissionModule,
    RoleModule,
    DelegatedAdminModule,
    SystemUserModule,
    SystemRoleModule,
    
    // Dictionary & Config modules
    DictionaryModule,
    AppConfigModule,
    
    // Log module
    LogModule,
    
    // Customer module
    CustomerModule,
    
    // PII module
    PiiModule,
    
    // PII Config module
    PiiConfigModule,
    
    // Queue module (for background jobs)
    QueueModule,
    
    // Import/Export modules
    ImportModule,
    ExportModule,
    
    // Homepage module
    HomepageModule,
    
    // Marshmallow module
    MarshmallowModule,
    
    // Report module
    ReportModule,
    
    // Integration module
    IntegrationModule,
    
    // Security module
    SecurityModule,
    
    // Email module
    EmailModule,
    
    // Settings module
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Technical fingerprint interceptor - adds X-TCRN-FP header to all authenticated responses
    {
      provide: APP_INTERCEPTOR,
      useClass: FingerprintInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply rate limit middleware to API routes
    consumer
      .apply(GlobalRateLimitMiddleware)
      .forRoutes({ path: 'api/v1/*path', method: RequestMethod.ALL });
    
    // Apply tenant middleware to all routes except excluded ones
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/*path', method: RequestMethod.ALL },
        { path: 'api/docs', method: RequestMethod.ALL },
        { path: 'api/docs/*path', method: RequestMethod.ALL },
      )
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
