// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiLogger } from './common/logger/api-logger';
import { createTraceIdMiddleware } from './common/trace/trace-id.middleware';
import { applyGlobalSwaggerParameters } from './config/swagger-global-parameters';
// Import modules for Swagger definition grouping
import { ApiRegistryModule } from './modules/api-registry';
import { AuthModule } from './modules/auth';
import { BuilderRegistryModule } from './modules/builder-registry';
import { ConfigModule as AppConfigModule } from './modules/config';
import { CustomerModule } from './modules/customer';
import { DelegatedAdminModule } from './modules/delegated-admin';
import { DictionaryModule } from './modules/dictionary';
import { EmailModule } from './modules/email';
import { EventBackboneModule } from './modules/event-backbone';
import { ExportModule } from './modules/export';
import { HealthModule } from './modules/health/health.module';
import { HomepageModule } from './modules/homepage';
import { ImportModule } from './modules/import';
import { IntegrationModule } from './modules/integration';
import { LogModule } from './modules/log';
import { MarshmallowModule } from './modules/marshmallow';
import { ObservabilityAdaptersModule } from './modules/observability-adapters';
import { OrganizationModule } from './modules/organization';
import { PermissionModule } from './modules/permission';
import { PiiConfigModule } from './modules/pii-config';
import { PlatformToolsModule } from './modules/platform-tools';
import { PublicModule } from './modules/public';
import { ReportModule } from './modules/report';
import { RoleModule } from './modules/role';
import { RuntimeFlagsModule } from './modules/runtime-flags';
import { SecurityModule } from './modules/security';
import { SettingsModule } from './modules/settings';
import { SubsidiaryModule } from './modules/subsidiary';
import { SystemRoleModule } from './modules/system-role';
import { SystemUserModule } from './modules/system-user';
import { TalentModule } from './modules/talent';
import { TenantModule } from './modules/tenant';

const logger = new Logger('Bootstrap');

function cloneSerializableSwaggerValue<T>(value: T, stack = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (stack.has(value)) {
    return undefined as T;
  }

  stack.add(value);

  if (Array.isArray(value)) {
    const clonedArray = value
      .map((item) => cloneSerializableSwaggerValue(item, stack))
      .filter((item) => item !== undefined);

    stack.delete(value);
    return clonedArray as T;
  }

  const clonedObject: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    const clonedItem = cloneSerializableSwaggerValue(item, stack);

    if (clonedItem !== undefined) {
      clonedObject[key] = clonedItem;
    }
  }

  stack.delete(value);
  return clonedObject as T;
}

function createSerializableSwaggerDocument<T>(document: T): T {
  return cloneSerializableSwaggerValue(document);
}

// Loaded after telemetry initialization so OTEL auto-instrumentation can patch runtime deps.
export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new ApiLogger(),
  });
  const configService = app.get(ConfigService);

  app.use(createTraceIdMiddleware());

  // Security middleware - configured to allow Swagger UI
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    })
  );

  // Cookie parser middleware
  app.use(cookieParser());

  // CORS configuration
  const isProduction = configService.get('NODE_ENV') === 'production';
  const corsOrigins = configService
    .get('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!isProduction && !corsOrigins.includes('http://localhost:4000')) {
    corsOrigins.push('http://localhost:4000');
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      // Compatibility-only runtime context headers remain accepted during Batch 1.
      'X-Tenant-ID',
      'X-Talent-Id',
      'X-PII-Access-Reason',
      'X-Trace-ID',
      'X-Request-ID',
    ],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipes
  // 1. ZodValidationPipe for Zod DTOs (createZodDto)
  // 2. ValidationPipe for class-validator DTOs (legacy compatibility)
  app.useGlobalPipes(
    new ZodValidationPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger documentation
  const swaggerUser = configService.get('SWAGGER_USER');
  const swaggerPassword = configService.get('SWAGGER_PASSWORD');
  const { resolveSwaggerExposurePolicy } = await import('./config/swagger.config');
  const swaggerExposurePolicy = resolveSwaggerExposurePolicy(
    configService.get('NODE_ENV', 'development')
  );

  const enableSwagger = swaggerExposurePolicy.enabled;

  if (enableSwagger) {
    if (swaggerExposurePolicy.authRequirement === 'basic_auth_required') {
      const basicAuth = (await import('express-basic-auth')).default;
      const authMiddleware = basicAuth({
        users: { [swaggerUser]: swaggerPassword },
        challenge: true,
        realm: 'TCRN TMS API Documentation',
      });
      app.use('/api/docs', authMiddleware);
      logger.log(
        `Swagger documentation protected with HTTP Basic Auth for ${swaggerExposurePolicy.environment}`
      );
    }

    const { buildSwaggerConfig, SWAGGER_OPTIONS, OPERATIONS_TAGS, CONFIG_TAGS, PUBLIC_TAGS } =
      await import('./config/swagger.config');

    // 1. Operations API Definition
    const operationsConfig = buildSwaggerConfig(
      'TCRN TMS - Operations API',
      'Core business operations API for Frontend Applications',
      '1.0.0',
      OPERATIONS_TAGS
    );
    const operationsDoc = createSerializableSwaggerDocument(
      SwaggerModule.createDocument(app, operationsConfig, {
        include: [
          OrganizationModule,
          SubsidiaryModule,
          TalentModule,
          CustomerModule,
          ImportModule,
          ExportModule,
          MarshmallowModule,
          HomepageModule,
          ReportModule,
          IntegrationModule,
          RoleModule,
          PermissionModule,
        ],
        extraModels: [],
      })
    );
    applyGlobalSwaggerParameters(operationsDoc);
    // Needed to serve the JSON for the explorer
    SwaggerModule.setup('api/docs/operations', app, operationsDoc, SWAGGER_OPTIONS);

    // 2. System & Config API Definition (Includes Auth)
    const configConfig = buildSwaggerConfig(
      'TCRN TMS - System & Config API',
      'System administration, configuration and authentication API',
      '1.0.0',
      CONFIG_TAGS
    );
    const configDoc = createSerializableSwaggerDocument(
      SwaggerModule.createDocument(app, configConfig, {
        include: [
          AuthModule, // Auth is here as per requirement
          TenantModule,
          SystemUserModule,
          SystemRoleModule,
          AppConfigModule,
          DictionaryModule,
          SecurityModule,
          PiiConfigModule,
          ApiRegistryModule,
          PlatformToolsModule,
          ObservabilityAdaptersModule,
          RuntimeFlagsModule,
          EventBackboneModule,
          BuilderRegistryModule,
          LogModule,
          EmailModule,
          SettingsModule,
          DelegatedAdminModule,
        ],
      })
    );
    applyGlobalSwaggerParameters(configDoc);
    SwaggerModule.setup('api/docs/config', app, configDoc, SWAGGER_OPTIONS);

    // 3. Public API Definition
    const publicConfig = buildSwaggerConfig(
      'TCRN TMS - Public API',
      'Publicly accessible endpoints',
      '1.0.0',
      PUBLIC_TAGS
    );
    const publicDoc = createSerializableSwaggerDocument(
      SwaggerModule.createDocument(app, publicConfig, {
        include: [PublicModule, HealthModule],
      })
    );
    SwaggerModule.setup('api/docs/public', app, publicDoc, SWAGGER_OPTIONS);

    // 4. Main Explorer UI
    // Navigate to /api/docs to see the topbar with all definitions
    const oauth2RedirectPath = '/api/docs/oauth2-redirect.html';
    const explorerOptions = {
      ...SWAGGER_OPTIONS,
      explorer: true,
      oauth2RedirectUrl: oauth2RedirectPath,
      swaggerOptions: {
        ...SWAGGER_OPTIONS.swaggerOptions,
        urls: [
          { url: '/api/docs/operations-json', name: 'Operations API' },
          { url: '/api/docs/config-json', name: 'System & Config API' },
          { url: '/api/docs/public-json', name: 'Public API' },
        ],
        oauth2RedirectUrl: oauth2RedirectPath,
      },
    };

    // We pass undefined as document because we are using urls to load remote documents
    SwaggerModule.setup('api/docs', app, undefined, explorerOptions);
  }

  const port = configService.get('API_PORT', 3001);
  await app.listen(port);

  logger.log(`TCRN TMS API is running on: http://localhost:${port}`);
  if (enableSwagger) {
    logger.log(`API Documentation: http://localhost:${port}/api/docs`);
  }
  logger.log(`Environment: ${configService.get('NODE_ENV', 'development')}`);
}
