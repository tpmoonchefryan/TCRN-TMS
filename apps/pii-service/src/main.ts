// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { NestApplicationOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { createMtlsMiddleware } from './auth/middlewares/mtls.middleware';
import * as fs from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Application options
  const appOptions: NestApplicationOptions = {
    logger: ['error', 'warn', 'log'],
  };

  // HTTPS/mTLS configuration
  // Can be enabled in any environment via TLS_ENABLED=true
  const tlsEnabled = process.env.TLS_ENABLED === 'true';
  
  if (tlsEnabled) {
    const keyPath = process.env.TLS_KEY_PATH;
    const certPath = process.env.TLS_CERT_PATH;
    const caPath = process.env.TLS_CA_PATH;

    if (!keyPath || !certPath) {
      logger.error('TLS_ENABLED=true but TLS_KEY_PATH or TLS_CERT_PATH not set');
      process.exit(1);
    }

    try {
      appOptions.httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
        ca: caPath ? fs.readFileSync(caPath) : undefined,
        requestCert: true,           // Request client certificate
        rejectUnauthorized: true,    // Reject unauthorized certificates
      };
      logger.log('mTLS configuration loaded');
      logger.log(`  Server certificate: ${certPath}`);
      logger.log(`  CA certificate: ${caPath || '(not set)'}`);
    } catch (error) {
      logger.error(`Failed to load TLS certificates: ${error}`);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule, appOptions);

  // Apply mTLS middleware if enabled
  if (tlsEnabled) {
    const configService = app.get(ConfigService);
    app.use(createMtlsMiddleware(configService));
    logger.log('mTLS middleware applied');
  }

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

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Swagger documentation (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TCRN-TMS PII Service')
      .setDescription('PII Data Relay Service API')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Tenant-ID', in: 'header' }, 'tenant-id')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PII_SERVICE_PORT || 5000;
  await app.listen(port);

  logger.log(`PII Service running on port ${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
