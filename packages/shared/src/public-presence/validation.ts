// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  PublicPresenceComponentPropsSchemaMap,
  PublicPresenceDocumentSchema,
  PublicPresenceSectionFieldSchemaMap,
  PublicPresenceValidationSnapshotSchema,
} from '../schemas/public-presence';
import {
  PUBLIC_PRESENCE_COMPONENT_DEFINITIONS,
  PUBLIC_PRESENCE_REGISTRY_METADATA,
  PUBLIC_PRESENCE_SAFETY_POLICY,
  PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS,
  PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS,
} from './registry';
import type {
  PublicPresenceComponentNode,
  PublicPresenceDocument,
  PublicPresenceFallbackDecision,
  PublicPresenceFieldDefinition,
  PublicPresenceSectionNode,
  PublicPresenceTemplateId,
  PublicPresenceValidationIssue,
  PublicPresenceValidationMode,
  PublicPresenceValidationSnapshot,
  PublicPresenceValidationState,
} from './types';

export interface PublicPresenceNormalizedComponent {
  id: string;
  type: string;
  visible: boolean;
  knownProps: Record<string, unknown>;
  unknownProps: Record<string, unknown>;
  state: PublicPresenceValidationState;
}

export interface PublicPresenceNormalizedSection {
  id: string;
  kind: string;
  knownFields: Record<string, unknown>;
  unknownFields: Record<string, unknown>;
  state: PublicPresenceValidationState;
  components: PublicPresenceNormalizedComponent[];
}

export interface PublicPresenceNormalizedDocument {
  schemaVersion: string;
  templateId: PublicPresenceTemplateId;
  sections: PublicPresenceNormalizedSection[];
}

export interface PublicPresenceValidationArtifact {
  document: PublicPresenceDocument;
  normalizedDocument: PublicPresenceNormalizedDocument;
  snapshot: PublicPresenceValidationSnapshot;
}

interface ValidationOptions {
  mode?: PublicPresenceValidationMode;
}

interface ValidationRuntimeState {
  issues: PublicPresenceValidationIssue[];
  fallbackDecisions: PublicPresenceFallbackDecision[];
  templateId: PublicPresenceTemplateId;
}

const DEFAULT_VALIDATION_MODE: PublicPresenceValidationMode = 'draft';

const ISSUE_SEVERITY_ORDER: Record<PublicPresenceValidationState, number> = {
  unsafe: 3,
  invalidRecoverable: 2,
  validLocked: 1,
  validEditable: 0,
};

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

function hasUnsafeInternalPathShape(value: string) {
  return (
    value.startsWith('//')
    || value.startsWith('/\\')
    || value.startsWith('/%2f')
    || value.startsWith('/%2F')
    || value.startsWith('/%5c')
    || value.startsWith('/%5C')
  );
}

function hasEncodedProtocolRelativeBypass(value: string) {
  const lowered = value.toLowerCase();

  return (
    lowered.includes('%2f%2f')
    || lowered.includes('%2f%5c')
    || lowered.includes('%5c%2f')
    || lowered.includes('%5c%5c')
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stablePath(path: string[]) {
  return path.map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, '_')).join('.');
}

function normalizeIssuePath(path: PropertyKey[]) {
  return path.map((segment) =>
    typeof segment === 'number' || typeof segment === 'string'
      ? segment
      : String(segment),
  );
}

export function createPublicPresenceValidationIssueId(input: {
  code: string;
  path: string[];
  templateId: PublicPresenceTemplateId;
  sectionId?: string;
  componentId?: string;
  fieldKey?: string;
}) {
  const identity = [
    input.templateId,
    input.sectionId ?? 'section',
    input.componentId ?? 'component',
    input.fieldKey ?? 'field',
    stablePath(input.path),
    input.code,
  ].join('::');

  return `ppv::${identity}`;
}

function pushIssue(
  runtime: ValidationRuntimeState,
  input: Omit<PublicPresenceValidationIssue, 'id' | 'registryVersion' | 'policyVersion'>,
) {
  runtime.issues.push({
    ...input,
    id: createPublicPresenceValidationIssueId({
      code: input.code,
      path: input.path,
      templateId: input.templateId,
      sectionId: input.sectionId,
      componentId: input.componentId,
      fieldKey: input.fieldKey,
    }),
    registryVersion: PUBLIC_PRESENCE_REGISTRY_METADATA.registryVersion,
    policyVersion: PUBLIC_PRESENCE_REGISTRY_METADATA.safetyPolicyVersion,
  });
}

function pushFallbackDecision(
  runtime: ValidationRuntimeState,
  decision: PublicPresenceFallbackDecision,
) {
  runtime.fallbackDecisions.push(decision);
}

function pickKnownEntries(
  source: Record<string, unknown>,
  fieldDefinitions: PublicPresenceFieldDefinition[],
) {
  const knownFieldKeys = new Set(fieldDefinitions.map((field) => field.fieldKey));
  const knownProps: Record<string, unknown> = {};
  const unknownProps: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (knownFieldKeys.has(key)) {
      knownProps[key] = value;
      continue;
    }

    unknownProps[key] = value;
  }

  return {
    knownProps,
    unknownProps,
  };
}

function aggregateValidationState(
  states: PublicPresenceValidationState[],
): PublicPresenceValidationState {
  return [...states].sort(
    (left, right) => ISSUE_SEVERITY_ORDER[right] - ISSUE_SEVERITY_ORDER[left],
  )[0] ?? 'validEditable';
}

function addUnknownFieldIssues(params: {
  componentId?: string;
  fieldEntries: Record<string, unknown>;
  pathPrefix: string[];
  runtime: ValidationRuntimeState;
  sectionId?: string;
}) {
  for (const fieldKey of Object.keys(params.fieldEntries)) {
    pushIssue(params.runtime, {
      severity: 'info',
      state: 'validLocked',
      code: 'registry.unknownField',
      messageKey: 'publicPresence.validation.unknownField',
      path: [...params.pathPrefix, fieldKey],
      templateId: params.runtime.templateId,
      sectionId: params.sectionId,
      componentId: params.componentId,
      fieldKey,
      blocksVisualEdit: true,
      blocksPublish: false,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: 'lockedSourceOwned',
      suggestedFix: 'Move this field into Source Schema until the registry defines it.',
    });

    pushFallbackDecision(params.runtime, {
      path: [...params.pathPrefix, fieldKey],
      policy: 'lockedSourceOwned',
      reason: 'unknown-field-preserved',
    });
  }
}

function addSchemaIssues(params: {
  componentId?: string;
  issues: Array<{ code: string; message: string; path: (string | number)[] }>;
  pathPrefix: string[];
  runtime: ValidationRuntimeState;
  sectionId?: string;
}) {
  for (const issue of params.issues) {
    const fieldPath = issue.path.map((segment) => String(segment));
    pushIssue(params.runtime, {
      severity: 'blocker',
      state: 'invalidRecoverable',
      code: `schema.${issue.code}`,
      messageKey: `publicPresence.validation.schema.${issue.code}`,
      path: [...params.pathPrefix, ...fieldPath],
      templateId: params.runtime.templateId,
      sectionId: params.sectionId,
      componentId: params.componentId,
      fieldKey: fieldPath.at(-1),
      blocksVisualEdit: false,
      blocksPublish: true,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: 'safePlaceholder',
      suggestedFix: issue.message,
    });
  }
}

function isPrivateHost(hostname: string) {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function validateUrlLikeValue(params: {
  category:
    | 'officialChannelUrl'
    | 'fanActionUrl'
    | 'goodsUrl'
    | 'supportUrl'
    | 'streamUrl'
    | 'launchUrl'
    | 'mediaAssetUrl'
    | 'embedUrl';
  path: string[];
  runtime: ValidationRuntimeState;
  sectionId?: string;
  componentId?: string;
  fieldKey: string;
  value: string;
}) {
  const policy = PUBLIC_PRESENCE_SAFETY_POLICY.urlPolicies[params.category];
  const trimmed = params.value.trim();

  if (trimmed.length === 0) {
    return;
  }

  if (policy.allowInternalPath && trimmed.startsWith('/')) {
    if (hasUnsafeInternalPathShape(trimmed)) {
      pushIssue(params.runtime, {
        severity: 'fatal',
        state: 'unsafe',
        code: 'unsafe.url.invalidInternalPath',
        messageKey: 'publicPresence.validation.unsafeUrl.invalidInternalPath',
        path: params.path,
        templateId: params.runtime.templateId,
        sectionId: params.sectionId,
        componentId: params.componentId,
        fieldKey: params.fieldKey,
        blocksVisualEdit: true,
        blocksPublish: true,
        blocksAiPatch: true,
        acknowledgementRequired: false,
        fallbackBehavior: 'stripField',
        suggestedFix: 'Use a rooted internal path such as /foo without host or escape syntax.',
      });
    }
    return;
  }

  if (
    trimmed.startsWith('//')
    || trimmed.startsWith('\\')
    || hasEncodedProtocolRelativeBypass(trimmed)
  ) {
    pushIssue(params.runtime, {
      severity: 'fatal',
      state: 'unsafe',
      code: 'unsafe.url.protocolRelative',
      messageKey: 'publicPresence.validation.unsafeUrl.protocolRelative',
      path: params.path,
      templateId: params.runtime.templateId,
      sectionId: params.sectionId,
      componentId: params.componentId,
      fieldKey: params.fieldKey,
      blocksVisualEdit: true,
      blocksPublish: true,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: 'stripField',
      suggestedFix: 'Use an explicit HTTPS URL or a safe internal path.',
    });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    pushIssue(params.runtime, {
      severity: 'fatal',
      state: 'unsafe',
      code: 'unsafe.url.invalid',
      messageKey: 'publicPresence.validation.unsafeUrl.invalid',
      path: params.path,
      templateId: params.runtime.templateId,
      sectionId: params.sectionId,
      componentId: params.componentId,
      fieldKey: params.fieldKey,
      blocksVisualEdit: true,
      blocksPublish: true,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: 'stripField',
      suggestedFix: 'Use an allowed public HTTPS URL.',
    });
    return;
  }

  if (!policy.allowedProtocols.includes(parsed.protocol)) {
    pushIssue(params.runtime, {
      severity: 'fatal',
      state: 'unsafe',
      code: 'unsafe.url.protocol',
      messageKey: 'publicPresence.validation.unsafeUrl.protocol',
      path: params.path,
      templateId: params.runtime.templateId,
      sectionId: params.sectionId,
      componentId: params.componentId,
      fieldKey: params.fieldKey,
      blocksVisualEdit: true,
      blocksPublish: true,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: 'stripField',
      suggestedFix: 'Use an HTTPS URL.',
    });
    return;
  }

  if (parsed.username || parsed.password) {
    pushIssue(params.runtime, {
      severity: 'fatal',
      state: 'unsafe',
      code: 'unsafe.url.credentials',
      messageKey: 'publicPresence.validation.unsafeUrl.credentials',
      path: params.path,
      templateId: params.runtime.templateId,
      sectionId: params.sectionId,
      componentId: params.componentId,
      fieldKey: params.fieldKey,
      blocksVisualEdit: true,
      blocksPublish: true,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: 'stripField',
      suggestedFix: 'Remove credentials from the URL and use a public destination.',
    });
    return;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (policy.blockPrivateHosts && isPrivateHost(hostname)) {
    pushIssue(params.runtime, {
      severity: 'fatal',
      state: 'unsafe',
      code: 'unsafe.url.privateHost',
      messageKey: 'publicPresence.validation.unsafeUrl.privateHost',
      path: params.path,
      templateId: params.runtime.templateId,
      sectionId: params.sectionId,
      componentId: params.componentId,
      fieldKey: params.fieldKey,
      blocksVisualEdit: true,
      blocksPublish: true,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: 'stripField',
      suggestedFix: 'Use a public managed asset or public provider URL.',
    });
    return;
  }

  if (
    policy.allowListedHosts
    && !policy.allowListedHosts.some(
      (allowedHost) =>
        hostname === allowedHost || hostname.endsWith(`.${allowedHost}`),
    )
  ) {
    pushIssue(params.runtime, {
      severity: 'fatal',
      state: 'unsafe',
      code: 'unsafe.url.unapprovedHost',
      messageKey: 'publicPresence.validation.unsafeUrl.unapprovedHost',
      path: params.path,
      templateId: params.runtime.templateId,
      sectionId: params.sectionId,
      componentId: params.componentId,
      fieldKey: params.fieldKey,
      blocksVisualEdit: true,
      blocksPublish: true,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: 'safePlaceholder',
      suggestedFix: 'Use an MVP-approved provider.',
    });
  }
}

function validateHtmlValue(params: {
  path: string[];
  runtime: ValidationRuntimeState;
  sectionId?: string;
  componentId?: string;
  fieldKey: string;
  value: string;
}) {
  const lowered = params.value.toLowerCase();
  if (
    /(?:href|src)\s*=\s*["']?\s*(?:\/\/|\/\\|https?:\/\/[^"'\s]*@|https?:\/\/[^"'\s]*(?:%2f%2f|%5c%5c))/i.test(
      params.value,
    )
  ) {
    pushIssue(params.runtime, {
      severity: 'fatal',
      state: 'unsafe',
      code: 'unsafe.html.urlBypass',
      messageKey: 'publicPresence.validation.unsafeHtml.urlBypass',
      path: params.path,
      templateId: params.runtime.templateId,
      sectionId: params.sectionId,
      componentId: params.componentId,
      fieldKey: params.fieldKey,
      blocksVisualEdit: true,
      blocksPublish: true,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: PUBLIC_PRESENCE_SAFETY_POLICY.htmlRules.fallbackBehavior,
      suggestedFix: 'Remove protocol-relative, credential, or encoded-host URLs from rich text.',
    });
    return;
  }
  const matchedRule = PUBLIC_PRESENCE_SAFETY_POLICY.htmlRules.forbiddenPatterns.find(
    (pattern) => lowered.includes(pattern),
  );

  if (!matchedRule) {
    return;
  }

  pushIssue(params.runtime, {
    severity: 'fatal',
    state: 'unsafe',
    code: 'unsafe.html.executable',
    messageKey: 'publicPresence.validation.unsafeHtml.executable',
    path: params.path,
    templateId: params.runtime.templateId,
    sectionId: params.sectionId,
    componentId: params.componentId,
    fieldKey: params.fieldKey,
    blocksVisualEdit: true,
    blocksPublish: true,
    blocksAiPatch: true,
    acknowledgementRequired: false,
    fallbackBehavior: PUBLIC_PRESENCE_SAFETY_POLICY.htmlRules.fallbackBehavior,
    suggestedFix: `Remove unsafe pattern: ${matchedRule}`,
  });
}

function validateSectionFields(
  section: PublicPresenceSectionNode,
  sectionIndex: number,
  runtime: ValidationRuntimeState,
) {
  const definition =
    PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS[
      section.kind as keyof typeof PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS
    ];
  const fields = section.fields ?? {};

  if (!definition) {
    addUnknownFieldIssues({
      fieldEntries: fields,
      pathPrefix: ['sections', String(sectionIndex), 'fields'],
      runtime,
      sectionId: section.id,
    });

    return {
      knownFields: {},
      state: aggregateValidationState(['validLocked']),
      unknownFields: fields,
    };
  }

  const { knownProps, unknownProps } = pickKnownEntries(
    fields,
    definition.fieldDefinitions,
  );
  const fieldSchema =
    PublicPresenceSectionFieldSchemaMap[
      definition.kind as keyof typeof PublicPresenceSectionFieldSchemaMap
    ];

  if (fieldSchema) {
    const parsedFields = fieldSchema.safeParse(knownProps);
    if (!parsedFields.success) {
      addSchemaIssues({
        issues: parsedFields.error.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          path: normalizeIssuePath(issue.path),
        })),
        pathPrefix: ['sections', String(sectionIndex), 'fields'],
        runtime,
        sectionId: section.id,
      });
    } else {
      const safeFields = parsedFields.data;
      if (
        definition.kind === 'firstEncounter'
        && 'primaryCtaUrl' in safeFields
        && isPlainObject(safeFields.primaryCtaUrl)
        && typeof safeFields.primaryCtaUrl.value === 'string'
      ) {
        validateUrlLikeValue({
          category: 'fanActionUrl',
          componentId: undefined,
          fieldKey: 'primaryCtaUrl',
          path: [
            'sections',
            String(sectionIndex),
            'fields',
            'primaryCtaUrl',
            'value',
          ],
          runtime,
          sectionId: section.id,
          value: safeFields.primaryCtaUrl.value,
        });
      }

      if (
        definition.kind === 'firstEncounter'
        && 'avatarUrl' in safeFields
        && isPlainObject(safeFields.avatarUrl)
        && typeof safeFields.avatarUrl.value === 'string'
      ) {
        validateUrlLikeValue({
          category: 'mediaAssetUrl',
          fieldKey: 'avatarUrl',
          path: ['sections', String(sectionIndex), 'fields', 'avatarUrl', 'value'],
          runtime,
          sectionId: section.id,
          value: safeFields.avatarUrl.value,
        });
      }

      if (
        definition.kind === 'firstEncounter'
        && 'heroMediaUrl' in safeFields
        && isPlainObject(safeFields.heroMediaUrl)
        && typeof safeFields.heroMediaUrl.value === 'string'
      ) {
        validateUrlLikeValue({
          category: 'mediaAssetUrl',
          fieldKey: 'heroMediaUrl',
          path: ['sections', String(sectionIndex), 'fields', 'heroMediaUrl', 'value'],
          runtime,
          sectionId: section.id,
          value: safeFields.heroMediaUrl.value,
        });
      }

      if (definition.kind === 'countdownReveal') {
        const safeCountdownFields = safeFields as Record<string, unknown>;
        for (const countdownUrlField of ['streamUrl', 'launchUrl'] as const) {
          const countdownField = safeCountdownFields[countdownUrlField];
          if (
            isPlainObject(countdownField)
            && typeof countdownField.value === 'string'
          ) {
            validateUrlLikeValue({
              category: countdownUrlField === 'streamUrl' ? 'streamUrl' : 'launchUrl',
              fieldKey: countdownUrlField,
              path: [
                'sections',
                String(sectionIndex),
                'fields',
                countdownUrlField,
                'value',
              ],
              runtime,
              sectionId: section.id,
              value: countdownField.value,
            });
          }
        }
      }
    }
  }

  addUnknownFieldIssues({
    fieldEntries: unknownProps,
    pathPrefix: ['sections', String(sectionIndex), 'fields'],
    runtime,
    sectionId: section.id,
  });

  const sectionStates = runtime.issues
    .filter((issue) => issue.sectionId === section.id && !issue.componentId)
    .map((issue) => issue.state);

  return {
    knownFields: knownProps,
    state: aggregateValidationState(sectionStates),
    unknownFields: unknownProps,
  };
}

function validateComponent(
  component: PublicPresenceComponentNode,
  componentIndex: number,
  section: PublicPresenceSectionNode,
  sectionIndex: number,
  runtime: ValidationRuntimeState,
): PublicPresenceNormalizedComponent {
  const definition =
    PUBLIC_PRESENCE_COMPONENT_DEFINITIONS[
      component.type as keyof typeof PUBLIC_PRESENCE_COMPONENT_DEFINITIONS
    ];

  if (!definition) {
    pushIssue(runtime, {
      severity: 'info',
      state: 'validLocked',
      code: 'registry.unknownComponent',
      messageKey: 'publicPresence.validation.unknownComponent',
      path: [
        'sections',
        String(sectionIndex),
        'components',
        String(componentIndex),
        'type',
      ],
      templateId: runtime.templateId,
      sectionId: section.id,
      componentId: component.id,
      blocksVisualEdit: true,
      blocksPublish: false,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: 'lockedSourceOwned',
      suggestedFix: 'Keep the component in Source Schema until a registry definition exists.',
    });

    return {
      id: component.id,
      type: component.type,
      visible: component.visible !== false,
      knownProps: {},
      unknownProps: component.props,
      state: 'validLocked',
    };
  }

  const { knownProps, unknownProps } = pickKnownEntries(
    component.props,
    definition.fieldDefinitions,
  );
  const propsSchema =
    PublicPresenceComponentPropsSchemaMap[
      definition.componentType as keyof typeof PublicPresenceComponentPropsSchemaMap
    ];

  const parsedProps = propsSchema.safeParse(knownProps);
  if (!parsedProps.success) {
    addSchemaIssues({
      componentId: component.id,
      issues: parsedProps.error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: normalizeIssuePath(issue.path),
      })),
      pathPrefix: [
        'sections',
        String(sectionIndex),
        'components',
        String(componentIndex),
        'props',
      ],
      runtime,
      sectionId: section.id,
    });
  }

  addUnknownFieldIssues({
    componentId: component.id,
    fieldEntries: unknownProps,
    pathPrefix: [
      'sections',
      String(sectionIndex),
      'components',
      String(componentIndex),
      'props',
    ],
    runtime,
    sectionId: section.id,
  });

  if (definition.visualSupport === 'locked') {
    pushIssue(runtime, {
      severity: 'info',
      state: 'validLocked',
      code:
        definition.sourcePolicy === 'sourceOnly'
          ? 'registry.sourceOnlyComponent'
          : 'registry.lockedComponent',
      messageKey:
        definition.sourcePolicy === 'sourceOnly'
          ? 'publicPresence.validation.sourceOnlyComponent'
          : 'publicPresence.validation.lockedComponent',
      path: [
        'sections',
        String(sectionIndex),
        'components',
        String(componentIndex),
      ],
      templateId: runtime.templateId,
      sectionId: section.id,
      componentId: component.id,
      blocksVisualEdit: true,
      blocksPublish: false,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: definition.lockedSourceOwnedPolicy,
      suggestedFix:
        definition.sourcePolicy === 'sourceOnly'
          ? 'Preserve this component in Source Schema until a later slice re-owns it.'
          : 'Preserve this component as locked compatibility content.',
    });
  }

  switch (definition.componentType) {
    case 'ProfileCard':
      if (typeof knownProps.avatarUrl === 'string') {
        validateUrlLikeValue({
          category: 'mediaAssetUrl',
          componentId: component.id,
          fieldKey: 'avatarUrl',
          path: [
            'sections',
            String(sectionIndex),
            'components',
            String(componentIndex),
            'props',
            'avatarUrl',
          ],
          runtime,
          sectionId: section.id,
          value: knownProps.avatarUrl,
        });
      }
      break;
    case 'SocialLinks':
      if (Array.isArray(knownProps.platforms)) {
        knownProps.platforms.forEach((platform, platformIndex) => {
          if (!isPlainObject(platform) || typeof platform.url !== 'string') {
            return;
          }

          validateUrlLikeValue({
            category: 'officialChannelUrl',
            componentId: component.id,
            fieldKey: 'platforms',
            path: [
              'sections',
              String(sectionIndex),
              'components',
              String(componentIndex),
              'props',
              'platforms',
              String(platformIndex),
              'url',
            ],
            runtime,
            sectionId: section.id,
            value: platform.url,
          });
        });
      }
      break;
    case 'ImageGallery':
      if (Array.isArray(knownProps.images)) {
        knownProps.images.forEach((image, imageIndex) => {
          if (!isPlainObject(image) || typeof image.url !== 'string') {
            return;
          }

          validateUrlLikeValue({
            category: 'mediaAssetUrl',
            componentId: component.id,
            fieldKey: 'images',
            path: [
              'sections',
              String(sectionIndex),
              'components',
              String(componentIndex),
              'props',
              'images',
              String(imageIndex),
              'url',
            ],
            runtime,
            sectionId: section.id,
            value: image.url,
          });
        });
      }
      break;
    case 'VideoEmbed':
      if (typeof knownProps.videoUrl === 'string') {
        validateUrlLikeValue({
          category: 'embedUrl',
          componentId: component.id,
          fieldKey: 'videoUrl',
          path: [
            'sections',
            String(sectionIndex),
            'components',
            String(componentIndex),
            'props',
            'videoUrl',
          ],
          runtime,
          sectionId: section.id,
          value: knownProps.videoUrl,
        });
      }
      break;
    case 'RichText':
      if (typeof knownProps.contentHtml === 'string') {
        validateHtmlValue({
          componentId: component.id,
          fieldKey: 'contentHtml',
          path: [
            'sections',
            String(sectionIndex),
            'components',
            String(componentIndex),
            'props',
            'contentHtml',
          ],
          runtime,
          sectionId: section.id,
          value: knownProps.contentHtml,
        });
      }
      break;
    case 'LinkButton':
      if (typeof knownProps.url === 'string') {
        validateUrlLikeValue({
          category: 'fanActionUrl',
          componentId: component.id,
          fieldKey: 'url',
          path: [
            'sections',
            String(sectionIndex),
            'components',
            String(componentIndex),
            'props',
            'url',
          ],
          runtime,
          sectionId: section.id,
          value: knownProps.url,
        });
      }
      break;
    case 'MusicPlayer':
      if (typeof knownProps.embedValue === 'string') {
        validateUrlLikeValue({
          category: 'embedUrl',
          componentId: component.id,
          fieldKey: 'embedValue',
          path: [
            'sections',
            String(sectionIndex),
            'components',
            String(componentIndex),
            'props',
            'embedValue',
          ],
          runtime,
          sectionId: section.id,
          value: knownProps.embedValue,
        });
      }
      break;
    case 'LiveStatus':
      if (typeof knownProps.streamUrl === 'string') {
        validateUrlLikeValue({
          category: 'streamUrl',
          componentId: component.id,
          fieldKey: 'streamUrl',
          path: [
            'sections',
            String(sectionIndex),
            'components',
            String(componentIndex),
            'props',
            'streamUrl',
          ],
          runtime,
          sectionId: section.id,
          value: knownProps.streamUrl,
        });
      }
      break;
    default:
      break;
  }

  const componentStates = runtime.issues
    .filter(
      (issue) =>
        issue.sectionId === section.id && issue.componentId === component.id,
    )
    .map((issue) => issue.state);

  return {
    id: component.id,
    type: component.type,
    visible: component.visible !== false,
    knownProps,
    unknownProps,
    state: aggregateValidationState(componentStates),
  };
}

function validateSection(
  section: PublicPresenceSectionNode,
  sectionIndex: number,
  runtime: ValidationRuntimeState,
) {
  const definition =
    PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS[
      section.kind as keyof typeof PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS
    ];
  const templateDefinition =
    PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[runtime.templateId];

  if (!definition) {
    pushIssue(runtime, {
      severity: 'info',
      state: 'validLocked',
      code: 'registry.unknownSection',
      messageKey: 'publicPresence.validation.unknownSection',
      path: ['sections', String(sectionIndex), 'kind'],
      templateId: runtime.templateId,
      sectionId: section.id,
      blocksVisualEdit: true,
      blocksPublish: false,
      blocksAiPatch: true,
      acknowledgementRequired: false,
      fallbackBehavior: 'lockedSourceOwned',
      suggestedFix: 'Keep the section in Source Schema until the registry defines it.',
    });
  } else {
    const allowedSections = new Set([
      ...templateDefinition.requiredSections,
      ...templateDefinition.recommendedSections,
      ...templateDefinition.optionalSections,
      ...templateDefinition.lockedSections,
    ]);

    if (!allowedSections.has(definition.kind)) {
      pushIssue(runtime, {
        severity: 'blocker',
        state: 'invalidRecoverable',
        code: 'template.sectionNotAllowed',
        messageKey: 'publicPresence.validation.sectionNotAllowed',
        path: ['sections', String(sectionIndex), 'kind'],
        templateId: runtime.templateId,
        sectionId: section.id,
        blocksVisualEdit: false,
        blocksPublish: true,
        blocksAiPatch: true,
        acknowledgementRequired: false,
        fallbackBehavior: 'hide',
        suggestedFix: 'Use a section allowed by the selected template.',
      });
    }
  }

  const { knownFields, state: fieldState, unknownFields } = validateSectionFields(
    section,
    sectionIndex,
    runtime,
  );

  const components = (section.components ?? []).map((component, componentIndex) =>
    validateComponent(component, componentIndex, section, sectionIndex, runtime),
  );

  if (definition) {
    const allowedComponentTypes = new Set(definition.allowedComponents);
    components.forEach((component, componentIndex) => {
      if (
        component.type in PUBLIC_PRESENCE_COMPONENT_DEFINITIONS
        && allowedComponentTypes.size > 0
        && !allowedComponentTypes.has(component.type)
      ) {
        pushIssue(runtime, {
          severity: 'blocker',
          state: 'invalidRecoverable',
          code: 'section.componentNotAllowed',
          messageKey: 'publicPresence.validation.componentNotAllowed',
          path: [
            'sections',
            String(sectionIndex),
            'components',
            String(componentIndex),
            'type',
          ],
          templateId: runtime.templateId,
          sectionId: section.id,
          componentId: component.id,
          blocksVisualEdit: false,
          blocksPublish: true,
          blocksAiPatch: true,
          acknowledgementRequired: false,
          fallbackBehavior: 'hide',
          suggestedFix: 'Move the component into a compatible section.',
        });
      }
    });
  }

  return {
    id: section.id,
    kind: section.kind,
    knownFields,
    unknownFields,
    components,
    state: aggregateValidationState([
      fieldState,
      ...components.map((component) => component.state),
      ...runtime.issues
        .filter((issue) => issue.sectionId === section.id && !issue.componentId)
        .map((issue) => issue.state),
    ]),
  };
}

export function createPublicPresenceValidationArtifact(
  input: unknown,
  options: ValidationOptions = {},
): PublicPresenceValidationArtifact {
  const document = PublicPresenceDocumentSchema.parse(input);
  const runtime: ValidationRuntimeState = {
    issues: [],
    fallbackDecisions: [],
    templateId: document.templateId,
  };
  const templateDefinition =
    PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[document.templateId];

  for (const requiredSection of templateDefinition.requiredSections) {
    if (!document.sections.some((section) => section.kind === requiredSection)) {
      pushIssue(runtime, {
        severity: 'blocker',
        state: 'invalidRecoverable',
        code: 'template.missingRequiredSection',
        messageKey: 'publicPresence.validation.missingRequiredSection',
        path: ['sections'],
        templateId: document.templateId,
        fieldKey: requiredSection,
        blocksVisualEdit: false,
        blocksPublish: true,
        blocksAiPatch: true,
        acknowledgementRequired: false,
        fallbackBehavior: 'hide',
        suggestedFix: `Add the required ${requiredSection} section.`,
      });
    }
  }

  const normalizedSections = document.sections.map((section, sectionIndex) =>
    validateSection(section, sectionIndex, runtime),
  );

  if (document.metadata?.ogImageUrl) {
    validateUrlLikeValue({
      category: 'mediaAssetUrl',
      fieldKey: 'ogImageUrl',
      path: ['metadata', 'ogImageUrl'],
      runtime,
      value: document.metadata.ogImageUrl,
    });
  }

  const issueCounts = runtime.issues.reduce<PublicPresenceValidationSnapshot['issueCounts']>(
    (accumulator, issue) => {
      accumulator[issue.severity] += 1;
      return accumulator;
    },
    {
      fatal: 0,
      blocker: 0,
      warning: 0,
      info: 0,
    },
  );

  const snapshot: PublicPresenceValidationSnapshot = {
    snapshotId: createPublicPresenceValidationIssueId({
      code: 'snapshot',
      path: ['validation', options.mode ?? DEFAULT_VALIDATION_MODE],
      templateId: document.templateId,
    }),
    schemaVersion: '1.0.0',
    validationMode: options.mode ?? DEFAULT_VALIDATION_MODE,
    documentSchemaVersion: document.schemaVersion,
    templateId: document.templateId,
    templateRegistryVersion: PUBLIC_PRESENCE_REGISTRY_METADATA.registryVersion,
    componentRegistryVersion: PUBLIC_PRESENCE_REGISTRY_METADATA.registryVersion,
    safetyPolicyVersion: PUBLIC_PRESENCE_REGISTRY_METADATA.safetyPolicyVersion,
    issueCounts,
    blockerIds: runtime.issues
      .filter((issue) => issue.blocksPublish)
      .map((issue) => issue.id),
    issues: runtime.issues,
    fallbackDecisions: runtime.fallbackDecisions,
    acknowledgementIds: runtime.issues
      .filter((issue) => issue.acknowledgementRequired)
      .map((issue) => issue.id),
    projectionHash: null,
  };

  PublicPresenceValidationSnapshotSchema.parse(snapshot);

  return {
    document,
    normalizedDocument: {
      schemaVersion: document.schemaVersion,
      templateId: document.templateId,
      sections: normalizedSections,
    },
    snapshot,
  };
}

export function validatePublicPresenceDocument(
  input: unknown,
  options: ValidationOptions = {},
) {
  return createPublicPresenceValidationArtifact(input, options).snapshot;
}
