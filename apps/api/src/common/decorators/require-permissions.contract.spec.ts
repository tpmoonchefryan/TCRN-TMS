import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  type PermissionActionInput,
  RBAC_POLICY_DEFINITIONS,
  resolveRbacPermission,
} from '@tcrn/shared';
import { describe, expect, it } from 'vitest';

import { CONFIG_ENTITY_RESOURCE_MAP } from '../../modules/config/config-rbac';

interface StaticPermissionReference {
  file: string;
  line: number;
  resource: string;
  action: string;
}

const srcRoot = path.resolve(process.cwd(), 'src');
const modulesRoot = path.join(srcRoot, 'modules');
const policyKeys = new Set(
  RBAC_POLICY_DEFINITIONS.map(
    (definition) => `${definition.resourceCode}:${definition.action}`,
  ),
);

const walkControllerFiles = (directory: string): string[] => {
  const entries = readdirSync(directory, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const resolvedPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkControllerFiles(resolvedPath);
    }

    return entry.isFile() && entry.name.endsWith('.controller.ts')
      ? [resolvedPath]
      : [];
  });
};

const getLineNumber = (source: string, index: number): number =>
  source.slice(0, index).split('\n').length;

const collectStaticPermissions = (
  source: string,
  file: string,
): StaticPermissionReference[] => {
  const references: StaticPermissionReference[] = [];
  const decoratorPattern = /@RequirePermissions\s*\(([\s\S]*?)\)/g;

  for (const decoratorMatch of source.matchAll(decoratorPattern)) {
    const block = decoratorMatch[1] ?? '';
    const blockOffset = decoratorMatch.index ?? 0;
    const permissionPattern = /resource:\s*'([^']+)'\s*,\s*action:\s*'([^']+)'/g;

    for (const permissionMatch of block.matchAll(permissionPattern)) {
      const resource = permissionMatch[1];
      const action = permissionMatch[2];
      const matchOffset = blockOffset + (permissionMatch.index ?? 0);

      references.push({
        file: path.relative(srcRoot, file),
        line: getLineNumber(source, matchOffset),
        resource,
        action,
      });
    }
  }

  return references;
};

const collectHelperActions = (source: string, helperName: string): string[] => {
  const pattern = new RegExp(`@${helperName}\\('([^']+)'\\)`, 'g');

  return [...source.matchAll(pattern)].map((match) => match[1] ?? '');
};

const resolvePolicyKey = (
  resource: string,
  action: string,
): string => {
  const resolved = resolveRbacPermission(
    resource as Parameters<typeof resolveRbacPermission>[0],
    action as PermissionActionInput,
  );

  return `${resolved.resourceCode}:${resolved.checkedAction}`;
};

describe('controller RBAC contract', () => {
  it('keeps static @RequirePermissions declarations aligned with shared RBAC policy definitions', () => {
    const controllerFiles = walkControllerFiles(modulesRoot);
    const declarations = controllerFiles.flatMap((file) =>
      collectStaticPermissions(readFileSync(file, 'utf8'), file),
    );

    expect(declarations.length).toBeGreaterThan(100);

    const violations = declarations.flatMap((declaration) => {
      try {
        const policyKey = resolvePolicyKey(declaration.resource, declaration.action);

        return policyKeys.has(policyKey)
          ? []
          : [
              `${declaration.file}:${declaration.line} -> ${declaration.resource}:${declaration.action} resolves to ${policyKey}, but that policy is missing from RBAC_POLICY_DEFINITIONS`,
            ];
      } catch (error) {
        return [
          `${declaration.file}:${declaration.line} -> ${declaration.resource}:${declaration.action} is invalid: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ];
      }
    });

    expect(violations).toEqual([]);
  });

  it('keeps config permission helpers aligned with shared RBAC policy definitions', () => {
    const configControllerSource = readFileSync(
      path.join(modulesRoot, 'config/config.controller.ts'),
      'utf8',
    );
    const globalConfigControllerSource = readFileSync(
      path.join(modulesRoot, 'config/global-config.controller.ts'),
      'utf8',
    );
    const configEntityActions = collectHelperActions(
      configControllerSource,
      'RequireConfigEntityPermission',
    );
    const platformConfigActions = collectHelperActions(
      globalConfigControllerSource,
      'RequirePlatformConfigPermission',
    );

    expect(configEntityActions.length).toBeGreaterThan(0);
    expect(platformConfigActions.length).toBeGreaterThan(0);

    const helperViolations: string[] = [];

    for (const action of configEntityActions) {
      for (const [entityType, resource] of Object.entries(CONFIG_ENTITY_RESOURCE_MAP)) {
        try {
          const policyKey = resolvePolicyKey(resource, action);

          if (!policyKeys.has(policyKey)) {
            helperViolations.push(
              `config.controller.ts -> entity ${entityType} action ${action} resolves to ${policyKey}, but that policy is missing from RBAC_POLICY_DEFINITIONS`,
            );
          }
        } catch (error) {
          helperViolations.push(
            `config.controller.ts -> entity ${entityType} action ${action} is invalid for ${resource}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }

    for (const action of platformConfigActions) {
      try {
        const policyKey = resolvePolicyKey('config.platform_settings', action);

        if (!policyKeys.has(policyKey)) {
          helperViolations.push(
            `global-config.controller.ts -> platform config action ${action} resolves to ${policyKey}, but that policy is missing from RBAC_POLICY_DEFINITIONS`,
          );
        }
      } catch (error) {
        helperViolations.push(
          `global-config.controller.ts -> platform config action ${action} is invalid: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    expect(helperViolations).toEqual([]);
  });
});
