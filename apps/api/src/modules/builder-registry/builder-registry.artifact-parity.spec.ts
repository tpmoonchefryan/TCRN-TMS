import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BUILDER_REGISTRY_ARTIFACT_KINDS,
  BUILDER_REGISTRY_GENERATED_AT,
  type BuilderRegistryArtifactKind,
} from '@tcrn/shared';

import { ApiRegistryService } from '../api-registry/api-registry.service';
import { BuilderRegistryService } from './builder-registry.service';

const apiRoot = path.resolve(__dirname, '../../..');

function hashContent(content: string) {
  return createHash('sha256').update(content).digest('hex');
}

function runScriptParity(): Record<BuilderRegistryArtifactKind, string> {
  const source = `
    import { readFileSync } from 'node:fs';
    import {
      buildBuilderApiReadonlyExport,
      buildBuilderModuleCapabilityManifest,
      buildBuilderSchemaCatalog,
      buildComposedDryRun,
      generateBuilderArtifacts
    } from './scripts/builder-registry-script-utils.mjs';

    const apiRegistry = JSON.parse(readFileSync('./src/modules/api-registry/api-registry.snapshot.json', 'utf8'));
    const sourceReadback = { sourceCommit: apiRegistry.sourceCommit };
    const apiExport = buildBuilderApiReadonlyExport(apiRegistry, sourceReadback);
    const manifest = buildBuilderModuleCapabilityManifest({ registryVersion: '2026-05-27.phase-1' }, apiExport, sourceReadback);
    const schemaCatalog = buildBuilderSchemaCatalog(manifest, apiExport);
    const generated = generateBuilderArtifacts(manifest, schemaCatalog, apiExport);
    const composed = buildComposedDryRun(manifest, apiExport);
    process.stdout.write(JSON.stringify({
      manifest: JSON.stringify(manifest, null, 2) + '\\n',
      'api-readonly-export': JSON.stringify(apiExport, null, 2) + '\\n',
      'schema-catalog': JSON.stringify(schemaCatalog, null, 2) + '\\n',
      types: generated.types,
      'sdk-readonly': generated.sdk,
      'openapi-readonly': JSON.stringify(generated.openapi, null, 2) + '\\n',
      'composed-dry-run': JSON.stringify(composed, null, 2) + '\\n'
    }));
  `;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: apiRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const contents = JSON.parse(output) as Record<BuilderRegistryArtifactKind, string>;

  return Object.fromEntries(
    BUILDER_REGISTRY_ARTIFACT_KINDS.map((kind) => [kind, hashContent(contents[kind])])
  ) as Record<BuilderRegistryArtifactKind, string>;
}

describe('BuilderRegistryService artifact parity', () => {
  it('serves deterministic runtime artifact hashes matching the script generator', () => {
    const service = new BuilderRegistryService(new ApiRegistryService());
    const scriptHashes = runScriptParity();

    for (const artifactKind of BUILDER_REGISTRY_ARTIFACT_KINDS) {
      expect(service.getArtifact(artifactKind).contentHash).toBe(scriptHashes[artifactKind]);
      expect(service.getArtifact(artifactKind).contentHash).toBe(
        service.getArtifact(artifactKind).contentHash
      );
    }
  });

  it('keeps manifest generation timestamp deterministic and OpenAPI security operation-scoped', () => {
    const service = new BuilderRegistryService(new ApiRegistryService());
    const manifest = service.getManifest();
    const openapi = service.getReadonlyOpenApi();
    const firstPathItem = Object.values(openapi.paths)[0] as Record<string, unknown>;
    const firstOperation = Object.values(firstPathItem)[0] as Record<string, unknown>;

    expect(manifest.generatedAt).toBe(BUILDER_REGISTRY_GENERATED_AT);
    expect(firstOperation.security).toEqual([{ bearerAuth: [] }]);
    expect((firstOperation.responses as Record<string, unknown>).security).toBeUndefined();
  });
});
