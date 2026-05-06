import { expect, test, type Locator, type Page } from '@playwright/test';

const sessionStorageKey = 'tcrn.web.session';
const localeOverrideStorageKey = 'tcrn.web.locale.override';

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

let privateVisualRoleAssignments: Array<Record<string, unknown>> = [privateVisualPlatformAdminAssignment];

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
  await page.route('**/api/v1/**', async (route) => {
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
          data: {
            id: 'talent-visual',
            code: 'VISUAL_TALENT',
            displayName: 'Visual Talent',
            lifecycleStatus: 'published',
            isActive: true,
            profileStore: null,
            stats: {
              customerCount: 0,
              homepageVersionCount: 0,
              marshmallowMessageCount: 1,
            },
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
          ],
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

    if (url.pathname === '/api/v1/users/user-visual-operator/roles' && route.request().method() === 'POST') {
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
    await expect(page.getByText('You do not have permission to assign roles at this scope')).toHaveCount(0);
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

  test('desktop AC integration keeps API key lifecycle behind the API client drawer', async ({
    page,
  }) => {
    await usePrivateSession(page, visualQaAcSession);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ac/tenant-ac-visual/integration-management?tab=api-keys');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Integration Management' })).toBeVisible();
    const apiClientTable = page.getByRole('table', { name: 'API clients' });
    await expect(apiClientTable).toBeVisible();
    await expect(apiClientTable.getByText('CRM_SYNC')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate key' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'desktop AC integration API clients first level');

    await apiClientTable.getByRole('row', { name: /CRM_SYNC/ }).getByRole('button', { name: 'Open' }).click();
    const apiClientDrawer = page.getByRole('dialog', { name: 'API Client Detail' });
    await expect(apiClientDrawer).toBeVisible();
    await expect(apiClientDrawer.getByRole('button', { name: 'Generate key' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop AC integration API client drawer');
    await expect(page).toHaveScreenshot('private-ac-integration-api-clients-desktop.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('mobile tenant integration keeps scope tree and adapter configuration drawer gated', async ({
    page,
  }) => {
    privateVisualOrganizationTree = privateVisualIntegrationOrganizationTree;
    await usePrivateSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant/tenant-visual/integration-management');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Integration Management' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tenant root/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tokyo Branch Subsidiary Tokyo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Visual Talent Talent Tokyo' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile tenant integration scope tree');
    await expect(page).toHaveScreenshot('private-tenant-integration-mobile-scope-tree.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.getByRole('button', { name: /Tenant root/ }).click();
    const adaptersTable = page.getByRole('table', { name: 'Tenant Adapters' });
    await expect(adaptersTable).toBeVisible();
    await expect(adaptersTable.getByText('TCRN_PII_PLATFORM')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Adapter Profile' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Configuration & secrets' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'mobile tenant integration adapter first level');

    await adaptersTable.getByRole('row', { name: /TCRN_PII_PLATFORM/ }).getByRole('button', { name: 'Configure' }).click();
    const adapterDrawer = page.getByRole('dialog', { name: 'Configure Adapter' });
    await expect(adapterDrawer).toBeVisible();
    await expect(adapterDrawer.getByRole('tab', { name: 'Secrets' })).toHaveAttribute('aria-selected', 'true');
    await expect(adapterDrawer.getByRole('heading', { name: 'Configuration & secrets' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile tenant integration adapter drawer');
    await expect(page).toHaveScreenshot('private-tenant-integration-mobile-adapter-drawer.png', {
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

    await page.getByRole('button', { name: 'Configure mailbox' }).click();
    const configDrawer = page.getByRole('dialog', { name: 'Configuration' });
    await expect(configDrawer).toBeVisible();
    await expect(configDrawer.getByLabel('Title')).toHaveValue('Visual Mailbox');
    await expectNoHorizontalOverflow(page, 'mobile marshmallow config drawer');
    await expect(page).toHaveScreenshot('private-marshmallow-mobile-config-drawer.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('desktop reports draft drawer loads config-backed filters without stale membership-tree errors', async ({ page }) => {
    await usePrivateSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tenant/tenant-visual/talent/talent-visual/reports');
    await hideFrameworkDevTools(page);

    await expect(page.getByRole('heading', { name: 'Reports Management' })).toBeVisible();
    await expect(page.getByText('Member Feedback Report')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'desktop reports directory');
    await expect(page).toHaveScreenshot('private-reports-desktop-directory.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Draft report' }).first().click();
    const draftDrawer = page.getByRole('dialog', { name: 'Create MFR job' });
    await expect(draftDrawer).toBeVisible();
    await expect(draftDrawer.getByText('YouTube', { exact: true }).first()).toBeVisible();
    await expect(draftDrawer.getByText('VIP / Monthly / Gold')).toBeVisible();
    await expect(draftDrawer.getByText("Entity type 'membership-tree' not found")).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'desktop reports draft drawer');

    await draftDrawer.getByRole('button', { name: 'Preview rows' }).click();
    await expect(page.getByText('Visual Fan')).toBeVisible();
    await expect(page).toHaveScreenshot('private-reports-desktop-draft-drawer.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });
});
