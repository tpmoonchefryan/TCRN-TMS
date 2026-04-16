import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  configEntityApi,
  configurationEntityApi,
  dictionaryApi,
  emailConfigApi,
  platformConfigApi,
  settingsApi,
  subsidiaryApi,
} from '@/lib/api/modules/configuration';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api/core', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('subsidiaryApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the normal product-flow endpoints while leaving move out of the web API surface', async () => {
    mockGet.mockResolvedValue({ success: true, data: {} });
    mockPost.mockResolvedValue({ success: true, data: {} });
    mockPatch.mockResolvedValue({ success: true, data: {} });

    await subsidiaryApi.list();
    await subsidiaryApi.get('subsidiary-1');
    await subsidiaryApi.create({
      code: 'SUB001',
      nameEn: 'Subsidiary One',
    });
    await subsidiaryApi.update('subsidiary-1', {
      nameEn: 'Subsidiary One Updated',
      version: 2,
    });
    await subsidiaryApi.deactivate('subsidiary-1', 3);
    await subsidiaryApi.reactivate('subsidiary-1', 4);

    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/subsidiaries');
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v1/subsidiaries/subsidiary-1');
    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/subsidiaries', {
      code: 'SUB001',
      nameEn: 'Subsidiary One',
    });
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/subsidiaries/subsidiary-1', {
      nameEn: 'Subsidiary One Updated',
      version: 2,
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/v1/subsidiaries/subsidiary-1/deactivate', {
      version: 3,
    });
    expect(mockPost).toHaveBeenNthCalledWith(3, '/api/v1/subsidiaries/subsidiary-1/reactivate', {
      version: 4,
    });
    expect('move' in subsidiaryApi).toBe(false);
  });
});

describe('config entity web API contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps scoped config entity mutations on create/update/deactivate/reactivate', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    mockPost.mockResolvedValue({ success: true, data: {} });
    mockPatch.mockResolvedValue({ success: true, data: {} });

    await configEntityApi.list('membership-class', {
      scopeType: 'talent',
      scopeId: 'talent-1',
      includeInherited: true,
    });
    await configEntityApi.get('membership-class', 'entity-1');
    await configEntityApi.create('membership-class', {
      code: 'VIP',
      nameEn: 'VIP',
      ownerType: 'talent',
      ownerId: 'talent-1',
    });
    await configEntityApi.update('membership-class', 'entity-1', {
      nameEn: 'VIP Updated',
      version: 2,
    });
    await configEntityApi.deactivate('membership-class', 'entity-1', 3);
    await configEntityApi.reactivate('membership-class', 'entity-1', 4);

    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/configuration-entity/membership-class', {
      scopeType: 'talent',
      scopeId: 'talent-1',
      includeInherited: true,
    });
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v1/configuration-entity/membership-class/entity-1');
    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/configuration-entity/membership-class', {
      code: 'VIP',
      nameEn: 'VIP',
      ownerType: 'talent',
      ownerId: 'talent-1',
    });
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/configuration-entity/membership-class/entity-1', {
      nameEn: 'VIP Updated',
      version: 2,
    });
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/api/v1/configuration-entity/membership-class/entity-1/deactivate',
      { version: 3 },
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/api/v1/configuration-entity/membership-class/entity-1/reactivate',
      { version: 4 },
    );
    expect('delete' in configEntityApi).toBe(false);
  });

  it('keeps the legacy configurationEntityApi helper read-oriented and without hard-delete drift', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    mockPost.mockResolvedValue({ success: true, data: {} });
    mockPatch.mockResolvedValue({ success: true, data: {} });

    await configurationEntityApi.list('membership-class');
    await configurationEntityApi.get('membership-class', 'entity-1');
    await configurationEntityApi.create('membership-class', {
      code: 'VIP',
      nameEn: 'VIP',
    });
    await configurationEntityApi.update('membership-class', 'entity-1', {
      nameEn: 'VIP Updated',
      version: 2,
    });
    await configurationEntityApi.getMembershipTypesByClass('class-1');
    await configurationEntityApi.getMembershipLevelsByType('type-1');
    await configurationEntityApi.getMembershipTree({
      scopeType: 'talent',
      scopeId: 'talent-1',
      includeInactive: false,
    });

    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/configuration-entity/membership-class', undefined);
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v1/configuration-entity/membership-class/entity-1');
    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/configuration-entity/membership-class', {
      code: 'VIP',
      nameEn: 'VIP',
    });
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/configuration-entity/membership-class/entity-1', {
      nameEn: 'VIP Updated',
      version: 2,
    });
    expect(mockGet).toHaveBeenNthCalledWith(
      3,
      '/api/v1/configuration-entity/membership-classes/class-1/types',
      undefined,
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      4,
      '/api/v1/configuration-entity/membership-types/type-1/levels',
      undefined,
    );
    expect(mockGet).toHaveBeenNthCalledWith(5, '/api/v1/configuration-entity/membership-tree', {
      scopeType: 'talent',
      scopeId: 'talent-1',
      includeInactive: false,
    });
    expect('delete' in configurationEntityApi).toBe(false);
  });
});

describe('settings and admin config web API contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses PATCH for hierarchical settings mutations while keeping canonical owner paths', async () => {
    mockGet.mockResolvedValue({ success: true, data: {} });
    mockPatch.mockResolvedValue({ success: true, data: {} });

    await settingsApi.getTenantSettings();
    await settingsApi.updateTenantSettings({ defaultLanguage: 'ja' }, 2);
    await settingsApi.getSubsidiarySettings('subsidiary-1');
    await settingsApi.updateSubsidiarySettings('subsidiary-1', { timezone: 'Asia/Tokyo' }, 3);
    await settingsApi.resetSubsidiarySetting('subsidiary-1', 'timezone');
    await settingsApi.getTalentSettings('talent-1');
    await settingsApi.updateTalentSettings('talent-1', { homepageEnabled: true }, 4);
    await settingsApi.resetTalentSetting('talent-1', 'homepageEnabled');

    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/organization/settings');
    expect(mockPatch).toHaveBeenNthCalledWith(1, '/api/v1/organization/settings', {
      settings: { defaultLanguage: 'ja' },
      version: 2,
    });
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v1/subsidiaries/subsidiary-1/settings');
    expect(mockPatch).toHaveBeenNthCalledWith(2, '/api/v1/subsidiaries/subsidiary-1/settings', {
      settings: { timezone: 'Asia/Tokyo' },
      version: 3,
    });
    expect(mockPatch).toHaveBeenNthCalledWith(
      3,
      '/api/v1/subsidiaries/subsidiary-1/settings/reset',
      { field: 'timezone' },
    );
    expect(mockGet).toHaveBeenNthCalledWith(3, '/api/v1/talents/talent-1/settings');
    expect(mockPatch).toHaveBeenNthCalledWith(4, '/api/v1/talents/talent-1/settings', {
      settings: { homepageEnabled: true },
      version: 4,
    });
    expect(mockPatch).toHaveBeenNthCalledWith(5, '/api/v1/talents/talent-1/settings/reset', {
      field: 'homepageEnabled',
    });
  });

  it('uses PATCH for platform config and email config writes', async () => {
    mockGet.mockResolvedValue({ success: true, data: {} });
    mockPatch.mockResolvedValue({ success: true, data: {} });
    mockPost.mockResolvedValue({ success: true, data: {} });

    await platformConfigApi.get('featureFlag');
    await platformConfigApi.set('featureFlag', { enabled: true });
    await emailConfigApi.get();
    await emailConfigApi.save({
      provider: 'smtp',
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        username: 'user',
        password: 'secret',
        fromAddress: 'noreply@example.com',
        fromName: 'TCRN',
      },
    });
    await emailConfigApi.testConnection();
    await emailConfigApi.test('ops@example.com');

    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/platform/config/featureFlag');
    expect(mockPatch).toHaveBeenNthCalledWith(1, '/api/v1/platform/config/featureFlag', {
      value: { enabled: true },
    });
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v1/email/config');
    expect(mockPatch).toHaveBeenNthCalledWith(2, '/api/v1/email/config', {
      provider: 'smtp',
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        username: 'user',
        password: 'secret',
        fromAddress: 'noreply@example.com',
        fromName: 'TCRN',
      },
    });
    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/email/config/test-connection', {});
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/v1/email/config/test', {
      testEmail: 'ops@example.com',
    });
  });

  it('uses PATCH for dictionary updates while keeping deactivate/reactivate commands unchanged', async () => {
    mockPost.mockResolvedValue({ success: true, data: {} });
    mockPatch.mockResolvedValue({ success: true, data: {} });
    mockDelete.mockResolvedValue({ success: true, data: {} });

    await dictionaryApi.createType({
      code: 'CUSTOMER_STATUS',
      nameEn: 'Customer Status',
    });
    await dictionaryApi.updateType('CUSTOMER_STATUS', {
      nameEn: 'Customer Status Updated',
      version: 2,
    });
    await dictionaryApi.createItem('CUSTOMER_STATUS', {
      code: 'ACTIVE',
      nameEn: 'Active',
    });
    await dictionaryApi.updateItem('CUSTOMER_STATUS', 'item-1', {
      nameEn: 'Active Updated',
      version: 3,
    });
    await dictionaryApi.deactivateItem('CUSTOMER_STATUS', 'item-1', 4);
    await dictionaryApi.reactivateItem('CUSTOMER_STATUS', 'item-1', 5);

    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/v1/system-dictionary', {
      code: 'CUSTOMER_STATUS',
      nameEn: 'Customer Status',
    });
    expect(mockPatch).toHaveBeenNthCalledWith(1, '/api/v1/system-dictionary/CUSTOMER_STATUS', {
      nameEn: 'Customer Status Updated',
      version: 2,
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/v1/system-dictionary/CUSTOMER_STATUS/items', {
      code: 'ACTIVE',
      nameEn: 'Active',
    });
    expect(mockPatch).toHaveBeenNthCalledWith(
      2,
      '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1',
      {
        nameEn: 'Active Updated',
        version: 3,
      },
    );
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1');
    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/api/v1/system-dictionary/CUSTOMER_STATUS/items/item-1/reactivate',
      { version: 5 },
    );
  });
});
