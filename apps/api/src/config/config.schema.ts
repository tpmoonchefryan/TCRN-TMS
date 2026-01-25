// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import * as Joi from 'joi';

/**
 * Configuration validation schema
 * Validates environment variables on application startup
 */
export const configValidationSchema = Joi.object({
  // Node environment
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),

  // Application
  API_PORT: Joi.number().default(4000),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_URL: Joi.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.number().default(900), // 15 minutes
  JWT_REFRESH_TTL: Joi.number().default(43200), // 12 hours

  // PII Service (PRD §11.6)
  PII_JWT_TTL: Joi.number().default(300), // 5 minutes
  PII_SERVICE_URL: Joi.string().optional(),

  // MinIO
  MINIO_ENDPOINT: Joi.string().default('localhost:9000'),
  MINIO_ROOT_USER: Joi.string().default('minioadmin'),
  MINIO_ROOT_PASSWORD: Joi.string().optional(),

  // NATS
  NATS_URL: Joi.string().default('nats://localhost:4222'),

  // Import limits (PRD §21)
  IMPORT_MAX_ROWS: Joi.number().default(50000),

  // Rate limiting
  RATE_LIMIT_GLOBAL_POINTS: Joi.number().default(100),
  RATE_LIMIT_GLOBAL_DURATION: Joi.number().default(60),
});
