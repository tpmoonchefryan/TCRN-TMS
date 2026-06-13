// SPDX-License-Identifier: Apache-2.0
import * as Joi from 'joi';

const httpUrlSchema = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .empty('');

/**
 * Configuration validation schema
 * Validates environment variables on application startup
 */
export const configValidationSchema = Joi.object({
  // Node environment
  NODE_ENV: Joi.string()
    .valid('development', 'shared_dev', 'staging', 'production', 'test')
    .default('development'),

  // Application
  API_PORT: Joi.number().default(4000),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  FRONTEND_URL: httpUrlSchema.default('http://localhost:3000'), // URL for email links (password reset, verification, etc.)
  APP_URL: httpUrlSchema.default('http://localhost:3000'), // Public-facing app URL (homepage, marshmallow, etc.)

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_URL: Joi.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.number().default(900), // 15 minutes
  JWT_REFRESH_TTL: Joi.number().default(43200), // 12 hours

  // MinIO
  MINIO_ENDPOINT: Joi.string().default('localhost:9000'),
  MINIO_ROOT_USER: Joi.string().default('minioadmin'),
  MINIO_ROOT_PASSWORD: Joi.string().optional(),
  MINIO_USE_SSL: Joi.boolean().default(false),

  // NATS
  NATS_URL: Joi.string().default('nats://localhost:4222'),

  // Webhook delivery adapter
  WEBHOOK_REQUIRE_HTTPS: Joi.boolean().default(true),
  WEBHOOK_TARGET_RESOLVE_DNS: Joi.boolean().default(false),
  WEBHOOK_DELIVERY_DISPATCH_MODE: Joi.string()
    .valid('disabled', 'local_stub', 'local_dispatch', 'provider_dispatch')
    .default('disabled'),

  // Event backbone adapter
  EVENT_BACKBONE_MODE: Joi.string()
    .valid('disabled', 'local_stub', 'mirror_only', 'selected_event_stream', 'external_provided')
    .default('disabled'),

  // Import limits (PRD §21)
  IMPORT_MAX_ROWS: Joi.number().default(50000),

  // Rate limiting
  RATE_LIMIT_GLOBAL_POINTS: Joi.number().default(100),
  RATE_LIMIT_GLOBAL_DURATION: Joi.number().default(60),
});
