// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
// Import modules for Swagger definition grouping
import { AuthModule } from './modules/auth';
import { ConfigModule as AppConfigModule } from './modules/config';
import { CustomerModule } from './modules/customer';
import { DelegatedAdminModule } from './modules/delegated-admin';
import { DictionaryModule } from './modules/dictionary';
import { EmailModule } from './modules/email';
import { ExportModule } from './modules/export';
import { HealthModule } from './modules/health/health.module';
import { HomepageModule } from './modules/homepage';
import { ImportModule } from './modules/import';
import { IntegrationModule } from './modules/integration';
import { LogModule } from './modules/log';
import { MarshmallowModule } from './modules/marshmallow';
import { OrganizationModule } from './modules/organization';
import { PermissionModule } from './modules/permission';
import { PiiConfigModule } from './modules/pii-config';
import { PublicModule } from './modules/public';
import { ReportModule } from './modules/report';
import { RoleModule } from './modules/role';
import { SecurityModule } from './modules/security';
import { SettingsModule } from './modules/settings';
import { SubsidiaryModule } from './modules/subsidiary';
import { SystemRoleModule } from './modules/system-role';
import { SystemUserModule } from './modules/system-user';
import { TalentModule } from './modules/talent';
import { TenantModule } from './modules/tenant';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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
    }),
  );

  // Cookie parser middleware
  app.use(cookieParser());

  // CORS configuration
  const corsOrigins = configService.get('CORS_ORIGIN', 'http://localhost:3000').split(',').map(o => o.trim());
  // Ensure localhost:4000 is allowed for dev
  if (!corsOrigins.includes('http://localhost:4000')) {
    corsOrigins.push('http://localhost:4000');
  }
  
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Talent-Id',
      'X-PII-Access-Reason',
    ],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger documentation
  const isProduction = configService.get('NODE_ENV') === 'production';
  const swaggerUser = configService.get('SWAGGER_USER');
  const swaggerPassword = configService.get('SWAGGER_PASSWORD');
  
  // Enable Swagger in all environments, but protect with auth in production
  const enableSwagger = !isProduction || (swaggerUser && swaggerPassword);
  
  if (enableSwagger) {
    const {
      buildSwaggerConfig,
      SWAGGER_OPTIONS,
      OPERATIONS_TAGS,
      CONFIG_TAGS,
      PUBLIC_TAGS,
    } = await import('./config/swagger.config');

    // 1. Operations API Definition
    const operationsConfig = buildSwaggerConfig(
      'TCRN TMS - Operations API',
      'Core business operations API for Frontend Applications',
      '1.0.0',
      OPERATIONS_TAGS,
    );
    const operationsDoc = SwaggerModule.createDocument(app, operationsConfig, {
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
    });
    addGlobalHeaders(operationsDoc);
    // Needed to serve the JSON for the explorer
    SwaggerModule.setup('api/docs/operations', app, operationsDoc, SWAGGER_OPTIONS);

    // 2. System & Config API Definition (Includes Auth)
    const configConfig = buildSwaggerConfig(
      'TCRN TMS - System & Config API',
      'System administration, configuration and authentication API',
      '1.0.0',
      CONFIG_TAGS,
    );
    const configDoc = SwaggerModule.createDocument(app, configConfig, {
      include: [
        AuthModule, // Auth is here as per requirement
        TenantModule,
        SystemUserModule,
        SystemRoleModule,
        AppConfigModule,
        DictionaryModule,
        SecurityModule,
        PiiConfigModule,
        LogModule,
        EmailModule,
        SettingsModule,
        DelegatedAdminModule,
      ],
    });
    addGlobalHeaders(configDoc);
    SwaggerModule.setup('api/docs/config', app, configDoc, SWAGGER_OPTIONS);

    // 3. Public API Definition
    const publicConfig = buildSwaggerConfig(
      'TCRN TMS - Public API',
      'Publicly accessible endpoints',
      '1.0.0',
      PUBLIC_TAGS,
    );
    const publicDoc = SwaggerModule.createDocument(app, publicConfig, {
      include: [PublicModule, HealthModule],
    });
    SwaggerModule.setup('api/docs/public', app, publicDoc, SWAGGER_OPTIONS);

    // In production, protect Swagger with basic auth
    if (isProduction && swaggerUser && swaggerPassword) {
      const basicAuth = (await import('express-basic-auth')).default;
      const authMiddleware = basicAuth({
        users: { [swaggerUser]: swaggerPassword },
        challenge: true,
        realm: 'TCRN TMS API Documentation',
      });
      // Protect all docs routes
      app.use('/api/docs', authMiddleware);
      logger.log('Swagger documentation protected with HTTP Basic Auth');
    }

    // 4. Main Explorer UI
    // Navigate to /api/docs to see the topbar with all definitions
    const explorerOptions = {
      ...SWAGGER_OPTIONS,
      explorer: true,
      // Ensure oauth2RedirectUrl is at top level
      oauth2RedirectUrl: 'http://localhost:4000/api/docs/oauth2-redirect.html',
      swaggerOptions: {
        ...SWAGGER_OPTIONS.swaggerOptions,
        urls: [
          { url: '/api/docs/operations-json', name: 'Operations API' },
          { url: '/api/docs/config-json', name: 'System & Config API' },
          { url: '/api/docs/public-json', name: 'Public API' },
        ],
        // Also set in swaggerOptions for swagger-ui
        oauth2RedirectUrl: 'http://localhost:4000/api/docs/oauth2-redirect.html',
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

bootstrap();

/**
 * Helper to add global headers to all operations
 */
function addGlobalHeaders(document: OpenAPIObject) {
  const paths = Object.keys(document.paths);
  for (const path of paths) {
    const methods = Object.keys(document.paths[path]);
    for (const method of methods) {
      // Filter out non-method keys like 'summary' or 'description' if any (though path item object mainly has methods)
      if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
        const operation = document.paths[path][method];
        if (!operation) continue;
        
        if (!operation.parameters) {
          operation.parameters = [];
        }
        
        // Add X-Tenant-ID
        operation.parameters.push({
          name: 'X-Tenant-ID',
          in: 'header',
          schema: { type: 'string', default: 'tenant_template' },
          required: false,
          description: 'Tenant identifier',
        });
        
        // Add X-Talent-Id
        operation.parameters.push({
          name: 'X-Talent-Id',
          in: 'header',
          schema: { type: 'string' },
          required: false,
          description: 'Talent identifier (optional)',
        });
      }
    }
  }
}
