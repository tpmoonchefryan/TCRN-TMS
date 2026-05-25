// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { createHash } from 'node:crypto';

import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import {
  ErrorCodes,
  type LocalizedText,
  normalizeLocalizedText,
  PublicPresenceAssetManifestSchema,
  PublicPresenceAssetScopeTypeSchema,
  PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
  PublicPresenceSourceBundleFileSchema,
  resolvePublicPresenceTemplateTypeCode,
  type PublicPresenceAssetKind,
  type PublicPresenceAssetManifest,
  type PublicPresenceAssetScopeContext,
  type PublicPresenceAssetScopeType,
  type PublicPresenceAssetValidationState,
  type PublicPresenceSourceBundleFile,
  type PublicPresenceTemplateId,
} from '@tcrn/shared';

export interface PublicPresenceAssetValidationSummary {
  issueCount: number;
  passCount: number;
  warnCount: number;
}

const PublicPresenceSourceBundleSchema = z.array(PublicPresenceSourceBundleFileSchema).min(1);

const SOURCE_BUNDLE_PATH_BLOCKLIST = ['..', '\\'];

const DEFAULT_COPY_SUFFIXES: LocalizedText = {
  en: 'Copy',
  zh_HANS: '副本',
  zh_HANT: '副本',
  ja: 'コピー',
  ko: '복사본',
  fr: 'Copie',
};

export function normalizePublicPresenceAssetScope(
  scopeType?: PublicPresenceAssetScopeType | string,
  scopeId?: string | null
): PublicPresenceAssetScopeContext {
  const parsedScopeType =
    scopeType === undefined
      ? { data: 'tenant' as const, success: true as const }
      : PublicPresenceAssetScopeTypeSchema.safeParse(scopeType);

  if (!parsedScopeType.success) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      details: parsedScopeType.error.flatten(),
      message: 'Asset scopeType is invalid.',
    });
  }

  const normalizedScopeType = parsedScopeType.data;
  const rawScopeId = scopeId?.trim() ?? null;
  const normalizedScopeId = normalizedScopeType === 'tenant' ? null : rawScopeId;

  if (normalizedScopeType === 'tenant' && rawScopeId !== null) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Tenant asset scope must not include scopeId.',
    });
  }

  if (normalizedScopeType !== 'tenant' && !normalizedScopeId) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Subsidiary and talent asset scopes require scopeId.',
    });
  }

  return {
    scopeId: normalizedScopeId,
    scopeType: normalizedScopeType,
  };
}

export function normalizePublicPresenceAssetCode(input: string): string {
  const normalized = input
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  if (!normalized || normalized.length > 64) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Asset code must be 1-64 characters using letters, numbers, dashes, or underscores.',
    });
  }

  return normalized;
}

export function normalizePublicPresenceAssetName(
  input: Partial<LocalizedText> | null | undefined,
  fallback: string
): LocalizedText {
  return normalizeLocalizedText(input, fallback);
}

export function normalizePublicPresenceAssetDescription(
  input: Partial<LocalizedText> | null | undefined,
  fallback: string
): LocalizedText {
  return normalizeLocalizedText(input, fallback);
}

export function parsePublicPresenceAssetManifest(manifest: unknown): PublicPresenceAssetManifest {
  const parsed = PublicPresenceAssetManifestSchema.safeParse(
    normalizeTemplateManifestTypeCode(manifest)
  );

  if (!parsed.success) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      details: parsed.error.flatten(),
      message: 'Asset manifest is invalid.',
    });
  }

  return parsed.data;
}

export function normalizeTemplateManifestTypeCode(manifest: unknown): unknown {
  if (
    manifest &&
    typeof manifest === 'object' &&
    (manifest as { assetKind?: unknown }).assetKind === 'template' &&
    typeof (manifest as { templateId?: unknown }).templateId === 'string' &&
    typeof (manifest as { templateTypeCode?: unknown }).templateTypeCode !== 'string'
  ) {
    return {
      ...manifest,
      templateTypeCode: resolvePublicPresenceTemplateTypeCode(
        (manifest as { templateId: PublicPresenceTemplateId }).templateId
      ),
    };
  }

  return manifest;
}

export function parsePublicPresenceSourceBundle(
  sourceBundle: unknown
): PublicPresenceSourceBundleFile[] {
  const parsed = PublicPresenceSourceBundleSchema.safeParse(sourceBundle);

  if (!parsed.success) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      details: parsed.error.flatten(),
      message: 'Asset source bundle must contain at least one valid file.',
    });
  }

  const seenPaths = new Set<string>();

  for (const file of parsed.data) {
    if (
      SOURCE_BUNDLE_PATH_BLOCKLIST.some((fragment) => file.path.includes(fragment)) ||
      file.path.startsWith('/')
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Asset source path '${file.path}' is not allowed.`,
      });
    }

    if (seenPaths.has(file.path)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Asset source path '${file.path}' is duplicated.`,
      });
    }

    seenPaths.add(file.path);
  }

  return parsed.data;
}

export function calculatePublicPresenceAssetSourceHash(input: {
  manifest: PublicPresenceAssetManifest;
  sourceBundle: PublicPresenceSourceBundleFile[];
}) {
  return createHash('sha256')
    .update(
      JSON.stringify(
        canonicalizeValue({
          manifest: input.manifest,
          runtimeContractVersion: PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
          sourceBundle: [...input.sourceBundle].sort((left, right) =>
            left.path.localeCompare(right.path)
          ),
        })
      )
    )
    .digest('hex');
}

export function buildValidatedPublicPresenceAssetSummary(
  sourceBundle: PublicPresenceSourceBundleFile[]
): {
  validationState: PublicPresenceAssetValidationState;
  validationSummary: PublicPresenceAssetValidationSummary;
} {
  const warnings: string[] = [];

  if (!sourceBundle.some((file) => file.path === 'manifest.json')) {
    warnings.push('manifest');
  }

  if (!sourceBundle.some((file) => file.path === 'fixtures/default.json')) {
    warnings.push('fixture');
  }

  if (!sourceBundle.some((file) => file.path.startsWith('src/'))) {
    warnings.push('code');
  }

  return {
    validationState: warnings.length > 0 ? 'warning' : 'ready',
    validationSummary: {
      issueCount: 0,
      passCount: Math.max(sourceBundle.length + 1 - warnings.length, 0),
      warnCount: warnings.length,
    },
  };
}

export function buildDraftPublicPresenceAssetSummary(): {
  validationState: PublicPresenceAssetValidationState;
  validationSummary: PublicPresenceAssetValidationSummary;
} {
  return {
    validationState: 'unvalidated',
    validationSummary: {
      issueCount: 0,
      passCount: 0,
      warnCount: 0,
    },
  };
}

export function appendPublicPresenceAssetCopySuffix(value: LocalizedText): LocalizedText {
  return {
    en: `${value.en} ${DEFAULT_COPY_SUFFIXES.en}`,
    zh_HANS: `${value.zh_HANS} ${DEFAULT_COPY_SUFFIXES.zh_HANS}`,
    zh_HANT: `${value.zh_HANT} ${DEFAULT_COPY_SUFFIXES.zh_HANT}`,
    ja: `${value.ja}${DEFAULT_COPY_SUFFIXES.ja}`,
    ko: `${value.ko} ${DEFAULT_COPY_SUFFIXES.ko}`,
    fr: `${value.fr} ${DEFAULT_COPY_SUFFIXES.fr}`,
  };
}

export function assertManifestMatchesAssetRecord(input: {
  assetKind: PublicPresenceAssetKind;
  componentType: string | null;
  manifest: PublicPresenceAssetManifest;
  templateId: string | null;
}) {
  if (input.manifest.assetKind !== input.assetKind) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Asset manifest kind does not match the asset record.',
    });
  }

  if (
    input.assetKind === 'template' &&
    input.manifest.assetKind === 'template' &&
    input.templateId &&
    input.manifest.templateId !== input.templateId
  ) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Template asset manifest templateId does not match the asset record.',
    });
  }

  if (
    input.assetKind === 'component' &&
    input.manifest.assetKind === 'component' &&
    input.componentType &&
    input.manifest.componentType !== input.componentType
  ) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Component asset manifest componentType does not match the asset record.',
    });
  }
}

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = canonicalizeValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
}
