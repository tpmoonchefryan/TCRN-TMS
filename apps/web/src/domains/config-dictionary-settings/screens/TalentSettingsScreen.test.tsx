import type { SupportedUiLocale } from '@tcrn/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TalentCustomDomainConfigResponse } from '@/domains/config-dictionary-settings/api/public-domain-settings.api';
import type {
  ConfigEntityRecord,
  TalentDetailResponse,
  TalentPublishReadinessResponse,
} from '@/domains/config-dictionary-settings/api/settings.api';
import { TalentSettingsScreen } from '@/domains/config-dictionary-settings/screens/TalentSettingsScreen';
import type { HomepageResponse } from '@/domains/homepage-management/api/homepage.api';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';

const mockRequest = vi.fn();
const replace = vi.fn();
let pathname = '/tenant/tenant-1/talent/talent-1/settings';
let currentSearch = '';
const localeState = {
  currentLocale: 'en' as RuntimeLocale,
  selectedLocale: undefined as SupportedUiLocale | undefined,
};

const dictionaryItemsResponse = [
  {
    id: 'dictionary-item-1',
    dictionaryCode: 'CUSTOMER_STATUS',
    code: 'ACTIVE',
    nameEn: 'Active customer',
    nameZh: '活跃客户',
    nameJa: null,
    name: 'Active customer',
    descriptionEn: 'Currently active',
    descriptionZh: null,
    descriptionJa: null,
    sortOrder: 0,
    isActive: true,
    extraData: null,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:10:00.000Z',
    version: 1,
  },
];

HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
  this.removeAttribute('open');
});

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    requestEnvelope: mockRequest,
    session: {
      tenantName: 'Test Tenant',
      tenantTier: 'tenant',
      tenantCode: 'TENANT_TEST',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe('TalentSettingsScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    replace.mockReset();
    localeState.currentLocale = 'en';
    localeState.selectedLocale = undefined;
    pathname = '/tenant/tenant-1/talent/talent-1/settings';
    currentSearch = '';
    replace.mockImplementation((href: string) => {
      const resolved = new URL(href, 'https://tcrn.local');
      pathname = resolved.pathname;
      currentSearch = resolved.search.startsWith('?') ? resolved.search.slice(1) : resolved.search;
    });
  });

  it('passes a localized settings section navigation label to the shared settings layout', async () => {
    localeState.currentLocale = 'ja';

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1' && !init) {
        return {
          id: 'talent-1',
          subsidiaryId: 'subsidiary-1',
          profileStoreId: 'store-1',
          profileStore: {
            id: 'store-1',
            code: 'DEFAULT_STORE',
            nameEn: 'Default Store',
            nameZh: '默认档案库',
            nameJa: '既定プロフィールストア',
            translations: {
              en: 'Default Store',
              zh_HANS: '默认档案库',
              ja: '既定プロフィールストア',
            },
            isDefault: true,
            piiProxyUrl: 'https://pii.internal.test',
          },
          code: 'SORA',
          path: '/TOKYO/SORA/',
          nameEn: 'Tokino Sora',
          nameZh: '时乃空',
          nameJa: 'ときのそら',
          name: 'Sora',
          displayName: 'Sora',
          descriptionEn: null,
          descriptionZh: null,
          descriptionJa: null,
          avatarUrl: null,
          homepagePath: 'sora',
          timezone: 'Asia/Tokyo',
          lifecycleStatus: 'draft',
          publishedAt: null,
          publishedBy: null,
          isActive: false,
          settings: {
            defaultLanguage: 'ja',
            timezone: 'Asia/Tokyo',
            allowCustomHomepage: true,
          },
          stats: {
            customerCount: 12,
            homepageVersionCount: 2,
            marshmallowMessageCount: 9,
          },
          externalPagesDomain: {
            homepage: { isPublished: false },
            marshmallow: { isEnabled: true },
          },
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 5,
        } satisfies TalentDetailResponse;
      }

      if (path === '/api/v1/talents/talent-1/settings' && !init) {
        return {
          scopeType: 'talent',
          scopeId: 'talent-1',
          settings: {
            defaultLanguage: 'ja',
            timezone: 'Asia/Tokyo',
            allowCustomHomepage: true,
          },
          overrides: [],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: 5,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage' && !init) {
        return {
          id: 'homepage-1',
          talentId: 'talent-1',
          isPublished: false,
          publishedVersion: null,
          draftVersion: null,
          customDomain: null,
          customDomainVerified: false,
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        } satisfies HomepageResponse;
      }

      if (path === '/api/v1/talents/talent-1/custom-domain' && !init) {
        return {
          customDomain: null,
          customDomainVerified: false,
          customDomainVerificationToken: null,
          customDomainSslMode: 'auto',
          homepageCustomPath: null,
          marshmallowCustomPath: null,
        } satisfies TalentCustomDomainConfigResponse;
      }

      if (path === '/api/v1/talents/talent-1/publish-readiness') {
        return {
          id: 'talent-1',
          lifecycleStatus: 'draft',
          targetState: 'published',
          recommendedAction: 'publish',
          canEnterPublishedState: true,
          blockers: [],
          warnings: [],
          version: 5,
        } satisfies TalentPublishReadinessResponse;
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/config' && !init) {
        return {
          isEnabled: true,
          allowAnonymous: true,
          requireCaptcha: false,
          moderationEnabled: true,
          rateLimitPerMinute: 5,
          sensitiveWordsEnabled: true,
          notifyByEmail: false,
          version: 1,
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TalentSettingsScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Sora タレント設定' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '設定セクション' })).toBeInTheDocument();
  });

  it('renders exact-locale settings copy for zh_HANT and ko without falling back to family defaults', async () => {
    const installSuccessMocks = () => {
      mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
        if (path === '/api/v1/talents/talent-1' && !init) {
          return {
            id: 'talent-1',
            subsidiaryId: 'subsidiary-1',
            profileStoreId: 'store-1',
            profileStore: {
              id: 'store-1',
              code: 'DEFAULT_STORE',
              nameEn: 'Default Store',
              nameZh: '默认档案库',
              nameJa: '既定プロフィールストア',
              translations: {
                en: 'Default Store',
                zh_HANS: '默认档案库',
                ja: '既定プロフィールストア',
              },
              isDefault: true,
              piiProxyUrl: 'https://pii.internal.test',
            },
            code: 'SORA',
            path: '/TOKYO/SORA/',
            nameEn: 'Tokino Sora',
            nameZh: '时乃空',
            nameJa: 'ときのそら',
            name: 'Sora',
            displayName: 'Sora',
            descriptionEn: null,
            descriptionZh: null,
            descriptionJa: null,
            avatarUrl: null,
            homepagePath: 'sora',
            timezone: 'Asia/Tokyo',
            lifecycleStatus: 'draft',
            publishedAt: null,
            publishedBy: null,
            isActive: false,
            settings: {
              defaultLanguage: 'en',
              timezone: 'Asia/Tokyo',
              allowCustomHomepage: true,
            },
            stats: {
              customerCount: 12,
              homepageVersionCount: 2,
              marshmallowMessageCount: 9,
            },
            externalPagesDomain: {
              homepage: { isPublished: false },
              marshmallow: { isEnabled: true },
            },
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:10:00.000Z',
            version: 5,
          } satisfies TalentDetailResponse;
        }

        if (path === '/api/v1/talents/talent-1/settings' && !init) {
          return {
            scopeType: 'talent',
            scopeId: 'talent-1',
            settings: {
              defaultLanguage: 'en',
              timezone: 'Asia/Tokyo',
              allowCustomHomepage: true,
            },
            overrides: [],
            inheritedFrom: {
              defaultLanguage: 'tenant',
              timezone: 'tenant',
              allowCustomHomepage: 'tenant',
            },
            version: 5,
          };
        }

        if (path === '/api/v1/talents/talent-1/homepage' && !init) {
          return {
            id: 'homepage-1',
            talentId: 'talent-1',
            isPublished: false,
            publishedVersion: null,
            draftVersion: null,
            customDomain: null,
            customDomainVerified: false,
            seoTitle: null,
            seoDescription: null,
            ogImageUrl: null,
            analyticsId: null,
            homepagePath: 'sora',
            homepageUrl: 'https://app.example.com/p/sora',
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:10:00.000Z',
            version: 3,
          } satisfies HomepageResponse;
        }

        if (path === '/api/v1/talents/talent-1/custom-domain' && !init) {
          return {
            customDomain: null,
            customDomainVerified: false,
            customDomainVerificationToken: null,
            customDomainSslMode: 'auto',
            homepageCustomPath: null,
            marshmallowCustomPath: null,
          } satisfies TalentCustomDomainConfigResponse;
        }

        if (path === '/api/v1/talents/talent-1/publish-readiness') {
          return {
            id: 'talent-1',
            lifecycleStatus: 'draft',
            targetState: 'published',
            recommendedAction: 'publish',
            canEnterPublishedState: true,
            blockers: [],
            warnings: [],
            version: 5,
          } satisfies TalentPublishReadinessResponse;
        }

        if (path === '/api/v1/talents/talent-1/marshmallow/config' && !init) {
          return {
            isEnabled: true,
            allowAnonymous: true,
            requireCaptcha: false,
            moderationEnabled: true,
            rateLimitPerMinute: 5,
            sensitiveWordsEnabled: true,
            notifyByEmail: false,
            version: 1,
          };
        }

        if (path === '/api/v1/system-dictionary') {
          return [];
        }

        throw new Error(`Unhandled request: ${path}`);
      });
    };

    localeState.currentLocale = 'zh';
    localeState.selectedLocale = 'zh_HANT';
    installSuccessMocks();

    const { rerender } = render(<TalentSettingsScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Sora 藝人設定' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '設定分區' })).toBeInTheDocument();

    localeState.currentLocale = 'en';
    localeState.selectedLocale = 'ko';
    installSuccessMocks();
    rerender(<TalentSettingsScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Sora 아티스트 설정' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '설정 섹션' })).toBeInTheDocument();
  });

  it('loads talent settings resources, disables inherited config entities, and saves updated overrides', async () => {
    const businessSegments: ConfigEntityRecord[] = [
      {
        id: 'segment-inherited',
        ownerType: 'subsidiary',
        ownerId: 'subsidiary-1',
        code: 'TENANT_SEGMENT',
        name: 'Tenant Segment',
        nameEn: 'Tenant Segment',
        nameZh: null,
        nameJa: null,
        translations: {
          en: 'Tenant Segment',
        },
        description: 'Inherited from the parent scope',
        descriptionEn: 'Inherited from the parent scope',
        descriptionZh: null,
        descriptionJa: null,
        descriptionTranslations: {
          en: 'Inherited from the parent scope',
        },
        sortOrder: 0,
        isActive: true,
        isForceUse: false,
        isSystem: false,
        isInherited: true,
        isDisabledHere: false,
        canDisable: true,
        extraData: null,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:10:00.000Z',
        version: 2,
      },
    ];

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1' && !init) {
        return {
          id: 'talent-1',
          subsidiaryId: 'subsidiary-1',
          profileStoreId: 'store-1',
          profileStore: {
            id: 'store-1',
            code: 'DEFAULT_STORE',
            nameEn: 'Default Store',
            nameZh: '默认档案库',
            nameJa: null,
            translations: {
              en: 'Default Store',
              zh_HANS: '默认档案库',
            },
            isDefault: true,
            piiProxyUrl: 'https://pii.internal.test',
          },
          code: 'SORA',
          path: '/TOKYO/SORA/',
          nameEn: 'Tokino Sora',
          nameZh: '时乃空',
          nameJa: 'ときのそら',
          name: '时乃空',
          displayName: 'Sora',
          descriptionEn: null,
          descriptionZh: null,
          descriptionJa: null,
          avatarUrl: null,
          homepagePath: 'sora',
          timezone: 'Asia/Tokyo',
          lifecycleStatus: 'draft',
          publishedAt: null,
          publishedBy: null,
          isActive: false,
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Tokyo',
            allowCustomHomepage: true,
          },
          stats: {
            customerCount: 12,
            homepageVersionCount: 2,
            marshmallowMessageCount: 9,
          },
          externalPagesDomain: {
            homepage: { isPublished: false },
            marshmallow: { isEnabled: true },
          },
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 5,
        };
      }

      if (path === '/api/v1/talents/talent-1/settings' && !init) {
        return {
          scopeType: 'talent',
          scopeId: 'talent-1',
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Tokyo',
            allowCustomHomepage: true,
          },
          overrides: ['timezone'],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: 5,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage' && !init) {
        return {
          id: 'homepage-1',
          talentId: 'talent-1',
          isPublished: false,
          publishedVersion: null,
          draftVersion: null,
          customDomain: null,
          customDomainVerified: false,
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/talents/talent-1/custom-domain' && !init) {
        return {
          customDomain: null,
          customDomainVerified: false,
          customDomainVerificationToken: null,
          customDomainSslMode: 'auto',
          homepageCustomPath: null,
          marshmallowCustomPath: null,
        };
      }

      if (path === '/api/v1/talents/talent-1/publish-readiness') {
        return {
          id: 'talent-1',
          lifecycleStatus: 'draft',
          targetState: 'published',
          recommendedAction: 'publish',
          canEnterPublishedState: false,
          blockers: [
            {
              code: 'PROFILE_STORE_REQUIRED',
              message: 'Talent must be bound to an active profile store before publish.',
            },
          ],
          warnings: [
            {
              code: 'HOMEPAGE_NOT_PUBLISHED',
              message: 'Homepage content is still unpublished.',
            },
          ],
          version: 5,
        };
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/config' && !init) {
        return {
          id: 'config-1',
          talentId: 'talent-1',
          isEnabled: true,
          title: 'Sora Mailbox',
          welcomeText: 'Leave your message here.',
          placeholderText: 'Write your message...',
          thankYouText: 'Thanks for your message!',
          allowAnonymous: true,
          captchaMode: 'auto',
          moderationEnabled: true,
          autoApprove: false,
          profanityFilterEnabled: true,
          externalBlocklistEnabled: false,
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
            totalMessages: 9,
            pendingCount: 2,
            approvedCount: 6,
            rejectedCount: 1,
            unreadCount: 3,
          },
          marshmallowUrl: 'https://app.example.com/m/sora-mailbox',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [
          {
            type: 'CUSTOMER_STATUS',
            name: 'Customer Status',
            description: 'Customer lifecycle flags',
            count: 4,
          },
        ];
      }

      if (path === '/api/v1/system-dictionary/CUSTOMER_STATUS?includeInactive=false&page=1&pageSize=20') {
        return {
          success: true,
          data: dictionaryItemsResponse,
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: dictionaryItemsResponse.length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      if (
        path ===
          '/api/v1/configuration-entity/business-segment?scopeType=talent&scopeId=talent-1&includeInherited=true&includeDisabled=true&includeInactive=false&ownerOnly=false&page=1&pageSize=20&sort=sortOrder'
      ) {
        return {
          success: true,
          data: businessSegments,
          meta: {
            pagination: {
              page: 1,
              pageSize: 20,
              totalCount: businessSegments.length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      if (path === '/api/v1/configuration-entity/business-segment/segment-inherited/disable' && init?.method === 'POST') {
        businessSegments[0] = {
          ...businessSegments[0],
          isDisabledHere: true,
        };

        return {
          message: 'Config disabled in current scope',
        };
      }

      if (path === '/api/v1/talents/talent-1/settings' && init?.method === 'PATCH') {
        return {
          scopeType: 'talent',
          scopeId: 'talent-1',
          settings: {
            defaultLanguage: 'ja',
            timezone: 'Asia/Tokyo',
            allowCustomHomepage: true,
          },
          overrides: ['defaultLanguage', 'timezone'],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: 6,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TalentSettingsScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Sora Talent Settings' })).toBeInTheDocument();
    expect(screen.getByText('Customer archive required')).toBeInTheDocument();
    expect(screen.getByText('Bind an active customer archive before publishing this talent.')).toBeInTheDocument();
    expect(screen.getByText('Homepage not published')).toBeInTheDocument();
    expect(
      screen.getByText('The homepage is still private. Publish it if this talent should be visible on the public side.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish talent' })).toBeDisabled();
    expect(screen.getAllByText('Default Store').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'System Dictionary' }));
    expect(await screen.findByText('Active customer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Configuration Entity Management' }));
    expect(screen.getAllByText('Business Segment').length).toBeGreaterThan(0);
    expect(await screen.findByText('TENANT_SEGMENT')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Disable here TENANT_SEGMENT' }));
    expect(await screen.findByText('Disable TENANT_SEGMENT in this scope?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Disable in scope' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/configuration-entity/business-segment/segment-inherited/disable',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            scopeType: 'talent',
            scopeId: 'talent-1',
          }),
        }),
      );
    });

    expect((await screen.findAllByText(/Disabled here/i)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.change(screen.getByLabelText('Default language'), {
      target: { value: 'ja' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save talent settings' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            settings: {
              defaultLanguage: 'ja',
              timezone: 'Asia/Tokyo',
              allowCustomHomepage: true,
            },
            version: 5,
          }),
        }),
      );
    });

    expect(await screen.findByText('Talent settings saved.')).toBeInTheDocument();
  });

  it('hydrates the settings section from the URL, syncs section query state, and uses only the approved public-domain route families', async () => {
    currentSearch = 'section=settings&focus=marshmallow-routing';
    const homepage: HomepageResponse = {
      id: 'homepage-1',
      talentId: 'talent-1',
      isPublished: false,
      publishedVersion: null,
      draftVersion: null,
      customDomain: null,
      customDomainVerified: false,
      seoTitle: null,
      seoDescription: null,
      ogImageUrl: null,
      analyticsId: null,
      homepagePath: 'sora',
      homepageUrl: 'https://app.example.com/p/sora',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:10:00.000Z',
      version: 7,
    };
    let customDomainConfig: TalentCustomDomainConfigResponse = {
      customDomain: null,
      customDomainVerified: false,
      customDomainVerificationToken: null,
      customDomainSslMode: 'auto',
      homepageCustomPath: null,
      marshmallowCustomPath: null,
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1' && !init) {
        return {
          id: 'talent-1',
          subsidiaryId: 'subsidiary-1',
          profileStoreId: 'store-1',
          profileStore: {
            id: 'store-1',
            code: 'DEFAULT_STORE',
            nameEn: 'Default Store',
            nameZh: '默认档案库',
            nameJa: null,
            translations: {
              en: 'Default Store',
              zh_HANS: '默认档案库',
            },
            isDefault: true,
            piiProxyUrl: 'https://pii.internal.test',
          },
          code: 'SORA',
          path: '/TOKYO/SORA/',
          nameEn: 'Tokino Sora',
          nameZh: '时乃空',
          nameJa: 'ときのそら',
          name: '时乃空',
          displayName: 'Sora',
          descriptionEn: null,
          descriptionZh: null,
          descriptionJa: null,
          avatarUrl: null,
          homepagePath: 'sora',
          timezone: 'Asia/Tokyo',
          lifecycleStatus: 'draft',
          publishedAt: null,
          publishedBy: null,
          isActive: false,
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Tokyo',
            allowCustomHomepage: true,
          },
          stats: {
            customerCount: 12,
            homepageVersionCount: 2,
            marshmallowMessageCount: 9,
          },
          externalPagesDomain: {
            homepage: { isPublished: false },
            marshmallow: { isEnabled: true },
          },
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 5,
        };
      }

      if (path === '/api/v1/talents/talent-1/settings' && !init) {
        return {
          scopeType: 'talent',
          scopeId: 'talent-1',
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Tokyo',
            allowCustomHomepage: true,
          },
          overrides: ['timezone'],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: 5,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage' && !init) {
        return homepage;
      }

      if (path === '/api/v1/talents/talent-1/custom-domain' && !init) {
        return customDomainConfig;
      }

      if (path === '/api/v1/talents/talent-1/custom-domain' && init?.method === 'POST') {
        customDomainConfig = {
          ...customDomainConfig,
          customDomain: 'fans.example.com',
          customDomainVerified: false,
          customDomainVerificationToken: 'token-123',
        };

        return {
          customDomain: 'fans.example.com',
          token: 'token-123',
          txtRecord: 'tcrn-verify=token-123',
        };
      }

      if (path === '/api/v1/talents/talent-1/custom-domain/verify' && init?.method === 'POST') {
        customDomainConfig = {
          ...customDomainConfig,
          customDomainVerified: true,
        };

        return {
          verified: true,
          message: 'Domain verified successfully',
        };
      }

      if (path === '/api/v1/talents/talent-1/custom-domain/ssl-mode' && init?.method === 'PATCH') {
        customDomainConfig = {
          ...customDomainConfig,
          customDomainSslMode: 'cloudflare',
        };

        return {
          customDomainSslMode: 'cloudflare',
        };
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/config' && !init) {
        return {
          id: 'config-1',
          talentId: 'talent-1',
          isEnabled: true,
          title: 'Sora Mailbox',
          welcomeText: 'Leave your message here.',
          placeholderText: 'Write your message...',
          thankYouText: 'Thanks for your message!',
          allowAnonymous: true,
          captchaMode: 'auto',
          moderationEnabled: true,
          autoApprove: false,
          profanityFilterEnabled: true,
          externalBlocklistEnabled: false,
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
            totalMessages: 9,
            pendingCount: 2,
            approvedCount: 6,
            rejectedCount: 1,
            unreadCount: 3,
          },
          marshmallowUrl: 'https://app.example.com/m/sora-mailbox',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/config' && init?.method === 'PATCH') {
        return {
          id: 'config-1',
          talentId: 'talent-1',
          isEnabled: false,
          title: 'Sora Mailbox',
          welcomeText: 'Leave your message here.',
          placeholderText: 'Write your message...',
          thankYouText: 'Thanks for your message!',
          allowAnonymous: true,
          captchaMode: 'auto',
          moderationEnabled: true,
          autoApprove: false,
          profanityFilterEnabled: true,
          externalBlocklistEnabled: false,
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
            totalMessages: 9,
            pendingCount: 2,
            approvedCount: 6,
            rejectedCount: 1,
            unreadCount: 3,
          },
          marshmallowUrl: 'https://app.example.com/m/sora-mailbox',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:15:00.000Z',
          version: 4,
        };
      }

      if (path === '/api/v1/talents/talent-1/publish-readiness') {
        return {
          id: 'talent-1',
          lifecycleStatus: 'draft',
          targetState: 'published',
          recommendedAction: 'publish',
          canEnterPublishedState: false,
          blockers: [],
          warnings: [],
          version: 5,
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [];
      }

      if (path.startsWith('/api/v1/configuration-entity/') && !init) {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TalentSettingsScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Sora Talent Settings' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Enable public marshmallow route')).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/tenant/tenant-1/talent/talent-1/settings?section=details');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.queryByLabelText('Homepage path')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Homepage custom-domain path')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Marshmallow custom-domain path')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save homepage path' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save custom-domain paths' })).not.toBeInTheDocument();
    expect(await screen.findByText('/tenant_test/sora/homepage')).toBeInTheDocument();
    expect(await screen.findByText('/tenant_test/sora/marshmallow')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Custom domain'), {
      target: { value: 'FANS.EXAMPLE.COM' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save custom domain' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/custom-domain',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            customDomain: 'fans.example.com',
          }),
        }),
      );
    });

    expect(await screen.findByText('Custom domain saved.')).toBeInTheDocument();
    expect(await screen.findByText('tcrn-verify=token-123')).toBeInTheDocument();
    expect(await screen.findByText('Fixed Public Routes')).toBeInTheDocument();
    expect(
      await screen.findByText('The homepage route is fixed to /homepage under any custom domain.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('The marshmallow route is fixed to /marshmallow under any custom domain.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Verify custom domain' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/custom-domain/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
        }),
      );
    });

    expect(await screen.findByText('Domain verified successfully')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Custom-domain SSL mode'), {
      target: { value: 'cloudflare' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save custom-domain SSL mode' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/custom-domain/ssl-mode',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            sslMode: 'cloudflare',
          }),
        }),
      );
    });

    expect(await screen.findByText('Custom-domain SSL mode saved.')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Enable public marshmallow route'));
    fireEvent.click(screen.getByRole('button', { name: 'Save public marshmallow route' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/marshmallow/config',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            isEnabled: false,
            title: 'Sora Mailbox',
            welcomeText: 'Leave your message here.',
            placeholderText: 'Write your message...',
            thankYouText: 'Thanks for your message!',
            allowAnonymous: true,
            captchaMode: 'auto',
            moderationEnabled: true,
            autoApprove: false,
            profanityFilterEnabled: true,
            externalBlocklistEnabled: false,
            maxMessageLength: 500,
            minMessageLength: 1,
            rateLimitPerIp: 5,
            rateLimitWindowHours: 1,
            reactionsEnabled: true,
            allowedReactions: ['heart', 'star'],
            version: 3,
          }),
        }),
      );
    });

    expect(await screen.findByText('Public marshmallow routing saved.')).toBeInTheDocument();
    expect(
      mockRequest.mock.calls.some(
        ([path, init]) => path === '/api/v1/talents/talent-1/homepage/settings' && init?.method === 'PATCH',
      ),
    ).toBe(false);
    expect(
      mockRequest.mock.calls.some(
        ([path, init]) => path === '/api/v1/talents/talent-1/custom-domain/paths' && init?.method === 'PATCH',
      ),
    ).toBe(false);
  });

  it('does not render deprecated homepage-path editors when the settings route focuses homepage routing', async () => {
    currentSearch = 'section=settings&focus=homepage-routing';

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1' && !init) {
        return {
          id: 'talent-1',
          subsidiaryId: 'subsidiary-1',
          profileStoreId: 'store-1',
          profileStore: {
            id: 'store-1',
            code: 'DEFAULT_STORE',
            nameEn: 'Default Store',
            nameZh: '默认档案库',
            nameJa: null,
            translations: {
              en: 'Default Store',
              zh_HANS: '默认档案库',
            },
            isDefault: true,
            piiProxyUrl: 'https://pii.internal.test',
          },
          code: 'SORA',
          path: '/TOKYO/SORA/',
          nameEn: 'Tokino Sora',
          nameZh: '时乃空',
          nameJa: 'ときのそら',
          name: '时乃空',
          displayName: 'Sora',
          descriptionEn: null,
          descriptionZh: null,
          descriptionJa: null,
          avatarUrl: null,
          homepagePath: 'sora',
          timezone: 'Asia/Tokyo',
          lifecycleStatus: 'draft',
          publishedAt: null,
          publishedBy: null,
          isActive: false,
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Tokyo',
            allowCustomHomepage: true,
          },
          stats: {
            customerCount: 12,
            homepageVersionCount: 2,
            marshmallowMessageCount: 9,
          },
          externalPagesDomain: {
            homepage: { isPublished: false },
            marshmallow: { isEnabled: true },
          },
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 5,
        };
      }

      if (path === '/api/v1/talents/talent-1/settings' && !init) {
        return {
          scopeType: 'talent',
          scopeId: 'talent-1',
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Tokyo',
            allowCustomHomepage: true,
          },
          overrides: ['timezone'],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: 5,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage' && !init) {
        return {
          id: 'homepage-1',
          talentId: 'talent-1',
          isPublished: false,
          publishedVersion: null,
          draftVersion: null,
          customDomain: null,
          customDomainVerified: false,
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 7,
        };
      }

      if (path === '/api/v1/talents/talent-1/custom-domain' && !init) {
        return {
          customDomain: null,
          customDomainVerified: false,
          customDomainVerificationToken: null,
          customDomainSslMode: 'auto',
          homepageCustomPath: null,
          marshmallowCustomPath: null,
        };
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/config' && !init) {
        return {
          id: 'config-1',
          talentId: 'talent-1',
          isEnabled: true,
          title: 'Sora Mailbox',
          welcomeText: 'Leave your message here.',
          placeholderText: 'Write your message...',
          thankYouText: 'Thanks for your message!',
          allowAnonymous: true,
          captchaMode: 'auto',
          moderationEnabled: true,
          autoApprove: false,
          profanityFilterEnabled: true,
          externalBlocklistEnabled: false,
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
            totalMessages: 9,
            pendingCount: 2,
            approvedCount: 6,
            rejectedCount: 1,
            unreadCount: 3,
          },
          marshmallowUrl: 'https://app.example.com/m/sora-mailbox',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/talents/talent-1/publish-readiness') {
        return {
          id: 'talent-1',
          lifecycleStatus: 'draft',
          targetState: 'published',
          recommendedAction: 'publish',
          canEnterPublishedState: false,
          blockers: [],
          warnings: [],
          version: 5,
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [];
      }

      if (path.startsWith('/api/v1/configuration-entity/') && !init) {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TalentSettingsScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Sora Talent Settings' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Homepage path')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save homepage path' })).not.toBeInTheDocument();
    expect(await screen.findByText('/tenant_test/sora/homepage')).toBeInTheDocument();
    expect(await screen.findByText('/tenant_test/sora/marshmallow')).toBeInTheDocument();
  });

  it('publishes a draft talent from the readiness section and refreshes lifecycle state', async () => {
    let detail: TalentDetailResponse = {
      id: 'talent-1',
      subsidiaryId: 'subsidiary-1',
      profileStoreId: 'store-1',
      profileStore: {
        id: 'store-1',
        code: 'DEFAULT_STORE',
        nameEn: 'Default Store',
        nameZh: '默认档案库',
        nameJa: null,
        translations: {
          en: 'Default Store',
          zh_HANS: '默认档案库',
        },
        isDefault: true,
        piiProxyUrl: 'https://pii.internal.test',
      },
      code: 'SORA',
      path: '/TOKYO/SORA/',
      nameEn: 'Tokino Sora',
      nameZh: '时乃空',
      nameJa: 'ときのそら',
      name: '时乃空',
      displayName: 'Sora',
      descriptionEn: null,
      descriptionZh: null,
      descriptionJa: null,
      avatarUrl: null,
      homepagePath: 'sora',
      timezone: 'Asia/Tokyo',
      lifecycleStatus: 'draft' as const,
      publishedAt: null,
      publishedBy: null,
      isActive: false,
      settings: {
        defaultLanguage: 'zh-CN',
        timezone: 'Asia/Tokyo',
        allowCustomHomepage: true,
      },
      stats: {
        customerCount: 12,
        homepageVersionCount: 2,
        marshmallowMessageCount: 9,
      },
      externalPagesDomain: {
        homepage: { isPublished: false },
        marshmallow: { isEnabled: true },
      },
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:10:00.000Z',
      version: 5,
    };

    let readiness: TalentPublishReadinessResponse = {
      id: 'talent-1',
      lifecycleStatus: 'draft' as const,
      targetState: 'published',
      recommendedAction: 'publish',
      canEnterPublishedState: true,
      blockers: [],
      warnings: [
        {
          code: 'HOMEPAGE_NOT_PUBLISHED',
          message: 'Homepage content is still unpublished.',
        },
      ],
      version: 5,
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1' && !init) {
        return detail;
      }

      if (path === '/api/v1/talents/talent-1/settings' && !init) {
        return {
          scopeType: 'talent',
          scopeId: 'talent-1',
          settings: detail.settings,
          overrides: ['timezone'],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: detail.version,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage' && !init) {
        return {
          id: 'homepage-1',
          talentId: 'talent-1',
          isPublished: detail.externalPagesDomain.homepage?.isPublished ?? false,
          publishedVersion: null,
          draftVersion: null,
          customDomain: null,
          customDomainVerified: false,
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: detail.homepagePath,
          homepageUrl: detail.homepagePath ? `https://app.example.com/p/${detail.homepagePath}` : '',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/talents/talent-1/custom-domain' && !init) {
        return {
          customDomain: null,
          customDomainVerified: false,
          customDomainVerificationToken: null,
          customDomainSslMode: 'auto',
          homepageCustomPath: null,
          marshmallowCustomPath: null,
        };
      }

      if (path === '/api/v1/talents/talent-1/publish-readiness') {
        return readiness;
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/config' && !init) {
        return {
          id: 'config-1',
          talentId: 'talent-1',
          isEnabled: true,
          title: 'Sora Mailbox',
          welcomeText: 'Leave your message here.',
          placeholderText: 'Write your message...',
          thankYouText: 'Thanks for your message!',
          allowAnonymous: true,
          captchaMode: 'auto',
          moderationEnabled: true,
          autoApprove: false,
          profanityFilterEnabled: true,
          externalBlocklistEnabled: false,
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
            totalMessages: 9,
            pendingCount: 2,
            approvedCount: 6,
            rejectedCount: 1,
            unreadCount: 3,
          },
          marshmallowUrl: 'https://app.example.com/m/sora-mailbox',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/talents/talent-1/publish' && init?.method === 'POST') {
        detail = {
          ...detail,
          lifecycleStatus: 'published',
          publishedAt: '2026-04-17T01:00:00.000Z',
          publishedBy: 'user-1',
          isActive: true,
          version: 6,
        };
        readiness = {
          ...readiness,
          lifecycleStatus: 'published',
          targetState: 'disabled',
          recommendedAction: 'disable',
          version: 6,
        };

        return {
          id: 'talent-1',
          lifecycleStatus: 'published',
          publishedAt: '2026-04-17T01:00:00.000Z',
          publishedBy: 'user-1',
          isActive: true,
          version: 6,
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [
          {
            type: 'CUSTOMER_STATUS',
            name: 'Customer Status',
            description: 'Customer lifecycle flags',
            count: 4,
          },
        ];
      }

      if (path.startsWith('/api/v1/configuration-entity/') && !init) {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TalentSettingsScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Sora Talent Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish talent' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Publish talent' }));
    expect(await screen.findByText('Publish talent?')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Publish talent' })[1]);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/publish',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            version: 5,
          }),
        }),
      );
    });

    expect(await screen.findByText('Talent published.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Disable talent' })).toBeInTheDocument();
  });

  it('disables and re-enables a talent from the lifecycle action card', async () => {
    let detail: TalentDetailResponse = {
      id: 'talent-1',
      subsidiaryId: 'subsidiary-1',
      profileStoreId: 'store-1',
      profileStore: {
        id: 'store-1',
        code: 'DEFAULT_STORE',
        nameEn: 'Default Store',
        nameZh: '默认档案库',
        nameJa: null,
        translations: {
          en: 'Default Store',
          zh_HANS: '默认档案库',
        },
        isDefault: true,
        piiProxyUrl: 'https://pii.internal.test',
      },
      code: 'SORA',
      path: '/TOKYO/SORA/',
      nameEn: 'Tokino Sora',
      nameZh: '时乃空',
      nameJa: 'ときのそら',
      name: '时乃空',
      displayName: 'Sora',
      descriptionEn: null,
      descriptionZh: null,
      descriptionJa: null,
      avatarUrl: null,
      homepagePath: 'sora',
      timezone: 'Asia/Tokyo',
      lifecycleStatus: 'published' as const,
      publishedAt: '2026-04-17T01:00:00.000Z',
      publishedBy: 'user-1',
      isActive: true,
      settings: {
        defaultLanguage: 'zh-CN',
        timezone: 'Asia/Tokyo',
        allowCustomHomepage: true,
      },
      stats: {
        customerCount: 12,
        homepageVersionCount: 2,
        marshmallowMessageCount: 9,
      },
      externalPagesDomain: {
        homepage: { isPublished: false },
        marshmallow: { isEnabled: true },
      },
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:10:00.000Z',
      version: 8,
    };

    let readiness: TalentPublishReadinessResponse = {
      id: 'talent-1',
      lifecycleStatus: 'published' as const,
      targetState: 'disabled',
      recommendedAction: 'disable',
      canEnterPublishedState: true,
      blockers: [],
      warnings: [],
      version: 8,
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1' && !init) {
        return detail;
      }

      if (path === '/api/v1/talents/talent-1/settings' && !init) {
        return {
          scopeType: 'talent',
          scopeId: 'talent-1',
          settings: detail.settings,
          overrides: ['timezone'],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
            allowCustomHomepage: 'tenant',
          },
          version: detail.version,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage' && !init) {
        return {
          id: 'homepage-1',
          talentId: 'talent-1',
          isPublished: detail.externalPagesDomain.homepage?.isPublished ?? false,
          publishedVersion: null,
          draftVersion: null,
          customDomain: null,
          customDomainVerified: false,
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: detail.homepagePath,
          homepageUrl: detail.homepagePath ? `https://app.example.com/p/${detail.homepagePath}` : '',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/talents/talent-1/custom-domain' && !init) {
        return {
          customDomain: null,
          customDomainVerified: false,
          customDomainVerificationToken: null,
          customDomainSslMode: 'auto',
          homepageCustomPath: null,
          marshmallowCustomPath: null,
        };
      }

      if (path === '/api/v1/talents/talent-1/publish-readiness') {
        return readiness;
      }

      if (path === '/api/v1/talents/talent-1/marshmallow/config' && !init) {
        return {
          id: 'config-1',
          talentId: 'talent-1',
          isEnabled: true,
          title: 'Sora Mailbox',
          welcomeText: 'Leave your message here.',
          placeholderText: 'Write your message...',
          thankYouText: 'Thanks for your message!',
          allowAnonymous: true,
          captchaMode: 'auto',
          moderationEnabled: true,
          autoApprove: false,
          profanityFilterEnabled: true,
          externalBlocklistEnabled: false,
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
            totalMessages: 9,
            pendingCount: 2,
            approvedCount: 6,
            rejectedCount: 1,
            unreadCount: 3,
          },
          marshmallowUrl: 'https://app.example.com/m/sora-mailbox',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:10:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/talents/talent-1/disable' && init?.method === 'POST') {
        detail = {
          ...detail,
          lifecycleStatus: 'disabled',
          isActive: false,
          version: 9,
        };
        readiness = {
          ...readiness,
          lifecycleStatus: 'disabled',
          targetState: 'published',
          recommendedAction: 're-enable',
          version: 9,
        };

        return {
          id: 'talent-1',
          lifecycleStatus: 'disabled',
          publishedAt: '2026-04-17T01:00:00.000Z',
          publishedBy: 'user-1',
          isActive: false,
          version: 9,
        };
      }

      if (path === '/api/v1/talents/talent-1/re-enable' && init?.method === 'POST') {
        detail = {
          ...detail,
          lifecycleStatus: 'published',
          isActive: true,
          version: 10,
        };
        readiness = {
          ...readiness,
          lifecycleStatus: 'published',
          targetState: 'disabled',
          recommendedAction: 'disable',
          version: 10,
        };

        return {
          id: 'talent-1',
          lifecycleStatus: 'published',
          publishedAt: '2026-04-17T01:00:00.000Z',
          publishedBy: 'user-1',
          isActive: true,
          version: 10,
        };
      }

      if (path === '/api/v1/system-dictionary') {
        return [
          {
            type: 'CUSTOMER_STATUS',
            name: 'Customer Status',
            description: 'Customer lifecycle flags',
            count: 4,
          },
        ];
      }

      if (path.startsWith('/api/v1/configuration-entity/') && !init) {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<TalentSettingsScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('button', { name: 'Disable talent' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Disable talent' }));
    expect(await screen.findByText('Disable talent?')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Disable talent' })[1]);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/disable',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            version: 8,
          }),
        }),
      );
    });

    expect(await screen.findByText('Talent disabled.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Re-enable talent' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Re-enable talent' }));
    expect(await screen.findByText('Re-enable talent?')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Re-enable talent' })[1]);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/re-enable',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            version: 9,
          }),
        }),
      );
    });

    expect(await screen.findByText('Talent re-enabled.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Disable talent' })).toBeInTheDocument();
  });
});
