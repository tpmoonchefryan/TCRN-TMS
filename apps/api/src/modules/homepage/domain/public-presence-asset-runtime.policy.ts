// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  PublicPresenceAssetSourceManifestSchema,
  type PublicPresenceAssetListEntry,
  type PublicPresenceAssetManifest,
  type PublicPresenceAssetRevisionPin,
  type PublicPresenceAssetRuntimeAuthority,
  type PublicPresenceAssetSourceManifest,
  type PublicPresenceComponentDefinition,
  type PublicPresenceComponentSourceManifest,
  type PublicPresenceSourceBundleFile,
  type PublicPresenceTemplateDefinition,
  type PublicPresenceTemplateSourceManifest,
} from '@tcrn/shared';

type SourceBundleCarrier = {
  sourceBundle: PublicPresenceSourceBundleFile[];
};

function readSourceManifestFile(
  sourceBundle: readonly PublicPresenceSourceBundleFile[] | null | undefined
) {
  return sourceBundle?.find((file) => file.path === 'manifest.json') ?? null;
}

function parseSourceManifestJson(
  sourceBundle: readonly PublicPresenceSourceBundleFile[] | null | undefined
) {
  const manifestFile = readSourceManifestFile(sourceBundle);

  if (!manifestFile) {
    return null;
  }

  try {
    return JSON.parse(manifestFile.contents) as unknown;
  } catch {
    return null;
  }
}

export function parsePublicPresenceAssetSourceManifest(
  sourceBundle: readonly PublicPresenceSourceBundleFile[] | null | undefined
): PublicPresenceAssetSourceManifest | null {
  const parsed = PublicPresenceAssetSourceManifestSchema.safeParse(
    parseSourceManifestJson(sourceBundle)
  );

  return parsed.success ? (parsed.data as PublicPresenceAssetSourceManifest) : null;
}

export function readTemplateSourceManifestFromAssetEntry(
  asset: Pick<PublicPresenceAssetListEntry, 'currentRevision'>
): PublicPresenceTemplateSourceManifest | null {
  const parsed = parsePublicPresenceAssetSourceManifest(asset.currentRevision?.sourceBundle);

  return parsed?.assetKind === 'template' ? (parsed as PublicPresenceTemplateSourceManifest) : null;
}

export function readTemplateSourceManifestFromPin(
  pin: PublicPresenceAssetRevisionPin | null | undefined
): PublicPresenceTemplateSourceManifest | null {
  const parsed = parsePublicPresenceAssetSourceManifest(pin?.snapshot?.sourceBundle);

  return parsed?.assetKind === 'template' ? (parsed as PublicPresenceTemplateSourceManifest) : null;
}

export function readComponentSourceManifestFromAssetEntry(
  asset: Pick<PublicPresenceAssetListEntry, 'currentRevision'>
): PublicPresenceComponentSourceManifest | null {
  const parsed = parsePublicPresenceAssetSourceManifest(asset.currentRevision?.sourceBundle);

  return parsed?.assetKind === 'component'
    ? (parsed as PublicPresenceComponentSourceManifest)
    : null;
}

export function derivePublicPresenceAssetManifestFromSourceManifest(
  sourceManifest: PublicPresenceAssetSourceManifest
): PublicPresenceAssetManifest {
  if (sourceManifest.assetKind === 'template') {
    const {
      authoring: _authoring,
      registryVersion: _registryVersion,
      safetyPolicyVersion: _safetyPolicyVersion,
      stageSections: _stageSections,
      ...manifest
    } = sourceManifest;

    return manifest as PublicPresenceAssetManifest;
  }

  const {
    authoring: _authoring,
    collectionOperations: _collectionOperations,
    fieldDefinitions: _fieldDefinitions,
    lockedSourceOwnedPolicy: _lockedSourceOwnedPolicy,
    registryVersion: _registryVersion,
    safetyPolicyReferences,
    safetyPolicyVersion: _safetyPolicyVersion,
    sourcePolicy,
    unknownFieldPolicy,
    projectionMode,
    propsSchemaKey,
    defaultProps,
    aiPatchAllowlist,
    ...manifest
  } = sourceManifest;

  return {
    ...manifest,
    aiPatchAllowlist: [...aiPatchAllowlist],
    defaultProps: structuredClone(defaultProps),
    projectionMode,
    propsSchemaKey,
    safetyPolicyReferences: [...safetyPolicyReferences],
    sourcePolicy,
    unknownFieldPolicy,
  } as PublicPresenceAssetManifest;
}

function buildTemplateDefinition(
  manifest: PublicPresenceTemplateSourceManifest
): PublicPresenceTemplateDefinition {
  return {
    defaultSectionOrder: [...manifest.defaultSectionOrder],
    label: manifest.label,
    lockedSections: [...manifest.lockedSections],
    optionalSections: [...manifest.optionalSections],
    personaKitFields: [...manifest.personaKitFields],
    policyReferences: [...manifest.policyReferences],
    recommendedSections: [...manifest.recommendedSections],
    registryVersion: manifest.registryVersion,
    requiredSections: [...manifest.requiredSections],
    templateId: manifest.templateId,
    useCase: manifest.useCase,
    validationRules: [...manifest.validationRules],
  } as PublicPresenceTemplateDefinition;
}

function buildComponentDefinition(
  manifest: PublicPresenceComponentSourceManifest
): PublicPresenceComponentDefinition {
  return {
    aiPatchAllowlist: [...manifest.aiPatchAllowlist],
    collectionOperations: structuredClone(manifest.collectionOperations ?? []),
    componentType: manifest.componentType,
    defaultProps: structuredClone(manifest.defaultProps),
    fieldDefinitions: structuredClone(manifest.fieldDefinitions),
    lockedSourceOwnedPolicy: manifest.lockedSourceOwnedPolicy,
    propsSchemaKey: manifest.propsSchemaKey,
    publicProjectionMode: manifest.projectionMode,
    rendererSupport: manifest.rendererSupport,
    safetyPolicyReferences: [...manifest.safetyPolicyReferences],
    sourcePolicy: manifest.sourcePolicy,
    unknownFieldPolicy: manifest.unknownFieldPolicy,
    visualSupport: manifest.visualSupport,
  } as PublicPresenceComponentDefinition;
}

export function buildPublicPresenceRuntimeAuthority(input: {
  componentAssets: ReadonlyArray<Pick<PublicPresenceAssetListEntry, 'currentRevision'>>;
  templatePin?: PublicPresenceAssetRevisionPin | null;
  templateSourceBundle?: readonly PublicPresenceSourceBundleFile[] | null;
}): PublicPresenceAssetRuntimeAuthority | null {
  const templateSourceManifest = input.templateSourceBundle
    ? parsePublicPresenceAssetSourceManifest(input.templateSourceBundle)
    : readTemplateSourceManifestFromPin(input.templatePin ?? null);

  if (!templateSourceManifest || templateSourceManifest.assetKind !== 'template') {
    return null;
  }

  const components: Record<string, PublicPresenceComponentDefinition> = {};

  for (const asset of input.componentAssets) {
    const componentSourceManifest = readComponentSourceManifestFromAssetEntry(asset);

    if (!componentSourceManifest) {
      continue;
    }

    components[componentSourceManifest.componentType] =
      buildComponentDefinition(componentSourceManifest);
  }

  return {
    components,
    registryVersion: templateSourceManifest.registryVersion,
    safetyPolicyVersion: templateSourceManifest.safetyPolicyVersion,
    stageSections: Object.fromEntries(
      templateSourceManifest.stageSections.map((section) => [
        section.kind,
        structuredClone(section),
      ])
    ),
    template: buildTemplateDefinition(templateSourceManifest),
  };
}

export function readPublicPresenceAssetSourceBundle(
  carrier: SourceBundleCarrier | null | undefined
) {
  return carrier?.sourceBundle ?? [];
}
