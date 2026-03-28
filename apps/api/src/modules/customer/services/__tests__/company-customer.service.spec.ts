// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { ChangeLogService } from '../../../log';
import { CompanyCustomerService } from '../company-customer.service';

describe('CompanyCustomerService', () => {
  let service: CompanyCustomerService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockChangeLogService: Partial<ChangeLogService>;
  let mockPrisma: {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockTx: {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
  };

  const mockContext = {
    tenantId: 'tenant-123',
    tenantSchema: 'tenant_test',
    userId: 'user-123',
    userName: 'Test User',
    requestId: 'req-123',
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTx = {
      $queryRawUnsafe: vi.fn(),
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      $queryRawUnsafe: vi.fn(),
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
      $transaction: vi.fn().mockImplementation(async (callback: (tx: typeof mockTx) => unknown) =>
        callback(mockTx)),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    mockChangeLogService = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    service = new CompanyCustomerService(
      mockDatabaseService as DatabaseService,
      mockChangeLogService as ChangeLogService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists contact fields when creating a company customer', async () => {
    const createdAt = new Date('2026-03-29T00:00:00.000Z');

    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      { id: 'talent-123', profileStoreId: 'store-123' },
    ]);
    mockTx.$queryRawUnsafe.mockResolvedValueOnce([
      { id: 'company-123', nickname: 'Acme', createdAt },
    ]);

    await service.create(
      {
        talentId: 'talent-123',
        nickname: 'Acme',
        companyLegalName: 'Acme Corporation',
        website: 'https://acme.example.com',
        contactName: 'Alice',
        contactPhone: '+1-555-0100',
        contactEmail: 'alice@acme.example.com',
        contactDepartment: 'Partnerships',
      },
      mockContext as never,
    );

    const companyInsertCall = mockTx.$executeRawUnsafe.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO "tenant_test".customer_company_info'),
    );

    expect(companyInsertCall).toBeDefined();
    expect(String(companyInsertCall?.[0])).toContain('contact_name');
    expect(companyInsertCall?.slice(1)).toEqual([
      'company-123',
      'Acme Corporation',
      null,
      null,
      null,
      null,
      null,
      'https://acme.example.com',
      'Alice',
      '+1-555-0100',
      'alice@acme.example.com',
      'Partnerships',
    ]);
  });

  it('updates contact fields when editing a company customer', async () => {
    const verifyAccessSpy = vi.spyOn(
      service as unknown as {
        verifyAccess: (...args: unknown[]) => Promise<unknown>;
      },
      'verifyAccess',
    );
    verifyAccessSpy.mockResolvedValue({
      id: 'company-123',
      profileStoreId: 'store-123',
      nickname: 'Acme',
      version: 1,
      primaryLanguage: 'en',
      statusId: null,
      tags: [],
      notes: null,
    });

    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        id: 'company-123',
        nickname: 'Acme',
        version: 2,
        updatedAt: new Date('2026-03-29T00:05:00.000Z'),
      },
    ]);
    mockPrisma.$executeRawUnsafe
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(undefined);

    await service.update(
      'company-123',
      'talent-123',
      {
        version: 1,
        contactName: 'Alice',
        contactPhone: '+1-555-0100',
        contactEmail: 'alice@acme.example.com',
        contactDepartment: 'Partnerships',
      },
      mockContext as never,
    );

    const companyUpdateCall = mockPrisma.$executeRawUnsafe.mock.calls.find(([sql]) =>
      String(sql).includes('UPDATE "tenant_test".customer_company_info'),
    );

    expect(companyUpdateCall).toBeDefined();
    expect(String(companyUpdateCall?.[0])).toContain('contact_name');
    expect(companyUpdateCall?.slice(1)).toEqual([
      'Alice',
      '+1-555-0100',
      'alice@acme.example.com',
      'Partnerships',
      'company-123',
    ]);
  });
});
