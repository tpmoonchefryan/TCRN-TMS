// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { INITIAL_ADMIN_ROLE_CODE, RBAC_ROLE_TEMPLATES } from '@tcrn/shared';
import { describe, expect, it } from 'vitest';

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

  it('keeps runtime flag permissions on Initial Admin only', () => {
    const initialAdminTemplate = RBAC_ROLE_TEMPLATES.find(
      (template) => template.code === INITIAL_ADMIN_ROLE_CODE
    );
    const nonPlatformAdminRuntimeFlagGrants = RBAC_ROLE_TEMPLATES.filter(
      (template) => template.code !== INITIAL_ADMIN_ROLE_CODE
    ).flatMap((template) =>
      template.permissions
        .filter((permission) => permission.resourceCode === 'platform.runtime_flag')
        .map((permission) => ({ roleCode: template.code, permission }))
    );

    expect(initialAdminTemplate?.permissions).toEqual(
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
