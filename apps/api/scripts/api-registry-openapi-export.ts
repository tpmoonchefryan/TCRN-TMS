// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

import { AppModule } from '../src/app.module';
import { applyGlobalSwaggerParameters } from '../src/config/swagger-global-parameters';
import { buildSwaggerConfig, CONFIG_TAGS, OPERATIONS_TAGS, PUBLIC_TAGS } from '../src/config/swagger.config';
import { ApiRegistryModule } from '../src/modules/api-registry';
import { AuthModule } from '../src/modules/auth';
import { ConfigModule as AppConfigModule } from '../src/modules/config';
import { CustomerModule } from '../src/modules/customer';
import { DelegatedAdminModule } from '../src/modules/delegated-admin';
import { DictionaryModule } from '../src/modules/dictionary';
import { EmailModule } from '../src/modules/email';
import { EventBackboneModule } from '../src/modules/event-backbone';
import { ExportModule } from '../src/modules/export';
import { HealthModule } from '../src/modules/health/health.module';
import { HomepageModule } from '../src/modules/homepage';
import { ImportModule } from '../src/modules/import';
import { IntegrationModule } from '../src/modules/integration';
import { LogModule } from '../src/modules/log';
import { MarshmallowModule } from '../src/modules/marshmallow';
import { ObservabilityAdaptersModule } from '../src/modules/observability-adapters';
import { OrganizationModule } from '../src/modules/organization';
import { PermissionModule } from '../src/modules/permission';
import { PiiConfigModule } from '../src/modules/pii-config';
import { PlatformToolsModule } from '../src/modules/platform-tools';
import { PublicModule } from '../src/modules/public';
import { ReportModule } from '../src/modules/report';
import { RoleModule } from '../src/modules/role';
import { RuntimeFlagsModule } from '../src/modules/runtime-flags';
import { SecurityModule } from '../src/modules/security';
import { SettingsModule } from '../src/modules/settings';
import { SubsidiaryModule } from '../src/modules/subsidiary';
import { SystemRoleModule } from '../src/modules/system-role';
import { SystemUserModule } from '../src/modules/system-user';
import { TalentModule } from '../src/modules/talent';
import { TenantModule } from '../src/modules/tenant';
import { loadRepoEnvFiles } from '../src/repo-env';

function readArg(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

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

function writeJson(out: string, payload: unknown) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const outDir = readArg('--out-dir', 'openapi-before');
  loadRepoEnvFiles();
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');

  const groups = [
    {
      group: 'operations',
      file: 'openapi-operations.json',
      title: 'TCRN TMS - Operations API',
      description: 'Core business operations API for Frontend Applications',
      tags: OPERATIONS_TAGS,
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
    },
    {
      group: 'config',
      file: 'openapi-config.json',
      title: 'TCRN TMS - System & Config API',
      description: 'System administration, configuration and authentication API',
      tags: CONFIG_TAGS,
      include: [
        AuthModule,
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
        LogModule,
        EmailModule,
        SettingsModule,
        DelegatedAdminModule,
      ],
    },
    {
      group: 'public',
      file: 'openapi-public.json',
      title: 'TCRN TMS - Public API',
      description: 'Publicly accessible endpoints',
      tags: PUBLIC_TAGS,
      include: [PublicModule, HealthModule],
    },
  ];

  const summary: Record<string, unknown> = {};

  for (const group of groups) {
    const config = buildSwaggerConfig(group.title, group.description, '1.0.0', group.tags);
    const document = cloneSerializableSwaggerValue(
      SwaggerModule.createDocument(app, config, { include: group.include as Function[], extraModels: [] })
    ) as OpenAPIObject;
    applyGlobalSwaggerParameters(document);
    writeJson(path.join(outDir, group.file), document);
    summary[group.group] = {
      file: path.join(outDir, group.file),
      pathCount: Object.keys(document.paths).length,
      schemaCount: Object.keys(document.components?.schemas ?? {}).length,
    };
  }

  await app.close();
  console.log(JSON.stringify({ passed: true, outDir, summary }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
