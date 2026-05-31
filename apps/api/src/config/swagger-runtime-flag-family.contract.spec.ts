// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { RBAC_ROLE_TEMPLATES } from '@tcrn/shared';

const productRoot = path.resolve(__dirname, '../../../..');

function readProductFile(relativePath: string) {
  return readFileSync(path.join(productRoot, relativePath), 'utf8');
}

describe('Runtime flag Swagger contract', () => {
  it('documents only AC-safe runtime flag APIs without raw provider secrets', () => {
    const controller = readProductFile(
      'apps/api/src/modules/runtime-flags/runtime-flags.controller.ts'
    );
    const dto = readProductFile('apps/api/src/modules/runtime-flags/dto/runtime-flags.dto.ts');
    const documentText = `${controller}\n${dto}`;

    expect(controller).toContain("@Controller('runtime-flags')");
    expect(controller).toContain('@ApiBearerAuth()');
    expect(controller).toContain('Runtime flag controls are available to AC operators only');
    expect(controller).toContain("@Post('evaluate')");
    expect(controller).toContain("@Post('kill-switches')");
    expect(controller).toContain("@Patch('kill-switches/:switchId/deactivate')");
    expect(controller).toContain("resource: 'platform.runtime_flag'");
    expect(controller).toContain("action: 'execute'");
    expect(controller).toContain("action: 'admin'");
    expect(controller).not.toContain("resource: 'platform.tool_connection', action: 'write'");
    expect(documentText).not.toMatch(
      /secretValue|clientSecret|api_key|private_key|access_token|password/i
    );
    expect(dto).toContain('explicitConfirmation');
  });

  it('keeps runtime flag permissions on AC platform-admin role templates only', () => {
    const platformAdminTemplate = RBAC_ROLE_TEMPLATES.find(
      (template) => template.code === 'PLATFORM_ADMIN'
    );
    const nonPlatformAdminRuntimeFlagGrants = RBAC_ROLE_TEMPLATES.filter(
      (template) => template.code !== 'PLATFORM_ADMIN'
    ).flatMap((template) =>
      template.permissions
        .filter((permission) => permission.resourceCode === 'platform.runtime_flag')
        .map((permission) => ({ roleCode: template.code, permission }))
    );

    expect(platformAdminTemplate?.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceCode: 'platform.runtime_flag',
          actions: expect.arrayContaining(['read', 'execute', 'admin']),
        }),
      ])
    );
    expect(nonPlatformAdminRuntimeFlagGrants).toEqual([]);
  });
});
