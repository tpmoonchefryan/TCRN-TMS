import { expect, test, type Locator, type Page } from '@playwright/test';

const sessionStorageKey = 'tcrn.web.session';
const localeOverrideStorageKey = 'tcrn.web.locale.override';
const privateVisualLongHomepageUrl =
  'https://very-long-public-homepage.example.test/tenant/visual/subsidiary/tokyo/talent/visual/homepage/with/a/path/that/should/wrap/inside/the/summary/card';
const privateVisualLongCustomDomain =
  'very-long-public-homepage-custom-domain-name-for-visual-regression.example.test';
let privateVisualUseLongHomepageFixture = false;
let privateVisualUseCustomDomainStorageError = false;

const privateVisualReportCatalog = [
  {
    id: 'mfr',
    name: {
      en: 'Member Feedback Report',
    },
    description: {
      en: 'Export membership data for physical gift delivery or digital rewards through the approved PII handoff flow.',
    },
    icon: 'Gift',
    availability: {
      status: 'available',
      requiredPermissions: [
        {
          resource: 'report.mfr',
          actions: ['read', 'export'],
        },
      ],
    },
    artifactKinds: ['xlsx', 'csv', 'pii_platform_portal'],
    filterSchema: {
      version: 1,
      fields: [
        {
          id: 'platformCodes',
          type: 'config-multi-select',
          targetField: 'platformCodes',
          label: {
            en: 'Platforms',
          },
          description: {
            en: 'Limit the report to configured social platform codes.',
          },
          source: {
            kind: 'config-entity',
            entityType: 'social-platform',
          },
        },
        {
          id: 'membershipClassCodes',
          type: 'config-multi-select',
          targetField: 'membershipClassCodes',
          label: {
            en: 'Membership classes',
          },
          source: {
            kind: 'config-entity',
            entityType: 'membership-class',
          },
        },
        {
          id: 'membershipTypeCodes',
          type: 'config-multi-select',
          targetField: 'membershipTypeCodes',
          label: {
            en: 'Membership types',
          },
          source: {
            kind: 'config-entity',
            entityType: 'membership-type',
          },
        },
        {
          id: 'membershipLevelCodes',
          type: 'config-multi-select',
          targetField: 'membershipLevelCodes',
          label: {
            en: 'Membership levels',
          },
          source: {
            kind: 'config-entity',
            entityType: 'membership-level',
          },
        },
        {
          id: 'statusCodes',
          type: 'config-multi-select',
          targetField: 'statusCodes',
          label: {
            en: 'Customer statuses',
          },
          source: {
            kind: 'config-entity',
            entityType: 'customer-status',
          },
        },
        {
          id: 'validFrom',
          type: 'date-range',
          fromField: 'validFromStart',
          toField: 'validFromEnd',
          label: {
            en: 'Valid from',
          },
        },
        {
          id: 'validTo',
          type: 'date-range',
          fromField: 'validToStart',
          toField: 'validToEnd',
          label: {
            en: 'Valid to',
          },
        },
        {
          id: 'includeExpired',
          type: 'boolean',
          targetField: 'includeExpired',
          label: {
            en: 'Include expired memberships',
          },
          defaultValue: false,
        },
        {
          id: 'includeInactive',
          type: 'boolean',
          targetField: 'includeInactive',
          label: {
            en: 'Include inactive customers',
          },
          defaultValue: false,
        },
        {
          id: 'platformCodesRaw',
          type: 'raw-code-list',
          targetField: 'platformCodes',
          fallbackForFieldId: 'platformCodes',
          label: {
            en: 'Raw platform codes',
          },
          advanced: true,
        },
      ],
    },
  },
];

const privateVisualAdapterDefinitions = [
  {
    key: 'ai-adapter',
    code: 'AI_ADAPTER',
    adapterType: 'ai',
    name: {
      en: 'AI Adapter',
      zh_HANS: 'AI Adapter',
      zh_HANT: 'AI Adapter',
      ja: 'AI Adapter',
      ko: 'AI Adapter',
      fr: 'AI Adapter',
    },
    description: {
      en: 'Generic token-only AI provider configuration.',
      zh_HANS: 'Generic token-only AI provider configuration.',
      zh_HANT: 'Generic token-only AI provider configuration.',
      ja: 'Generic token-only AI provider configuration.',
      ko: 'Generic token-only AI provider configuration.',
      fr: 'Generic token-only AI provider configuration.',
    },
    platform: {
      code: 'AI_ADAPTER',
      displayName: 'AI Adapter',
      nameEn: 'AI Adapter',
      baseUrl: null,
      iconUrl: null,
      color: '#6366F1',
    },
    configFields: [
      {
        key: 'provider',
        label: {
          en: 'Provider',
          zh_HANS: 'Provider',
          zh_HANT: 'Provider',
          ja: 'Provider',
          ko: 'Provider',
          fr: 'Provider',
        },
        input: 'select',
        required: true,
        secret: false,
        defaultValue: 'OPENAI',
        options: [
          {
            value: 'OPENAI',
            label: {
              en: 'OpenAI',
              zh_HANS: 'OpenAI',
              zh_HANT: 'OpenAI',
              ja: 'OpenAI',
              ko: 'OpenAI',
              fr: 'OpenAI',
            },
          },
          {
            value: 'ANTHROPIC',
            label: {
              en: 'Anthropic',
              zh_HANS: 'Anthropic',
              zh_HANT: 'Anthropic',
              ja: 'Anthropic',
              ko: 'Anthropic',
              fr: 'Anthropic',
            },
          },
          {
            value: 'GEMINI',
            label: {
              en: 'Gemini',
              zh_HANS: 'Gemini',
              zh_HANT: 'Gemini',
              ja: 'Gemini',
              ko: 'Gemini',
              fr: 'Gemini',
            },
          },
        ],
      },
      {
        key: 'endpoint_path',
        label: {
          en: 'Endpoint path',
          zh_HANS: 'Endpoint path',
          zh_HANT: 'Endpoint path',
          ja: 'Endpoint path',
          ko: 'Endpoint path',
          fr: 'Endpoint path',
        },
        description: {
          en: 'Editable provider endpoint path.',
          zh_HANS: 'Editable provider endpoint path.',
          zh_HANT: 'Editable provider endpoint path.',
          ja: 'Editable provider endpoint path.',
          ko: 'Editable provider endpoint path.',
          fr: 'Editable provider endpoint path.',
        },
        input: 'text',
        required: true,
        secret: false,
        defaultValue: '/v1/responses',
      },
      {
        key: 'model',
        label: {
          en: 'Model',
          zh_HANS: 'Model',
          zh_HANT: 'Model',
          ja: 'Model',
          ko: 'Model',
          fr: 'Model',
        },
        input: 'text',
        required: true,
        secret: false,
      },
      {
        key: 'token',
        label: {
          en: 'Token',
          zh_HANS: 'Token',
          zh_HANT: 'Token',
          ja: 'Token',
          ko: 'Token',
          fr: 'Token',
        },
        input: 'password',
        required: true,
        secret: true,
      },
    ],
    protocol: {
      family: 'generic-rest',
      payloadFormat: 'official-provider-protocol',
      invocationRuntime: 'not_implemented',
      notes: {
        en: 'This definition stores provider configuration only. AI invocation is intentionally not implemented in this package.',
        zh_HANS: 'This definition stores provider configuration only. AI invocation is intentionally not implemented in this package.',
        zh_HANT: 'This definition stores provider configuration only. AI invocation is intentionally not implemented in this package.',
        ja: 'This definition stores provider configuration only. AI invocation is intentionally not implemented in this package.',
        ko: 'This definition stores provider configuration only. AI invocation is intentionally not implemented in this package.',
        fr: 'This definition stores provider configuration only. AI invocation is intentionally not implemented in this package.',
      },
    },
    capabilities: ['ai_provider_config'],
    aiProviders: [
      {
        provider: 'OPENAI',
        label: {
          en: 'OpenAI',
          zh_HANS: 'OpenAI',
          zh_HANT: 'OpenAI',
          ja: 'OpenAI',
          ko: 'OpenAI',
          fr: 'OpenAI',
        },
        endpointPathDefault: '/v1/responses',
        modelPlaceholder: 'gpt-example',
        protocol: {
          family: 'openai-responses',
          payloadFormat: 'official-provider-protocol',
          invocationRuntime: 'not_implemented',
          notes: {
            en: 'Provider configuration only.',
            zh_HANS: 'Provider configuration only.',
            zh_HANT: 'Provider configuration only.',
            ja: 'Provider configuration only.',
            ko: 'Provider configuration only.',
            fr: 'Provider configuration only.',
          },
        },
      },
      {
        provider: 'ANTHROPIC',
        label: {
          en: 'Anthropic',
          zh_HANS: 'Anthropic',
          zh_HANT: 'Anthropic',
          ja: 'Anthropic',
          ko: 'Anthropic',
          fr: 'Anthropic',
        },
        endpointPathDefault: '/v1/messages',
        modelPlaceholder: 'claude-example',
        protocol: {
          family: 'anthropic-messages',
          payloadFormat: 'official-provider-protocol',
          invocationRuntime: 'not_implemented',
          notes: {
            en: 'Provider configuration only.',
            zh_HANS: 'Provider configuration only.',
            zh_HANT: 'Provider configuration only.',
            ja: 'Provider configuration only.',
            ko: 'Provider configuration only.',
            fr: 'Provider configuration only.',
          },
        },
      },
      {
        provider: 'GEMINI',
        label: {
          en: 'Gemini',
          zh_HANS: 'Gemini',
          zh_HANT: 'Gemini',
          ja: 'Gemini',
          ko: 'Gemini',
          fr: 'Gemini',
        },
        endpointPathDefault: '/v1beta/models/{model}:generateContent',
        modelPlaceholder: 'gemini-example',
        protocol: {
          family: 'gemini-generate-content',
          payloadFormat: 'official-provider-protocol',
          invocationRuntime: 'not_implemented',
          notes: {
            en: 'Provider configuration only.',
            zh_HANS: 'Provider configuration only.',
            zh_HANT: 'Provider configuration only.',
            ja: 'Provider configuration only.',
            ko: 'Provider configuration only.',
            fr: 'Provider configuration only.',
          },
        },
      },
    ],
  },
];

const privateVisualWebhookDefinitions = [
  {
    key: 'customer-lifecycle',
    code: 'CUSTOMER_LIFECYCLE',
    name: {
      en: 'Customer lifecycle webhook',
      zh_HANS: 'Customer lifecycle webhook',
      zh_HANT: 'Customer lifecycle webhook',
      ja: 'Customer lifecycle webhook',
      ko: 'Customer lifecycle webhook',
      fr: 'Customer lifecycle webhook',
    },
    description: {
      en: 'Receives customer create, update, and deactivate events.',
      zh_HANS: 'Receives customer create, update, and deactivate events.',
      zh_HANT: 'Receives customer create, update, and deactivate events.',
      ja: 'Receives customer create, update, and deactivate events.',
      ko: 'Receives customer create, update, and deactivate events.',
      fr: 'Receives customer create, update, and deactivate events.',
    },
    events: ['customer.created', 'customer.updated', 'customer.deactivated'],
    defaultRetryPolicy: {
      maxRetries: 3,
      backoffMs: 1000,
    },
  },
];

const visualQaSession = {
  accessToken: 'visual-qa-token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  authenticatedAt: '2026-05-06T00:00:00.000Z',
  tenantId: 'tenant-visual',
  tenantName: 'Visual Tenant',
  tenantTier: 'standard',
  tenantCode: 'VISUAL',
  user: {
    id: 'user-visual',
    username: 'visual-user',
    email: 'visual@example.com',
    displayName: 'Visual Operator',
    avatarUrl: null,
    preferredLanguage: 'en',
    totpEnabled: false,
    forceReset: false,
    passwordExpiresAt: null,
  },
};

const privateVisualPlatformAdminAssignment = {
  id: 'assignment-platform-admin',
  roleId: 'role-platform-admin',
  roleCode: 'PLATFORM_ADMIN',
  roleNameEn: 'Platform Administrator',
  roleNameZh: '平台管理员',
  roleNameJa: null,
  roleIsActive: true,
  scopeType: 'tenant',
  scopeId: null,
  scopeName: 'AC Visual Tenant',
  scopePath: null,
  inherit: false,
  grantedAt: '2026-05-06T03:00:00.000Z',
  expiresAt: null,
};

let privateVisualRoleAssignments: Array<Record<string, unknown>> = [
  privateVisualPlatformAdminAssignment,
];

const visualQaAcSession = {
  ...visualQaSession,
  tenantId: 'tenant-ac-visual',
  tenantName: 'AC Visual Tenant',
  tenantTier: 'ac',
  tenantCode: 'ACVISUAL',
  user: {
    ...visualQaSession.user,
    id: 'user-ac-visual',
    username: 'ac.visual',
    email: 'ac.visual@example.com',
    displayName: 'AC Visual Operator',
  },
};

const privateVisualEmptyOrganizationTree = {
  tenantId: visualQaSession.tenantId,
  subsidiaries: [],
  directTalents: [],
};

const privateVisualIntegrationOrganizationTree = {
  tenantId: visualQaSession.tenantId,
  subsidiaries: [
    {
      id: 'subsidiary-visual',
      code: 'TOKYO',
      displayName: 'Tokyo Branch',
      parentId: null,
      path: '/tokyo',
      talents: [
        {
          id: 'talent-visual',
          code: 'VISUAL_TALENT',
          displayName: 'Visual Talent',
          avatarUrl: null,
          subsidiaryId: 'subsidiary-visual',
          subsidiaryName: 'Tokyo Branch',
          path: '/tokyo/visual',
          homepagePath: 'visual',
          lifecycleStatus: 'published',
          publishedAt: '2026-05-06T03:00:00.000Z',
          isActive: true,
        },
      ],
      children: [],
    },
  ],
  directTalents: [
    {
      id: 'talent-root-visual',
      code: 'ROOT_VISUAL',
      displayName: 'Root Visual Talent',
      avatarUrl: null,
      subsidiaryId: null,
      subsidiaryName: null,
      path: '/root-visual',
      homepagePath: 'root-visual',
      lifecycleStatus: 'published',
      publishedAt: '2026-05-06T03:00:00.000Z',
      isActive: true,
    },
  ],
};

let privateVisualOrganizationTree = privateVisualEmptyOrganizationTree;

const privateVisualScopeSettings = {
  scopeType: 'tenant',
  scopeId: null,
  settings: {
    defaultLanguage: 'en',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    currency: 'USD',
    customerImportEnabled: true,
    maxImportRows: 5000,
    totpRequiredForAll: false,
    allowCustomHomepage: true,
    allowMarshmallow: true,
    passwordPolicy: {
      minLength: 12,
      requireSpecial: true,
      maxAgeDays: 90,
    },
  },
  overrides: ['defaultLanguage', 'timezone', 'dateFormat', 'currency'],
  inheritedFrom: {
    defaultLanguage: 'tenant',
    timezone: 'tenant',
    dateFormat: 'tenant',
    currency: 'tenant',
    customerImportEnabled: 'tenant',
    maxImportRows: 'tenant',
    totpRequiredForAll: 'tenant',
    allowCustomHomepage: 'tenant',
    allowMarshmallow: 'tenant',
    passwordPolicy: 'tenant',
  },
  version: 3,
};

const privateVisualTenantTurnstileSettings = {
  siteKey: '0x4AAAAAAAVISUALSITEKEY',
  effectiveSiteKey: '0x4AAAAAAAVISUALSITEKEY',
  source: 'tenant',
  environment: 'staging',
  siteKeyConfigured: true,
  secretKeyConfigured: true,
  providerReady: true,
  runtimeBypass: false,
  ready: true,
  secretKeyMasked: '********',
};

const privateVisualSubsidiaryDetail = {
  id: 'subsidiary-visual',
  parentId: null,
  code: 'TOKYO',
  path: '/tokyo',
  depth: 1,
  nameEn: 'Tokyo Branch',
  nameZh: null,
  nameJa: null,
  name: 'Tokyo Branch',
  descriptionEn: 'Deterministic subsidiary for visual QA.',
  descriptionZh: null,
  descriptionJa: null,
  sortOrder: 10,
  isActive: true,
  childrenCount: 0,
  talentCount: 1,
  createdAt: '2026-05-06T03:00:00.000Z',
  updatedAt: '2026-05-06T04:00:00.000Z',
  version: 2,
};

const privateVisualSubsidiarySettings = {
  scopeType: 'subsidiary',
  scopeId: 'subsidiary-visual',
  settings: {
    defaultLanguage: 'en',
    timezone: 'Asia/Tokyo',
    dateFormat: 'YYYY-MM-DD',
    currency: 'JPY',
    customerImportEnabled: true,
    maxImportRows: 3000,
    totpRequiredForAll: false,
    allowCustomHomepage: true,
    allowMarshmallow: true,
    passwordPolicy: {
      minLength: 12,
      requireSpecial: true,
      maxAgeDays: 90,
    },
  },
  overrides: ['timezone', 'currency'],
  inheritedFrom: {
    defaultLanguage: 'tenant',
    timezone: 'subsidiary',
    dateFormat: 'tenant',
    currency: 'subsidiary',
    customerImportEnabled: 'tenant',
    maxImportRows: 'tenant',
    totpRequiredForAll: 'tenant',
    allowCustomHomepage: 'tenant',
    allowMarshmallow: 'tenant',
    passwordPolicy: 'tenant',
  },
  version: 4,
};

const privateVisualTalentSettings = {
  scopeType: 'talent',
  scopeId: 'talent-visual',
  settings: {
    defaultLanguage: 'en',
    timezone: 'Asia/Tokyo',
    dateFormat: 'YYYY-MM-DD',
    currency: 'JPY',
    customerImportEnabled: true,
    maxImportRows: 2000,
    totpRequiredForAll: false,
    allowCustomHomepage: true,
    allowMarshmallow: true,
    passwordPolicy: {
      minLength: 12,
      requireSpecial: true,
      maxAgeDays: 90,
    },
  },
  overrides: ['timezone'],
  inheritedFrom: {
    defaultLanguage: 'tenant',
    timezone: 'talent',
    dateFormat: 'tenant',
    currency: 'subsidiary',
    customerImportEnabled: 'tenant',
    maxImportRows: 'tenant',
    totpRequiredForAll: 'tenant',
    allowCustomHomepage: 'tenant',
    allowMarshmallow: 'tenant',
    passwordPolicy: 'tenant',
  },
  version: 5,
};

const privateVisualProfileStore = {
  id: 'profile-store-visual',
  code: 'DEFAULT_STORE',
  name: 'Default Store',
  nameEn: 'Default Store',
  nameZh: null,
  nameJa: null,
  translations: {},
  talentCount: 1,
  customerCount: 0,
  isDefault: true,
  isActive: true,
  createdAt: '2026-05-06T03:00:00.000Z',
  version: 1,
  piiProxyUrl: 'https://pii.visual.example',
};

const privateVisualTalentDetail = {
  id: 'talent-visual',
  subsidiaryId: 'subsidiary-visual',
  profileStoreId: 'profile-store-visual',
  profileStore: privateVisualProfileStore,
  code: 'VISUAL_TALENT',
  path: '/TOKYO/VISUAL_TALENT/',
  nameEn: 'Visual Talent',
  nameZh: null,
  nameJa: null,
  name: 'Visual Talent',
  displayName: 'Visual Talent',
  descriptionEn: null,
  descriptionZh: null,
  descriptionJa: null,
  avatarUrl: null,
  homepagePath: 'visual',
  timezone: 'Asia/Tokyo',
  lifecycleStatus: 'published',
  publishedAt: '2026-05-06T03:00:00.000Z',
  publishedBy: 'user-visual',
  isActive: true,
  settings: privateVisualTalentSettings.settings,
  stats: {
    customerCount: 0,
    homepageVersionCount: 1,
    marshmallowMessageCount: 1,
  },
  externalPagesDomain: {
    homepage: {
      isPublished: true,
    },
    marshmallow: {
      isEnabled: true,
    },
  },
  createdAt: '2026-05-06T03:00:00.000Z',
  updatedAt: '2026-05-06T04:00:00.000Z',
  version: 5,
};

const privateVisualInheritedTalentDomain = {
  id: 'domain-tenant-visual',
  hostname: 'visual.example.test',
  ownerType: 'tenant',
  ownerId: visualQaSession.tenantId,
  ownerDepth: 0,
  inherited: true,
  selected: true,
  customDomainVerified: true,
  customDomainSslMode: 'auto',
  isActive: true,
  routeMode: 'scoped_talent_path',
  routePrefix: 'visual',
  homepagePath: 'homepage',
  marshmallowPath: 'marshmallow',
};

const privateVisualTenantCustomDomainBinding = {
  id: 'domain-tenant-brand',
  hostname: 'tenant.example.test',
  ownerType: 'tenant',
  ownerId: visualQaSession.tenantId,
  ownerDepth: 0,
  inherited: false,
  selected: false,
  customDomainVerified: true,
  customDomainVerificationToken: null,
  customDomainSslMode: 'auto',
  isActive: true,
  routeMode: 'scoped_talent_path',
};

const privateVisualSubsidiaryCustomDomainBinding = {
  id: 'domain-subsidiary-tokyo',
  hostname: 'tokyo.example.test',
  ownerType: 'subsidiary',
  ownerId: 'subsidiary-visual',
  ownerDepth: 1,
  inherited: false,
  selected: false,
  customDomainVerified: true,
  customDomainVerificationToken: null,
  customDomainSslMode: 'auto',
  isActive: true,
  routeMode: 'scoped_talent_path',
};

const privateVisualTalentCustomDomainBinding = {
  id: 'domain-talent-visual',
  hostname: 'visual-talent.example.test',
  ownerType: 'talent',
  ownerId: 'talent-visual',
  ownerDepth: 2,
  inherited: false,
  selected: false,
  customDomainVerified: false,
  customDomainVerificationToken: 'visual-talent-token',
  customDomainSslMode: 'auto',
  isActive: true,
  routeMode: 'dedicated_talent',
};

type PrivateVisualCustomDomainBinding = typeof privateVisualTenantCustomDomainBinding;
type PrivateVisualCustomDomainMutation = {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
};

let privateVisualTenantCustomDomainBindings: PrivateVisualCustomDomainBinding[] = [];
let privateVisualSubsidiaryCustomDomainBindings: PrivateVisualCustomDomainBinding[] = [];
let privateVisualTalentCustomDomainBindings: PrivateVisualCustomDomainBinding[] = [];
let privateVisualCustomDomainMutations: PrivateVisualCustomDomainMutation[] = [];

function resetPrivateVisualCustomDomainFixtures() {
  privateVisualTenantCustomDomainBindings = [{ ...privateVisualTenantCustomDomainBinding }];
  privateVisualSubsidiaryCustomDomainBindings = [{ ...privateVisualSubsidiaryCustomDomainBinding }];
  privateVisualTalentCustomDomainBindings = [{ ...privateVisualTalentCustomDomainBinding }];
  privateVisualCustomDomainMutations = [];
}

function getPrivateVisualOwnedBindings(scopeType: 'tenant' | 'subsidiary' | 'talent') {
  if (scopeType === 'tenant') {
    return privateVisualTenantCustomDomainBindings;
  }

  if (scopeType === 'subsidiary') {
    return privateVisualSubsidiaryCustomDomainBindings;
  }

  return privateVisualTalentCustomDomainBindings;
}

function setPrivateVisualOwnedBindings(
  scopeType: 'tenant' | 'subsidiary' | 'talent',
  domains: PrivateVisualCustomDomainBinding[],
) {
  if (scopeType === 'tenant') {
    privateVisualTenantCustomDomainBindings = domains;
    return;
  }

  if (scopeType === 'subsidiary') {
    privateVisualSubsidiaryCustomDomainBindings = domains;
    return;
  }

  privateVisualTalentCustomDomainBindings = domains;
}

function buildPrivateVisualCustomDomainBinding(
  id: string,
  input: {
    ownerType: 'tenant' | 'subsidiary' | 'talent';
    ownerId?: string | null;
    hostname: string;
    customDomainSslMode?: string;
    isActive?: boolean;
    customDomainVerified?: boolean;
    customDomainVerificationToken: string | null;
  },
): PrivateVisualCustomDomainBinding {
  return {
    id,
    hostname: input.hostname,
    ownerType: input.ownerType,
    ownerId:
      input.ownerType === 'tenant'
        ? visualQaSession.tenantId
        : (input.ownerId ?? null),
    ownerDepth: input.ownerType === 'tenant' ? 0 : input.ownerType === 'subsidiary' ? 1 : 2,
    inherited: false,
    selected: false,
    customDomainVerified: input.customDomainVerified ?? false,
    customDomainVerificationToken: input.customDomainVerificationToken,
    customDomainSslMode: input.customDomainSslMode ?? 'auto',
    isActive: input.isActive ?? true,
    routeMode: input.ownerType === 'talent' ? 'dedicated_talent' : 'scoped_talent_path',
  };
}

function cloneCustomDomainBinding(
  domain: typeof privateVisualTenantCustomDomainBinding,
  inherited: boolean,
  selected = false,
) {
  return {
    ...domain,
    inherited,
    selected,
  };
}

function listPrivateVisualCustomDomainBindings(url: URL) {
  const scopeType = url.searchParams.get('scopeType');
  const includeInherited = url.searchParams.get('includeInherited') !== 'false';
  const search = url.searchParams.get('search')?.trim().toLowerCase();
  let domains: Array<typeof privateVisualTenantCustomDomainBinding> = [];

  if (scopeType === 'tenant') {
    domains = privateVisualTenantCustomDomainBindings.map((domain) =>
      cloneCustomDomainBinding(domain, false),
    );
  } else if (scopeType === 'subsidiary') {
    domains = includeInherited
      ? [
          ...privateVisualTenantCustomDomainBindings.map((domain) =>
            cloneCustomDomainBinding(domain, true),
          ),
          ...privateVisualSubsidiaryCustomDomainBindings.map((domain) =>
            cloneCustomDomainBinding(domain, false),
          ),
        ]
      : privateVisualSubsidiaryCustomDomainBindings.map((domain) =>
          cloneCustomDomainBinding(domain, false),
        );
  } else if (scopeType === 'talent') {
    domains = includeInherited
      ? [
          ...privateVisualTenantCustomDomainBindings.map((domain) =>
            cloneCustomDomainBinding(domain, true, true),
          ),
          ...privateVisualSubsidiaryCustomDomainBindings.map((domain) =>
            cloneCustomDomainBinding(domain, true, true),
          ),
          ...privateVisualTalentCustomDomainBindings.map((domain) =>
            cloneCustomDomainBinding(domain, false),
          ),
        ]
      : privateVisualTalentCustomDomainBindings.map((domain) =>
          cloneCustomDomainBinding(domain, false),
        );
  }

  return search
    ? domains.filter((domain) => domain.hostname.toLowerCase().includes(search))
    : domains;
}

const privateLocaleVisualQaCases = [
  {
    name: 'English',
    locale: 'en',
    openNavigationLabel: 'Open workspace navigation',
    tableLabel: 'System users',
  },
  {
    name: 'Simplified Chinese',
    locale: 'zh_HANS',
    openNavigationLabel: '打开工作区导航',
    tableLabel: '系统用户',
  },
  {
    name: 'Traditional Chinese',
    locale: 'zh_HANT',
    openNavigationLabel: '開啟工作區導覽',
    tableLabel: '系统用户',
  },
  {
    name: 'Japanese',
    locale: 'ja',
    openNavigationLabel: 'ワークスペースナビゲーションを開く',
    tableLabel: 'システムユーザー',
  },
  {
    name: 'Korean',
    locale: 'ko',
    openNavigationLabel: '워크스페이스 탐색 열기',
    tableLabel: 'System users',
  },
  {
    name: 'French',
    locale: 'fr',
    openNavigationLabel: 'Ouvrir la navigation de l’espace de travail',
    tableLabel: 'System users',
  },
];

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return Math.ceil(scrollWidth - window.innerWidth);
  });

  expect(overflow, `${label} horizontal overflow`).toBeLessThanOrEqual(1);
}

async function expectVisibleExactTextCount(root: Locator, text: string, expected: number, label: string) {
  const count = await root.getByText(text, { exact: true }).evaluateAll((elements) =>
    elements.filter((element) => {
      const style = window.getComputedStyle(element);

      return (
        style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.getClientRects().length > 0
      );
    }).length,
  );

  expect(count, label).toBe(expected);
}

async function hideFrameworkDevTools(page: Page) {
  await page.addStyleTag({
    content: `
      nextjs-portal,
      button[aria-label="Open Next.js Dev Tools"] {
        display: none !important;
      }
    `,
  });
}

async function tabUntilFocused(page: Page, locator: Locator, maxTabs = 10) {
  for (let index = 0; index < maxTabs; index += 1) {
    if (
      await locator.evaluate((element) => document.activeElement === element).catch(() => false)
    ) {
      return;
    }

    await page.keyboard.press('Tab');
  }

  await expect(locator).toBeFocused();
}

async function usePrivateSession(page: Page, session = visualQaSession) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    },
    { key: sessionStorageKey, value: session }
  );
}

async function useLocaleOverride(page: Page, locale: string) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: localeOverrideStorageKey, value: locale }
  );
}

async function mockPrivateRuntimeApi(page: Page) {
  await page.context().route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/v1/organization/tree') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: privateVisualOrganizationTree,
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/organization/settings') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: privateVisualScopeSettings,
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/organization/settings/turnstile') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: privateVisualTenantTurnstileSettings,
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/subsidiaries/subsidiary-visual') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: privateVisualSubsidiaryDetail,
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/subsidiaries/subsidiary-visual/settings') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: privateVisualSubsidiarySettings,
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/profile-stores') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [privateVisualProfileStore],
            meta: {
              pagination: {
                page: 1,
                pageSize: 20,
                totalCount: 1,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
              },
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/system-dictionary') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              type: 'CUSTOMER_STATUS',
              name: 'Customer Status',
              description: 'Customer status labels',
              count: 1,
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/system-dictionary/CUSTOMER_STATUS') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'dictionary-item-active',
              dictionaryCode: 'CUSTOMER_STATUS',
              code: 'ACTIVE',
              nameEn: 'Active customer',
              nameZh: null,
              nameJa: null,
              translations: {},
              name: 'Active customer',
              descriptionEn: null,
              descriptionZh: null,
              descriptionJa: null,
              descriptionTranslations: {},
              sortOrder: 0,
              isActive: true,
              extraData: null,
              createdAt: '2026-05-06T03:00:00.000Z',
              updatedAt: '2026-05-06T04:00:00.000Z',
              version: 1,
            },
          ],
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/users/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: visualQaSession.user.id,
            username: visualQaSession.user.username,
            email: visualQaSession.user.email,
            phone: null,
            displayName: visualQaSession.user.displayName,
            avatarUrl: null,
            preferredLanguage: 'en',
            totpEnabled: false,
            forceReset: false,
            lastLoginAt: '2026-05-06T04:00:00.000Z',
            passwordChangedAt: '2026-05-01T04:00:00.000Z',
            passwordExpiresAt: null,
            createdAt: '2026-05-01T00:00:00.000Z',
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/users/me/sessions') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'session-current',
              deviceInfo: 'Visual QA browser',
              ipAddress: '127.0.0.1',
              createdAt: '2026-05-06T03:00:00.000Z',
              lastActiveAt: '2026-05-06T04:00:00.000Z',
              isCurrent: true,
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: privateVisualTalentDetail,
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual/settings') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: privateVisualTalentSettings,
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual/homepage') {
      const homepageUrl = privateVisualUseLongHomepageFixture
        ? privateVisualLongHomepageUrl
        : 'https://example.test/VISUAL/VISUAL_TALENT/homepage';
      const customDomain = privateVisualUseLongHomepageFixture
        ? privateVisualLongCustomDomain
        : null;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'homepage-visual',
            talentId: 'talent-visual',
            isPublished: true,
            publishedVersion: null,
            draftVersion: {
              id: 'draft-homepage-visual',
              versionNumber: 3,
              createdAt: '2026-05-06T04:00:00.000Z',
              publishedAt: null,
              publishedBy: null,
            },
            customDomain,
            customDomainVerified: false,
            seoTitle: null,
            seoDescription: null,
            ogImageUrl: null,
            analyticsId: null,
            homepagePath: 'visual',
            homepageUrl,
            createdAt: '2026-05-06T03:00:00.000Z',
            updatedAt: '2026-05-06T04:00:00.000Z',
            version: 2,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual/homepage/versions/draft-homepage-visual') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'draft-homepage-visual',
            versionNumber: 3,
            status: 'draft',
            contentPreview: 'ProfileCard, RichText, LinkButton',
            componentCount: 3,
            content: {
              version: '1.0',
              components: [
                {
                  id: 'profile-visual',
                  type: 'ProfileCard',
                  visible: true,
                  order: 1,
                  props: {
                    displayName: 'Visual Talent',
                    bio: 'Draft profile content for visual QA.',
                    avatarUrl: '',
                    avatarShape: 'circle',
                    nameFontSize: 'large',
                    bioMaxLines: 3,
                  },
                },
                {
                  id: 'richtext-visual',
                  type: 'RichText',
                  visible: true,
                  order: 2,
                  props: {
                    contentHtml: '<p>Visual draft announcement.</p>',
                    textAlign: 'left',
                  },
                },
                {
                  id: 'link-visual',
                  type: 'LinkButton',
                  visible: true,
                  order: 3,
                  props: {
                    label: 'Visit official store',
                    url: 'https://example.test/store',
                    style: 'primary',
                    fullWidth: false,
                  },
                },
              ],
            },
            theme: {
              preset: 'modern-minimal',
              visualStyle: 'flat',
              colors: {
                primary: '#7B9EE0',
                accent: '#E0A0C0',
                background: '#FAFBFC',
                text: '#333333',
                textSecondary: '#666666',
              },
              background: {
                type: 'gradient',
                value: 'linear-gradient(135deg, #F5F7FA 0%, #E8ECF1 100%)',
              },
              card: {
                background: '#FFFFFF',
                borderRadius: 'large',
                shadow: 'small',
              },
              typography: {
                fontFamily: 'noto-sans',
                headingWeight: 'medium',
              },
              animation: {
                enableEntrance: true,
                enableHover: true,
                intensity: 'low',
              },
              decorations: {
                type: 'none',
              },
            },
            publishedAt: null,
            publishedBy: null,
            createdAt: '2026-05-06T04:00:00.000Z',
            createdBy: {
              id: 'user-visual',
              username: 'visual.operator@example.test',
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual/homepage/versions') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'version-homepage-visual',
                versionNumber: 2,
                status: 'published',
                contentPreview: 'ProfileCard, SocialLinks, RichText',
                componentCount: 3,
                publishedAt: '2026-05-06T04:00:00.000Z',
                publishedBy: {
                  id: 'user-visual',
                  username: 'visual.operator@example.test',
                },
                createdAt: '2026-05-06T03:00:00.000Z',
                createdBy: {
                  id: 'user-visual',
                  username: 'visual.operator@example.test',
                },
              },
            ],
            meta: {
              total: 1,
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/custom-domain-bindings') {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as {
          ownerType: 'tenant' | 'subsidiary' | 'talent';
          ownerId?: string | null;
          hostname: string;
          customDomainSslMode?: string;
          isActive?: boolean;
        };
        const currentDomains = getPrivateVisualOwnedBindings(body.ownerType);
        const nextIndex = currentDomains.length + 1;
        const token = `${body.ownerType}-visual-created-token-${nextIndex}`;
        const createdDomain = buildPrivateVisualCustomDomainBinding(
          `domain-${body.ownerType}-created-${nextIndex}`,
          {
            ...body,
            customDomainVerificationToken: token,
          },
        );

        privateVisualCustomDomainMutations.push({
          method: 'POST',
          path: url.pathname,
          body,
        });
        setPrivateVisualOwnedBindings(body.ownerType, [...currentDomains, createdDomain]);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              domain: createdDomain,
              token,
              txtRecord: `tcrn-verify=${token}`,
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            domains: listPrivateVisualCustomDomainBindings(url),
          },
        }),
      });
      return;
    }

    if (
      url.pathname.startsWith('/api/v1/talents/custom-domain-bindings/')
      && url.pathname.endsWith('/verify')
      && route.request().method() === 'POST'
    ) {
      const domainId = url.pathname.split('/')[5];
      const scopes: Array<'tenant' | 'subsidiary' | 'talent'> = ['tenant', 'subsidiary', 'talent'];

      for (const scopeType of scopes) {
        const currentDomains = getPrivateVisualOwnedBindings(scopeType);
        const domainIndex = currentDomains.findIndex((domain) => domain.id === domainId);

        if (domainIndex >= 0) {
          const verifiedDomain = {
            ...currentDomains[domainIndex],
            customDomainVerified: true,
            customDomainVerificationToken: null,
          };
          const nextDomains = [...currentDomains];
          nextDomains[domainIndex] = verifiedDomain;
          setPrivateVisualOwnedBindings(scopeType, nextDomains);

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                verified: true,
                message: 'Domain binding verified successfully',
              },
            }),
          });
          return;
        }
      }

      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'RES_NOT_FOUND',
            message: 'Custom-domain binding not found',
          },
        }),
      });
      return;
    }

    if (
      url.pathname.startsWith('/api/v1/talents/custom-domain-bindings/')
      && route.request().method() === 'PATCH'
    ) {
      const domainId = url.pathname.split('/')[5];
      const body = route.request().postDataJSON() as {
        ownerType: 'tenant' | 'subsidiary' | 'talent';
        ownerId?: string | null;
        hostname: string;
        customDomainSslMode?: string;
        isActive?: boolean;
      };
      const currentDomains = getPrivateVisualOwnedBindings(body.ownerType);
      const domainIndex = currentDomains.findIndex((domain) => domain.id === domainId);

      if (domainIndex < 0) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'RES_NOT_FOUND',
              message: 'Custom-domain binding not found',
            },
          }),
        });
        return;
      }

      const currentDomain = currentDomains[domainIndex];
      const hostnameChanged = currentDomain.hostname !== body.hostname;
      const token = hostnameChanged ? `${body.ownerType}-visual-updated-token` : null;
      const updatedDomain = buildPrivateVisualCustomDomainBinding(domainId, {
        ...body,
        customDomainVerified: hostnameChanged ? false : currentDomain.customDomainVerified,
        customDomainVerificationToken: hostnameChanged
          ? token
          : currentDomain.customDomainVerificationToken,
      });
      const nextDomains = [...currentDomains];
      nextDomains[domainIndex] = updatedDomain;

      privateVisualCustomDomainMutations.push({
        method: 'PATCH',
        path: url.pathname,
        body,
      });
      setPrivateVisualOwnedBindings(body.ownerType, nextDomains);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            domain: updatedDomain,
            token,
            txtRecord: token ? `tcrn-verify=${token}` : null,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/configuration-entity/custom-domain') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'VISUAL_QA_WRONG_ENDPOINT',
            message: 'Custom-domain config entity must use the binding registry endpoint.',
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual/custom-domain') {
      if (privateVisualUseCustomDomainStorageError) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'SYS_DATABASE_ERROR',
              message:
                'PrismaClientKnownRequestError: Raw query failed. Code: 42P01. relation "public.custom_domain_talent_selection" does not exist in $queryRawUnsafe',
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            customDomain: null,
            customDomainVerified: false,
            customDomainVerificationToken: null,
            customDomainSslMode: 'auto',
            homepageCustomPath: null,
            marshmallowCustomPath: null,
            domains: [privateVisualInheritedTalentDomain],
            inheritedDomains: [privateVisualInheritedTalentDomain],
            selectedInheritedDomainIds: ['domain-tenant-visual'],
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual/publish-readiness') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'talent-visual',
            lifecycleStatus: 'published',
            targetState: 'published',
            recommendedAction: 'none',
            canEnterPublishedState: true,
            blockers: [],
            warnings: [],
            version: 5,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual/marshmallow/config') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'marshmallow-config-visual',
            talentId: 'talent-visual',
            isEnabled: true,
            title: 'Visual Mailbox',
            welcomeText: 'Leave a deterministic message.',
            placeholderText: 'Write your message...',
            thankYouText: 'Thanks for your message.',
            allowAnonymous: true,
            captchaMode: 'auto',
            turnstile: {
              siteKeyConfigured: true,
              secretKeyConfigured: false,
              ready: false,
            },
            moderationEnabled: true,
            autoApprove: false,
            profanityFilterEnabled: true,
            externalBlocklistEnabled: true,
            maxMessageLength: 500,
            minMessageLength: 1,
            rateLimitPerIp: 5,
            rateLimitWindowHours: 1,
            reactionsEnabled: true,
            allowedReactions: ['heart', 'star'],
            theme: {},
            avatarUrl: null,
            termsContentEn: null,
            termsContentZh: null,
            termsContentJa: null,
            privacyContentEn: null,
            privacyContentZh: null,
            privacyContentJa: null,
            stats: {
              totalMessages: 1,
              pendingCount: 1,
              approvedCount: 0,
              rejectedCount: 0,
              unreadCount: 1,
            },
            marshmallowUrl: 'https://example.test/m/visual-mailbox',
            createdAt: '2026-05-06T03:00:00.000Z',
            updatedAt: '2026-05-06T04:00:00.000Z',
            version: 1,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/talents/talent-visual/marshmallow/messages') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'message-visual',
                content: 'Visual moderation message',
                senderName: 'Visual Fan',
                isAnonymous: false,
                status: 'pending',
                rejectionReason: null,
                isRead: false,
                isStarred: false,
                isPinned: false,
                replyContent: null,
                repliedAt: null,
                repliedBy: null,
                reactionCounts: {},
                profanityFlags: [],
                imageUrl: null,
                imageUrls: [],
                socialLink: null,
                createdAt: '2026-05-06T04:00:00.000Z',
              },
            ],
            meta: {
              total: 1,
              stats: {
                pendingCount: 1,
                approvedCount: 0,
                rejectedCount: 0,
                unreadCount: 1,
              },
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/reports/catalog') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: privateVisualReportCatalog,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/reports/mfr/jobs') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [],
            meta: {
              total: 0,
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/reports/mfr/search') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalCount: 1,
            preview: [
              {
                nickname: 'Visual Fan',
                platformName: 'YouTube',
                membershipLevelName: 'VIP / Monthly / Gold',
                validFrom: '2026-05-01',
                validTo: null,
                statusName: 'Active',
              },
            ],
            filterSummary: {
              platforms: ['YouTube'],
              dateRange: null,
              includeExpired: false,
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/configuration-entity/social-platform') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'platform-youtube',
              code: 'youtube',
              name: 'YouTube',
              isActive: true,
            },
            ...Array.from({ length: 24 }, (_, index) => ({
              id: `platform-large-${index + 2}`,
              code: `platform-${index + 2}`,
              name: `Platform ${index + 2}`,
              isActive: true,
            })),
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/configuration-entity/customer-status') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'status-active',
              code: 'active',
              name: 'Active',
              isActive: true,
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/configuration-entity/membership-tree') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'class-vip',
              code: 'vip',
              name: 'VIP',
              isActive: true,
              types: [
                {
                  id: 'type-monthly',
                  code: 'monthly',
                  name: 'Monthly',
                  isActive: true,
                  levels: [
                    {
                      id: 'level-gold',
                      code: 'gold',
                      name: 'Gold',
                      isActive: true,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/integration/adapters') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'adapter-pii',
              ownerType: 'tenant',
              ownerId: null,
              platformId: 'platform-pii',
              platform: {
                code: 'tcrn_pii',
                displayName: 'TCRN PII Platform',
                iconUrl: null,
              },
              code: 'TCRN_PII_PLATFORM',
              nameEn: 'TCRN PII Platform',
              nameZh: null,
              nameJa: null,
              translations: {},
              adapterType: 'api_key',
              inherit: true,
              isActive: true,
              isInherited: false,
              configCount: 2,
              createdAt: '2026-05-06T03:00:00.000Z',
              updatedAt: '2026-05-06T04:00:00.000Z',
              version: 3,
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/integration/adapter-definitions') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: privateVisualAdapterDefinitions,
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/integration/adapters/adapter-pii') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'adapter-pii',
            ownerType: 'tenant',
            ownerId: null,
            platform: {
              id: 'platform-pii',
              code: 'tcrn_pii',
              displayName: 'TCRN PII Platform',
            },
            code: 'TCRN_PII_PLATFORM',
            nameEn: 'TCRN PII Platform',
            nameZh: null,
            nameJa: null,
            translations: {},
            adapterType: 'api_key',
            inherit: true,
            isActive: true,
            configs: [
              {
                id: 'config-base-url',
                configKey: 'baseUrl',
                configValue: 'https://pii.visual.example',
                isSecret: false,
              },
              {
                id: 'config-secret',
                configKey: 'apiSecret',
                configValue: '******',
                isSecret: true,
              },
            ],
            createdAt: '2026-05-06T03:00:00.000Z',
            updatedAt: '2026-05-06T04:00:00.000Z',
            createdBy: 'user-ac-visual',
            updatedBy: 'user-ac-visual',
            version: 3,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/integration/webhooks') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'webhook-customer',
              code: 'CUSTOMER_EVENTS',
              nameEn: 'Customer Events',
              nameZh: null,
              nameJa: null,
              translations: {},
              url: 'https://webhook.visual.example/customer',
              events: ['customer.created'],
              isActive: true,
              lastTriggeredAt: '2026-05-06T04:00:00.000Z',
              lastStatus: 200,
              consecutiveFailures: 0,
              createdAt: '2026-05-06T03:00:00.000Z',
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/integration/webhooks/events') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              event: 'customer.created',
              name: 'Customer created',
              description: 'A customer was created.',
              category: 'customer',
            },
            {
              event: 'customer.updated',
              name: 'Customer updated',
              description: 'A customer was updated.',
              category: 'customer',
            },
            {
              event: 'customer.deactivated',
              name: 'Customer deactivated',
              description: 'A customer was deactivated.',
              category: 'customer',
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/integration/webhook-definitions') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: privateVisualWebhookDefinitions,
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/integration/webhooks/webhook-customer') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'webhook-customer',
            code: 'CUSTOMER_EVENTS',
            nameEn: 'Customer Events',
            nameZh: null,
            nameJa: null,
            translations: {},
            url: 'https://webhook.visual.example/customer',
            events: ['customer.created'],
            isActive: true,
            lastTriggeredAt: '2026-05-06T04:00:00.000Z',
            lastStatus: 200,
            consecutiveFailures: 0,
            secret: '******',
            headers: {
              'X-Visual': 'QA',
            },
            retryPolicy: {
              maxRetries: 3,
              backoffMs: 1000,
            },
            disabledAt: null,
            createdAt: '2026-05-06T03:00:00.000Z',
            updatedAt: '2026-05-06T04:00:00.000Z',
            createdBy: 'user-ac-visual',
            updatedBy: 'user-ac-visual',
            version: 2,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/configuration-entity/consumer') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'consumer-crm',
              ownerType: 'tenant',
              ownerId: null,
              code: 'CRM_SYNC',
              name: 'CRM Sync',
              nameEn: 'CRM Sync',
              nameZh: null,
              nameJa: null,
              translations: {},
              description: 'Deterministic API client for browser QA.',
              sortOrder: 0,
              isActive: true,
              isForceUse: false,
              isSystem: false,
              isInherited: false,
              isDisabledHere: false,
              canDisable: true,
              createdAt: '2026-05-06T03:00:00.000Z',
              updatedAt: '2026-05-06T04:00:00.000Z',
              version: 2,
              consumerCategory: 'external',
              contactName: 'CRM Owner',
              contactEmail: 'crm@example.test',
              apiKeyHash: null,
              apiKeyPrefix: null,
              allowedIps: ['127.0.0.1'],
              rateLimit: 120,
              notes: 'Visual QA client',
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/email/config') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            provider: 'tencent_ses',
            tencentSes: {
              secretId: 'visual-secret-id',
              secretKey: '******',
              region: 'ap-shanghai',
              fromAddress: 'noreply@example.test',
              fromName: 'Visual Mailer',
              replyTo: 'support@example.test',
            },
            smtp: null,
            isConfigured: true,
            lastUpdated: '2026-05-06T04:00:00.000Z',
            tenantSenderOverrides: {
              'tenant-visual': {
                fromAddress: 'visual@example.test',
                fromName: 'Visual Tenant',
                replyTo: 'reply@example.test',
              },
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/tenants') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'tenant-visual',
              code: 'VISUAL',
              name: 'Visual Tenant',
              schemaName: 'tenant_visual',
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/email-templates') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              code: 'WELCOME',
              nameEn: 'Welcome',
              nameZh: null,
              nameJa: null,
              translations: {},
              subjectEn: 'Welcome',
              subjectZh: null,
              subjectJa: null,
              subjectTranslations: {},
              bodyHtmlEn: '<p>Welcome</p>',
              bodyHtmlZh: null,
              bodyHtmlJa: null,
              bodyHtmlTranslations: {},
              bodyTextEn: 'Welcome',
              bodyTextZh: null,
              bodyTextJa: null,
              bodyTextTranslations: {},
              variables: ['displayName'],
              category: 'system',
              isActive: true,
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/logs/changes') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'change-visual',
                occurredAt: '2026-05-06T04:00:00.000Z',
                operatorId: 'user-ac-visual',
                operatorName: 'Visual Operator',
                action: 'update',
                objectType: 'talent',
                objectId: 'talent-visual',
                objectName: 'Visual Talent',
                diff: {
                  displayName: {
                    old: 'Old Visual Talent',
                    new: 'Visual Talent',
                  },
                  status: {
                    old: 'draft',
                    new: 'published',
                  },
                },
                ipAddress: '203.0.113.10',
                userAgent: 'Visual QA Browser',
                requestId: 'req-change-visual',
              },
            ],
            total: 1,
            page: 1,
            pageSize: 20,
            totalPages: 1,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/logs/events') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'event-login-visual',
                occurredAt: '2026-05-06T04:05:00.000Z',
                severity: 'info',
                eventType: 'LOGIN_SUCCESS',
                scope: 'auth',
                traceId: 'trace-login-visual',
                spanId: 'span-login-visual',
                source: 'api',
                message: 'Visual operator signed in',
                payloadJson: {
                  username: 'visual.operator@example.test',
                  tenantName: 'Visual Tenant',
                  requestId: 'req-login-visual',
                  ipAddress: '203.0.113.20',
                  sessionId: 'session-visual',
                  fingerprint: 'fp-visual',
                },
                errorCode: null,
                errorStack: null,
              },
            ],
            total: 1,
            page: 1,
            pageSize: 20,
            totalPages: 1,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/system-users') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'user-visual-operator',
              username: 'visual.operator',
              email: 'visual.operator@example.com',
              displayName: 'Visual Operator',
              avatarUrl: null,
              isActive: true,
              isTotpEnabled: true,
              forceReset: false,
              lastLoginAt: '2026-05-06T04:00:00.000Z',
              createdAt: '2026-05-06T03:00:00.000Z',
            },
          ],
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/system-users/user-visual-operator') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-visual-operator',
            username: 'visual.operator',
            email: 'visual.operator@example.com',
            displayName: 'Visual Operator',
            phone: null,
            avatarUrl: null,
            preferredLanguage: 'en',
            isActive: true,
            isTotpEnabled: true,
            forceReset: false,
            lastLoginAt: '2026-05-06T04:00:00.000Z',
            createdAt: '2026-05-06T03:00:00.000Z',
            updatedAt: '2026-05-06T04:00:00.000Z',
            roleAssignments: privateVisualRoleAssignments,
            scopeAccess: [],
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/system-roles') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'role-viewer',
              code: 'VIEWER',
              nameEn: 'Viewer',
              nameZh: '只读访问者',
              nameJa: null,
              description: 'Read-only access',
              isSystem: true,
              isActive: true,
              permissionCount: 1,
              userCount: 0,
              createdAt: '2026-05-06T03:00:00.000Z',
              updatedAt: '2026-05-06T04:00:00.000Z',
            },
            {
              id: 'role-platform-admin',
              code: 'PLATFORM_ADMIN',
              nameEn: 'Platform Administrator',
              nameZh: '平台管理员',
              nameJa: null,
              description: 'AC administrator',
              isSystem: true,
              isActive: true,
              permissionCount: 1,
              userCount: 1,
              createdAt: '2026-05-06T03:00:00.000Z',
              updatedAt: '2026-05-06T04:00:00.000Z',
            },
            {
              id: 'role-talent-manager',
              code: 'TALENT_MANAGER',
              nameEn: 'Talent Manager',
              nameZh: '艺人经理',
              nameJa: null,
              description: 'Standard tenant role',
              isSystem: false,
              isActive: true,
              permissionCount: 1,
              userCount: 0,
              createdAt: '2026-05-06T03:00:00.000Z',
              updatedAt: '2026-05-06T04:00:00.000Z',
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/permissions/check' && route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            results: [
              {
                resource: 'system_user',
                action: 'admin',
                checkedAction: 'admin',
                allowed: true,
              },
            ],
          },
        }),
      });
      return;
    }

    if (
      url.pathname === '/api/v1/users/user-visual-operator/roles' &&
      route.request().method() === 'POST'
    ) {
      privateVisualRoleAssignments.push({
        id: 'assignment-viewer',
        roleId: 'role-viewer',
        roleCode: 'VIEWER',
        roleNameEn: 'Viewer',
        roleNameZh: '只读访问者',
        roleNameJa: null,
        roleIsActive: true,
        scopeType: 'tenant',
        scopeId: null,
        scopeName: 'AC Visual Tenant',
        scopePath: null,
        inherit: false,
        grantedAt: '2026-05-06T04:30:00.000Z',
        expiresAt: null,
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'assignment-viewer',
            userId: 'user-visual-operator',
            roleId: 'role-viewer',
            scopeType: 'tenant',
            scopeId: null,
            inherit: false,
            grantedAt: '2026-05-06T04:30:00.000Z',
            snapshotUpdateQueued: true,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/api/v1/delegated-admins') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('private shell browser visual QA', () => {
  test.beforeEach(async ({ page }) => {
    privateVisualRoleAssignments = [privateVisualPlatformAdminAssignment];
    privateVisualOrganizationTree = privateVisualEmptyOrganizationTree;
    privateVisualUseLongHomepageFixture = false;
    privateVisualUseCustomDomainStorageError = false;
    resetPrivateVisualCustomDomainFixtures();
    await mockPrivateRuntimeApi(page);
  });

  test('mobile hierarchy shell navigation is reachable and traps keyboard focus', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/business');
    await hideFrameworkDevTools(page);

    const openNavigationButton = page.getByRole('button', { name: 'Open workspace navigation' });
    await expect(openNavigationButton).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile private hierarchy shell');

    await tabUntilFocused(page, openNavigationButton);
    await page.keyboard.press('Enter');

    const navigationDialog = page.getByRole('dialog', { name: 'Main navigation' });
    const closeNavigationButton = page.getByRole('button', { name: 'Close workspace navigation' });
    const businessOverviewLink = navigationDialog.getByRole('link', { name: 'Business overview' });
    const organizationStructureLink = navigationDialog.getByRole('link', {
      name: 'Organization Structure',
    });

    await expect(navigationDialog).toBeVisible();
    await expect(closeNavigationButton).toBeFocused();
    await expect(businessOverviewLink).toBeVisible();
    await expect(organizationStructureLink).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile private hierarchy shell drawer');
    await expect(page).toHaveScreenshot('private-hierarchy-shell-mobile-drawer.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.keyboard.press('Tab');
    await expect(businessOverviewLink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(organizationStructureLink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeNavigationButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(navigationDialog).toBeHidden();
    await expect(openNavigationButton).toBeFocused();
  });

  for (const localeCase of privateLocaleVisualQaCases) {
    test(`private shell and dense user table keep mobile layout for ${localeCase.name} copy`, async ({
      page,
    }) => {
      await usePrivateSession(page);
      await useLocaleOverride(page, localeCase.locale);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/tenant/tenant-visual/user-management');
      await hideFrameworkDevTools(page);

      const openNavigationButton = page.getByRole('button', {
        name: localeCase.openNavigationLabel,
      });
      const userTable = page.getByRole('table', { name: localeCase.tableLabel });

      await expect(openNavigationButton).toBeVisible();
      await expect(userTable).toBeVisible();
      await expect(page.getByText('visual.operator@example.com')).toBeVisible();
      await expectNoHorizontalOverflow(page, `${localeCase.name} private shell user table`);
    });
  }

  test('AC user editor keeps role assignment usable without a page-level permission error', async ({
    page,
  }) => {
    await usePrivateSession(page, visualQaAcSession);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ac/tenant-ac-visual/user-management/user-visual-operator');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Visual Operator' })).toBeVisible();
    await expect(
      page.getByText('You do not have permission to assign roles at this scope')
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Assign role' })).toBeVisible();

    await page.getByRole('button', { name: 'Assign role' }).click();

    await expect(page.getByText('Viewer was assigned.')).toBeVisible();
    await expect(page.getByText('VIEWER', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Display name')).toBeEnabled();
    await expectNoHorizontalOverflow(page, 'AC user editor role assignment');
    await expect(page).toHaveScreenshot('private-ac-user-editor-role-assignment-desktop.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('desktop AC API Client management keeps key lifecycle behind the drawer', async ({
    page,
  }) => {
    await usePrivateSession(page, visualQaAcSession);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ac/tenant-ac-visual/api-clients');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'API Client Management' })).toBeVisible();
    await expectVisibleExactTextCount(page.locator('header'), 'Platform', 1, 'desktop AC shell Platform label');
    const apiClientTable = page.getByRole('table', { name: 'API clients' });
    await expect(apiClientTable).toBeVisible();
    await expect(apiClientTable.getByText('CRM_SYNC')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate key' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'desktop AC integration API clients first level');

    await apiClientTable
      .getByRole('row', { name: /CRM_SYNC/ })
      .getByRole('button', { name: 'Open' })
      .click();
    const apiClientDrawer = page.getByRole('dialog', { name: 'API Client Detail' });
    await expect(apiClientDrawer).toBeVisible();
    await expect(apiClientDrawer.getByRole('button', { name: 'Generate key' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop AC integration API client drawer');
    await expect(page).toHaveScreenshot('private-ac-integration-api-clients-desktop.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('desktop tenant Interface Management keeps adapter list and Add Adapter action first-level', async ({
    page,
  }) => {
    privateVisualOrganizationTree = privateVisualIntegrationOrganizationTree;
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/interface-management');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Interface Management' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tenant root/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tokyo Branch Subsidiary Tokyo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Visual Talent Talent Tokyo' })).toBeVisible();

    await page.getByRole('button', { name: /Tenant root/ }).click();
    const adaptersTable = page.getByRole('table', { name: 'Tenant Adapters' });
    await expect(adaptersTable).toBeVisible();
    await expect(adaptersTable.getByText('TCRN_PII_PLATFORM')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New adapter' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Adapter Profile' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Configuration & secrets' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'desktop tenant interface management adapter first level');
    await expect(page).toHaveScreenshot('private-tenant-interface-management-desktop.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('mobile tenant Interface Add Adapter uses a vertical AI Adapter form', async ({
    page,
  }) => {
    privateVisualOrganizationTree = privateVisualIntegrationOrganizationTree;
    await usePrivateSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/interface-management/adapters/new?ownerType=tenant');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Add Adapter' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Add adapter sections' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Adapter type' })).toHaveValue('ai-adapter');
    await expect(page.getByRole('combobox', { name: 'Provider' })).toHaveValue('OPENAI');
    await expect(page.getByLabel('Endpoint path')).toHaveValue('/v1/responses');
    await expect(page.getByLabel('Model')).toHaveValue('gpt-example');
    await expect(page.getByLabel('Token secret')).toBeVisible();
    await expect(page.getByText('Bilibili')).toHaveCount(0);
    await expect(page.getByText('YouTube')).toHaveCount(0);

    await page.getByRole('combobox', { name: 'Provider' }).selectOption('GEMINI');
    await expect(page.getByLabel('Endpoint path')).toHaveValue('/v1beta/models/{model}:generateContent');
    await expect(page.getByLabel('Model')).toHaveValue('gemini-example');
    await expectNoHorizontalOverflow(page, 'mobile tenant interface add adapter form');
    await expect(page).toHaveScreenshot('private-tenant-interface-add-adapter-mobile.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('desktop tenant Webhook Management keeps webhook list separate', async ({
    page,
  }) => {
    privateVisualOrganizationTree = privateVisualIntegrationOrganizationTree;
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/webhook-management');
    await hideFrameworkDevTools(page);

    await page.getByRole('button', { name: /Tenant root/ }).click();
    await expect(page.getByRole('heading', { name: 'Webhook Management' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Webhook Endpoints' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Webhooks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New webhook' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Tenant Adapters' })).toHaveCount(0);
    await expect(page.getByRole('table', { name: 'API clients' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'desktop tenant webhook management list');
    await expect(page).toHaveScreenshot('private-tenant-webhook-management-desktop.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('desktop observability keeps change-log filters attached to the table workbench', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/observability');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Observability' })).toBeVisible();
    await expectVisibleExactTextCount(page.locator('header'), 'Tenant', 1, 'desktop tenant shell label');
    await expect(page.getByRole('table', { name: 'Change Logs' })).toBeVisible();
    await expect(
      page.getByText(/displayName: Old Visual Talent -> Visual Talent/).first()
    ).toBeVisible();
    await expect(page.getByText('new, old')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View details' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop observability change logs workbench');
    await expect(page).toHaveScreenshot('private-observability-change-logs-desktop.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await usePrivateSession(page, visualQaAcSession);
    await page.goto('/ac/tenant-ac-visual/observability?tab=tech-events');
    await hideFrameworkDevTools(page);
    await expect(page.getByRole('heading', { name: 'Observability' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Tech Events' })).toBeVisible();
    await expect(page.getByText('Actor: visual.operator@example.test')).toBeVisible();
    await expect(page.getByText('Request: req-login-visual')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'AC observability tech events shared workbench');
  });

  test('mobile observability technical event detail shows actor request and network context', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/observability?tab=tech-events');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Observability' })).toBeVisible();
    await expect(page.getByText('LOGIN_SUCCESS')).toBeVisible();
    await expect(page.getByText('Actor: visual.operator@example.test')).toBeVisible();
    await expect(
      page.getByText('IP 203.0.113.20 / Session session-visual / Fingerprint fp-visual')
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile observability tech events workbench');

    await page.getByRole('button', { name: 'View details' }).click();
    const techDetailDrawer = page.getByRole('dialog', { name: 'Technical Event Detail' });
    await expect(techDetailDrawer).toBeVisible();
    await expect(
      techDetailDrawer.getByText('req-login-visual', { exact: true }).first()
    ).toBeVisible();
    await expect(techDetailDrawer.getByText('span-login-visual', { exact: true })).toBeVisible();
    await expect(techDetailDrawer.getByText('fp-visual', { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile observability tech event detail drawer');
    await expect(page).toHaveScreenshot('private-observability-tech-event-detail-mobile.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('mobile profile security gates mutating forms behind action drawers', async ({ page }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/profile/security');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Account Security' })).toBeVisible();
    await expect(page.getByText('Active Sessions')).toBeVisible();
    await expect(page.getByLabel('Current password')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'mobile profile security gated first level');

    await page.getByRole('button', { name: 'Open password change' }).click();
    const passwordDrawer = page.getByRole('dialog', { name: 'Password' });
    await expect(passwordDrawer).toBeVisible();
    await expect(passwordDrawer.getByLabel('Current password')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile profile security password drawer');
  });

  test('mobile marshmallow management keeps configuration behind a drawer', async ({ page }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/talent/talent-visual/marshmallow');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Marshmallow Management' })).toBeVisible();
    await expect(page.getByText('Visual moderation message')).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'mobile marshmallow gated first level');
    await expect(page).toHaveScreenshot('private-marshmallow-mobile-first-level.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.getByRole('tab', { name: 'Configuration' }).click();
    await expect(page.getByText('Turnstile', { exact: true })).toBeVisible();
    await expect(page.getByText('Submission unavailable')).toBeVisible();
    await expect(
      page.getByText('Captcha mode may require Turnstile, but runtime configuration is incomplete. Public submission is disabled until the missing key is configured.')
    ).toBeVisible();

    await page
      .locator('#marshmallow-panel-configuration')
      .getByRole('button', { name: 'Configure mailbox' })
      .click();
    const configDrawer = page.getByRole('dialog', { name: 'Configuration' });
    await expect(configDrawer).toBeVisible();
    await expect(configDrawer.getByLabel('Title')).toHaveValue('Visual Mailbox');
    await expect(configDrawer.getByText('Turnstile runtime status')).toBeVisible();
    await expect(configDrawer.getByText('Site key')).toBeVisible();
    await expect(configDrawer.getByText('Secret key')).toBeVisible();
    await expect(configDrawer.getByText('Missing', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile marshmallow config drawer');
    await expect(page).toHaveScreenshot('private-marshmallow-mobile-config-drawer.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('homepage management keeps long public URLs inside summary cards', async ({ page }) => {
    privateVisualUseLongHomepageFixture = true;
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/talent/talent-visual/homepage');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Homepage management' })).toBeVisible();
    await expect(page.getByText(privateVisualLongHomepageUrl, { exact: true })).toBeVisible();
    await expect(page.getByText(privateVisualLongCustomDomain, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy value: Homepage URL' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy value: Custom domain' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop homepage management long URL summary');
    await expect(page).toHaveScreenshot('private-homepage-management-desktop-long-url.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/talent/talent-visual/homepage');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Homepage management' })).toBeVisible();
    await expect(page.getByText(privateVisualLongHomepageUrl, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy value: Homepage URL' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile homepage management long URL summary');
    await expect(page).toHaveScreenshot('private-homepage-management-mobile-long-url.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('desktop homepage editor separates visual source editing from modal preview', async ({ page }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/talent/talent-visual/homepage/editor');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Homepage editor' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Visual' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Draft preview')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Preview', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open live preview' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop homepage editor visual mode');

    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const previewDrawer = page.getByRole('dialog', { name: 'Homepage preview' });
    await expect(previewDrawer).toBeVisible();
    await expect(previewDrawer.getByText('Preview viewport')).toBeVisible();
    await expect(previewDrawer.locator('h1').filter({ hasText: 'Visual Talent' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop homepage editor modal preview');
    await expect(page).toHaveScreenshot('private-homepage-editor-desktop-preview-drawer.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await previewDrawer.getByRole('button', { name: 'Cancel' }).click();
    await expect(previewDrawer).toBeHidden();

    await page.getByRole('button', { name: 'Advanced source' }).click();
    await expect(page.getByRole('button', { name: 'Advanced source' })).toHaveAttribute('aria-pressed', 'true');
    const sourceEditor = page.getByLabel('Homepage source');
    await expect(sourceEditor).toBeVisible();
    const currentSource = await sourceEditor.inputValue();
    await sourceEditor.fill(currentSource.replace('Visual Talent', 'Source Mode Talent'));
    await expect(page.getByText('Source must contain')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'desktop homepage editor source mode');
    await expect(page).toHaveScreenshot('private-homepage-editor-desktop-source-mode.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(previewDrawer).toBeVisible();
    await expect(previewDrawer.locator('h1').filter({ hasText: 'Source Mode Talent' })).toBeVisible();
  });

  test('homepage editor live preview updates in a second page on mobile', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/talent/talent-visual/homepage/editor');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Homepage editor' })).toBeVisible();
    await page.getByRole('button', { name: 'Advanced source' }).click();
    await expect(page.getByLabel('Homepage source')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile homepage editor source mode');
    await expect(page).toHaveScreenshot('private-homepage-editor-mobile-source-mode.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await expect(page.getByRole('button', { name: 'Visual' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Restore low-code snapshot' })).toBeVisible();
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Open live preview' }).click();
    const previewPage = await popupPromise;
    await previewPage.setViewportSize({ width: 390, height: 844 });
    await hideFrameworkDevTools(previewPage);
    await expect(previewPage.getByRole('heading', { name: 'Live homepage preview' })).toBeVisible();
    await expect(previewPage.locator('h1').filter({ hasText: 'Visual Talent' })).toBeVisible();
    await expectNoHorizontalOverflow(previewPage, 'mobile homepage editor live preview page');

    const sourceEditor = page.getByLabel('Homepage source');
    const currentSource = await sourceEditor.inputValue();
    await sourceEditor.fill(currentSource.replace('Visual Talent', 'Live Synced Talent'));
    await expect(previewPage.locator('h1').filter({ hasText: 'Live Synced Talent' })).toBeVisible();
    await expect(previewPage).toHaveScreenshot('private-homepage-editor-mobile-live-preview.png', {
      animations: 'disabled',
      fullPage: true,
    });
    await previewPage.close();
  });

  test('desktop tenant settings keeps defaults summary-first and drawer-scoped', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/settings');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Tenant Settings' })).toBeVisible();
    await expectVisibleExactTextCount(page.locator('header'), 'Tenant', 1, 'desktop tenant settings shell label');
    await expect(page.getByRole('link', { name: 'Settings guide' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(
      page.getByText('Review tenant defaults before opening the edit workflow.')
    ).toBeVisible();
    await expect(page.getByText('Date format', { exact: true })).toBeVisible();
    await expect(page.getByText('Currency', { exact: true })).toBeVisible();
    await expect(page.getByText('Customer import', { exact: true })).toBeVisible();
    await expect(page.getByText('Password policy', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Default language')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save tenant defaults' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit defaults' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop tenant settings summary first level');
    await expect(page).toHaveScreenshot('private-tenant-settings-desktop-summary.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Edit defaults' }).click();
    const defaultsDrawer = page.getByRole('dialog', { name: 'Edit tenant defaults' });
    await expect(defaultsDrawer).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Default language')).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Default timezone')).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Date format')).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Currency')).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Enable customer import')).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Minimum password length')).toBeVisible();
    await expect(defaultsDrawer.getByRole('button', { name: 'Save tenant defaults' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop tenant settings defaults drawer');
    await expect(page).toHaveScreenshot('private-tenant-settings-desktop-drawer.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('desktop tenant settings shows turnstile captcha workbench', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/settings?section=settings');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Tenant Settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Details' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configuration Entity Management' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'System Dictionary' })).toBeVisible();
    await expect(page.getByLabel('Cloudflare Turnstile Site Key')).toHaveCount(0);

    await page.getByRole('button', { name: 'CAPTCHA' }).click();

    await expect(page.getByText('Readiness', { exact: true })).toBeVisible();
    await expect(page.getByText('Ready', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Tenant keys', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Cloudflare Turnstile Site Key')).toBeVisible();
    await expect(page.getByLabel('Cloudflare Turnstile Secret Key')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keep secret' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Replace secret' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear secret' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Turnstile settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit defaults' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'desktop tenant settings turnstile captcha workbench');
    await expect(page).toHaveScreenshot('private-tenant-settings-turnstile-desktop.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('desktop subsidiary settings keeps defaults summary-first and drawer-scoped', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/subsidiary/subsidiary-visual/settings');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: /Tokyo Branch.*Subsidiary Settings/ })).toBeVisible();
    await expectVisibleExactTextCount(page.locator('header'), 'Tenant', 1, 'desktop subsidiary settings shell label');
    await expect(page.getByRole('link', { name: 'Settings guide' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(
      page.getByText('Review subsidiary defaults before opening the edit workflow.')
    ).toBeVisible();
    await expect(page.getByText('Date format', { exact: true })).toBeVisible();
    await expect(page.getByText('Currency', { exact: true })).toBeVisible();
    await expect(page.getByText('Customer import', { exact: true })).toBeVisible();
    await expect(page.getByText('Password policy', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Default language')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save subsidiary settings' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit defaults' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop subsidiary settings summary first level');
    await expect(page).toHaveScreenshot('private-subsidiary-settings-desktop-summary.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Edit defaults' }).click();
    const defaultsDrawer = page.getByRole('dialog', { name: 'Edit subsidiary defaults' });
    await expect(defaultsDrawer).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Default language')).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Default timezone')).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Date format')).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Currency')).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Enable customer import')).toBeVisible();
    await expect(defaultsDrawer.getByLabel('Minimum password length')).toBeVisible();
    await expect(defaultsDrawer.getByRole('button', { name: 'Save subsidiary settings' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop subsidiary settings defaults drawer');
    await expect(page).toHaveScreenshot('private-subsidiary-settings-desktop-drawer.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('mobile talent settings keeps route configuration out of the first level', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/talent/talent-visual/settings?section=settings');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: /Visual Talent.*Talent Settings/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings guide' })).toHaveCount(0);
    await expect(page.getByText('Date format', { exact: true })).toBeVisible();
    await expect(page.getByText('Currency', { exact: true })).toBeVisible();
    await expect(page.getByText('Customer import', { exact: true })).toBeVisible();
    await expect(page.getByText('Password policy', { exact: true })).toBeVisible();
    await expect(page.getByText('Public Marshmallow Route')).toBeVisible();
    await expect(page.getByText('Inherited CAPTCHA')).toBeVisible();
    await expect(page.getByText('Unavailable', { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel('Enable public marshmallow route')).toHaveCount(0);
    await expect(page.getByLabel('Custom domain')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Configure routes' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile talent settings summary first level');
    await expect(page).toHaveScreenshot('private-talent-settings-mobile-summary.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.goto('/tenant/tenant-visual/talent/talent-visual/settings?section=settings&focus=marshmallow-routing');
    await hideFrameworkDevTools(page);
    const settingsDrawer = page.getByRole('dialog', { name: 'Configure talent settings' });
    await expect(settingsDrawer).toBeVisible();
    await expect(settingsDrawer.getByLabel('Date format')).toBeVisible();
    await expect(settingsDrawer.getByLabel('Currency')).toBeVisible();
    await expect(settingsDrawer.getByLabel('Enable customer import')).toBeVisible();
    await expect(settingsDrawer.getByLabel('Minimum password length')).toBeVisible();
    await expect(settingsDrawer.getByLabel('Enable public marshmallow route')).toBeVisible();
    await expect(settingsDrawer.getByLabel('Custom domain')).toBeVisible();
    await expect(settingsDrawer.getByText('Inherited CAPTCHA readiness')).toBeVisible();
    await expect(settingsDrawer.getByText('Unavailable', { exact: true }).first()).toBeVisible();
    await expect(settingsDrawer.getByText('visual.example.test', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile talent settings route drawer');
    await expect(page).toHaveScreenshot('private-talent-settings-mobile-drawer.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('mobile talent settings hides raw custom-domain storage errors', async ({
    page,
  }) => {
    privateVisualUseCustomDomainStorageError = true;

    await usePrivateSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/talent/talent-visual/settings?section=settings&focus=homepage-routing');
    await hideFrameworkDevTools(page);

    const settingsDrawer = page.getByRole('dialog', { name: 'Configure talent settings' });
    await expect(settingsDrawer).toBeVisible();
    await expect(
      settingsDrawer.getByText(
        'Custom-domain routing is temporarily unavailable. Ask an administrator to verify the custom-domain database migration.',
      ),
    ).toBeVisible();
    await expect(page.getByText(/PrismaClientKnownRequestError/i)).toHaveCount(0);
    await expect(page.getByText(/public\.custom_domain_talent_selection/i)).toHaveCount(0);
    await expect(page.getByText(/\$queryRawUnsafe/i)).toHaveCount(0);
    await expect(page.getByText(/relation "public/i)).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'mobile talent settings custom-domain storage error');

    privateVisualUseCustomDomainStorageError = false;
  });

  test('desktop tenant settings manages custom domains through scoped config entity records', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/settings?configEntityType=custom-domain');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Tenant Settings' })).toBeVisible();
    await page.getByRole('button', { name: 'Configuration Entity Management' }).click();
    await expect(page).toHaveURL(/section=config-entities/);
    await expect(page).toHaveURL(/configEntityType=custom-domain/);
    await expect(page.getByRole('heading', { name: 'Custom-domain records' })).toBeVisible();
    const domainTable = page.getByRole('table', { name: 'Custom-domain records' });
    await expect(domainTable).toBeVisible();
    const tenantRow = domainTable.getByRole('row', { name: /tenant\.example\.test/ });
    await expect(tenantRow).toBeVisible();
    await expect(tenantRow.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(tenantRow.getByRole('button', { name: 'Verify' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New custom domain' })).toBeVisible();
    await expect(page.getByText('VISUAL_QA_WRONG_ENDPOINT')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'desktop tenant settings custom-domain config entity');
    await expect(page).toHaveScreenshot('private-tenant-settings-custom-domain-desktop.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('desktop tenant settings proves create, edit, and verify custom-domain routing records', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/settings?configEntityType=custom-domain');
    await hideFrameworkDevTools(page);

    await page.getByRole('button', { name: 'Configuration Entity Management' }).click();
    await expect(page.getByRole('heading', { name: 'Custom-domain records' })).toBeVisible();

    await page.getByRole('button', { name: 'New custom domain' }).click();
    const createDrawer = page.getByRole('dialog', { name: 'Create custom domain' });
    await expect(createDrawer).toBeVisible();
    await createDrawer.getByLabel('Custom-domain hostname').fill('Brand-New.Example.Test.');
    await createDrawer.getByLabel('Custom-domain SSL mode').selectOption('cloudflare');
    await createDrawer.getByRole('button', { name: 'Save custom domain' }).click();

    await expect(
      page.getByText('Custom domain saved. Add TXT record: tcrn-verify=tenant-visual-created-token-2'),
    ).toBeVisible();
    expect(privateVisualCustomDomainMutations).toContainEqual({
      method: 'POST',
      path: '/api/v1/talents/custom-domain-bindings',
      body: {
        ownerType: 'tenant',
        ownerId: null,
        hostname: 'brand-new.example.test',
        customDomainSslMode: 'cloudflare',
        isActive: true,
      },
    });

    const createdRow = page.getByRole('row', { name: /brand-new\.example\.test/i });
    await expect(createdRow).toBeVisible();
    await expect(createdRow.getByText('Unverified')).toBeVisible();
    await expect(createdRow.getByText('cloudflare')).toBeVisible();

    await createdRow.getByRole('button', { name: 'Edit' }).click();
    const editDrawer = page.getByRole('dialog', { name: 'Edit custom domain' });
    await expect(editDrawer).toBeVisible();
    await editDrawer.getByLabel('Custom-domain hostname').fill('Brand-Updated.Example.Test.');
    await editDrawer.getByLabel('Custom-domain SSL mode').selectOption('self_hosted');
    await editDrawer.getByLabel('Custom domain is active').uncheck();
    await editDrawer.getByRole('button', { name: 'Save custom domain' }).click();

    await expect(
      page.getByText('Custom domain saved. Add TXT record: tcrn-verify=tenant-visual-updated-token'),
    ).toBeVisible();
    expect(privateVisualCustomDomainMutations).toContainEqual({
      method: 'PATCH',
      path: '/api/v1/talents/custom-domain-bindings/domain-tenant-created-2',
      body: {
        ownerType: 'tenant',
        ownerId: null,
        hostname: 'brand-updated.example.test',
        customDomainSslMode: 'self_hosted',
        isActive: false,
      },
    });

    const updatedRow = page.getByRole('row', { name: /brand-updated\.example\.test/i });
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow.getByText('Unverified')).toBeVisible();
    await expect(updatedRow.getByText('Inactive')).toBeVisible();
    await expect(updatedRow.getByText('self_hosted')).toBeVisible();

    await updatedRow.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByText('Domain binding verified successfully')).toBeVisible();
    await expect(updatedRow.getByText('Verified')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop tenant custom-domain create edit verify');
  });

  test('desktop subsidiary settings reviews inherited custom domains and manages owned rows', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(
      '/tenant/tenant-visual/subsidiary/subsidiary-visual/settings?configEntityType=custom-domain',
    );
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: /Tokyo Branch.*Subsidiary Settings/ })).toBeVisible();
    await page.getByRole('button', { name: 'Configuration Entity Management' }).click();
    await expect(page).toHaveURL(/section=config-entities/);
    await expect(page).toHaveURL(/configEntityType=custom-domain/);
    await expect(page.getByRole('heading', { name: 'Custom-domain records' })).toBeVisible();
    await expect(page.getByText('Inherited', { exact: true }).first()).toBeVisible();
    const domainTable = page.getByRole('table', { name: 'Custom-domain records' });
    const inheritedTenantRow = domainTable.getByRole('row', { name: /tenant\.example\.test/ });
    const ownedSubsidiaryRow = domainTable.getByRole('row', { name: /tokyo\.example\.test/ });
    await expect(inheritedTenantRow).toBeVisible();
    await expect(inheritedTenantRow.getByText('Review only')).toBeVisible();
    await expect(inheritedTenantRow.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(ownedSubsidiaryRow).toBeVisible();
    await expect(ownedSubsidiaryRow.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByText('VISUAL_QA_WRONG_ENDPOINT')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'desktop subsidiary settings custom-domain config entity');
    await expect(page).toHaveScreenshot('private-subsidiary-settings-custom-domain-desktop.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('mobile talent settings custom-domain config entity shows inherited and owned routing records', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      '/tenant/tenant-visual/talent/talent-visual/settings?configEntityType=custom-domain',
    );
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: /Visual Talent.*Talent Settings/ })).toBeVisible();
    await page.getByRole('button', { name: 'Configuration Entity Management' }).click();
    await expect(page).toHaveURL(/section=config-entities/);
    await expect(page).toHaveURL(/configEntityType=custom-domain/);
    await expect(page.getByRole('heading', { name: 'Custom-domain records' })).toBeVisible();
    const domainTable = page.getByRole('table', { name: 'Custom-domain records' });
    const inheritedTenantRow = domainTable.getByRole('row', { name: /tenant\.example\.test/ });
    const inheritedSubsidiaryRow = domainTable.getByRole('row', { name: /tokyo\.example\.test/ });
    const ownedTalentRow = domainTable.getByRole('row', { name: /visual-talent\.example\.test/ });
    await expect(inheritedTenantRow.getByText('Review only')).toBeVisible();
    await expect(inheritedSubsidiaryRow.getByText('Review only')).toBeVisible();
    await expect(ownedTalentRow.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(ownedTalentRow.getByRole('button', { name: 'Verify' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New custom domain' })).toBeVisible();
    await expect(page.getByText('VISUAL_QA_WRONG_ENDPOINT')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'mobile talent settings custom-domain config entity');
    await expect(page).toHaveScreenshot('private-talent-settings-custom-domain-mobile.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('desktop organization structure keeps talents as inventory leaves, not expandable tree rows', async ({
    page,
  }) => {
    privateVisualOrganizationTree = privateVisualIntegrationOrganizationTree;
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/organization-structure');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Visual Tenant' })).toBeVisible();
    await expectVisibleExactTextCount(page.locator('header'), 'Tenant', 1, 'desktop organization shell label');
    await expect(page.getByRole('button', { name: /Visual Tenant/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tokyo Branch/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Visual Talent.*Talent/ })).toHaveCount(0);
    await expect(page.getByText('Visual Talent').first()).toBeVisible();
    await expect(page.getByText('/tokyo/visual')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop organization structure branch and leaf review');
    await expect(page).toHaveScreenshot('private-organization-structure-desktop-leaf-review.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('desktop reports draft drawer loads config-backed filters without stale membership-tree errors', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/talent/talent-visual/reports');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Reports Management' })).toBeVisible();
    await expect(page.locator('header').getByText('Visual Talent', { exact: true })).toBeVisible();
    await expectVisibleExactTextCount(page.locator('header'), 'Visual Talent', 1, 'desktop talent breadcrumb name');
    await expectVisibleExactTextCount(page.locator('header'), 'Talent Scope', 0, 'desktop talent scope chip');
    await expect(page.getByRole('heading', { name: 'Member Feedback Report' })).toBeVisible();
    await expect(page.getByText('Catalog filters')).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Platforms' })).toHaveCount(0);
    await expect(page.getByText('No preview requested yet')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'desktop reports directory');
    await expect(page).toHaveScreenshot('private-reports-desktop-directory.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Draft report' }).first().click();
    const draftDrawer = page.getByRole('dialog', { name: 'Create MFR job' });
    await expect(draftDrawer).toBeVisible();
    await expect(draftDrawer.getByRole('button', { name: 'Select Platforms' })).toBeVisible();
    await expect(draftDrawer.getByRole('checkbox', { name: /YouTube/i })).toHaveCount(0);
    await expect(draftDrawer.getByText('VIP / Monthly / Gold')).toHaveCount(0);
    await expect(draftDrawer.getByText("Entity type 'membership-tree' not found")).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'desktop reports draft drawer');

    await draftDrawer.getByRole('button', { name: 'Select Platforms' }).click();
    const optionPicker = page.getByRole('dialog', { name: 'Select Platforms' });
    await expect(optionPicker).toBeVisible();
    await expect(optionPicker.getByText('Page 1 of 2')).toBeVisible();
    await expect(optionPicker.getByRole('checkbox', { name: /YouTube/i })).toBeVisible();
    await expect(optionPicker.getByRole('checkbox', { name: /Platform 25/i })).toHaveCount(0);
    await optionPicker.getByRole('button', { name: 'Next' }).click();
    await expect(optionPicker.getByRole('checkbox', { name: /Platform 25/i })).toBeVisible();
    await optionPicker.getByRole('searchbox', { name: 'Search Platforms' }).fill('YouTube');
    await expect(optionPicker.getByRole('checkbox', { name: /YouTube/i })).toBeVisible();
    await expect(optionPicker.getByRole('checkbox', { name: /Platform 25/i })).toHaveCount(0);
    await optionPicker.getByRole('checkbox', { name: /YouTube/i }).check();
    await expectNoHorizontalOverflow(page, 'desktop reports option picker');
    await expect(page).toHaveScreenshot('private-reports-desktop-option-picker.png', {
      animations: 'disabled',
      fullPage: true,
    });
    await optionPicker.getByRole('button', { name: 'Done' }).click();
    await expect(draftDrawer.getByText('YouTube', { exact: true })).toBeVisible();

    await draftDrawer.getByRole('button', { name: 'Preview rows' }).click();
    await expect(page.getByText('Visual Fan')).toBeVisible();
    await draftDrawer.locator('.overflow-y-auto').evaluate((node) => node.scrollTo(0, 0));
    await expect(page).toHaveScreenshot('private-reports-desktop-draft-drawer.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('mobile reports keeps filters inside the draft workflow', async ({
    page,
  }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 390, height: 820 });
    await page.goto('/tenant/tenant-visual/talent/talent-visual/reports');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Reports Management' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Member Feedback Report' })).toBeVisible();
    await expect(page.getByText('Catalog filters')).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Platforms' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'mobile reports directory');
    await expect(page).toHaveScreenshot('private-reports-mobile-directory.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Draft report' }).first().click();
    const draftDrawer = page.getByRole('dialog', { name: 'Create MFR job' });
    await expect(draftDrawer).toBeVisible();
    await expect(draftDrawer.getByText('Catalog filters')).toBeVisible();
    await expect(draftDrawer.getByRole('group', { name: 'Platforms' })).toBeVisible();
    await expect(draftDrawer.getByRole('button', { name: 'Select Platforms' })).toBeVisible();
    await expect(draftDrawer.getByRole('checkbox', { name: /YouTube/i })).toHaveCount(0);
    await expect(draftDrawer.getByText('No preview requested yet')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile reports draft drawer');
    await expect(page).toHaveScreenshot('private-reports-mobile-draft-drawer.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await draftDrawer.getByRole('button', { name: 'Select Platforms' }).click();
    const optionPicker = page.getByRole('dialog', { name: 'Select Platforms' });
    await expect(optionPicker).toBeVisible();
    await expect(optionPicker.getByText('Page 1 of 2')).toBeVisible();
    await expect(optionPicker.getByRole('checkbox', { name: /YouTube/i })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile reports option picker');
    await expect(page).toHaveScreenshot('private-reports-mobile-option-picker.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });
});
