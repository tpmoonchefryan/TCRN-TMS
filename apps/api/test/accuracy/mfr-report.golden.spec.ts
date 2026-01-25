// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// MFR Report Golden File Tests - Data Accuracy Verification

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface MfrTestCase {
  id: string;
  description: string;
  input: {
    customers: Array<{
      id: string;
      nickname: string;
      status: string;
    }>;
    memberships: Array<{
      customerId: string;
      platformCode: string;
      membershipClassCode: string;
      membershipLevelCode: string;
      validFrom: string;
      validTo: string | null;
      isActive: boolean;
    }>;
    filters?: {
      platformCodes?: string[];
      membershipClassCodes?: string[];
      includeExpired?: boolean;
      validFromStart?: string;
      validFromEnd?: string;
    };
  };
  expectedOutput: {
    totalCount: number;
    rows: Array<{
      nickname: string;
      platformName: string;
      membershipClassName: string;
      membershipLevelName: string;
      status: string;
      validFrom: string;
      validTo: string | null;
    }>;
  };
}

interface GoldenFile {
  metadata: {
    version: string;
    generatedAt: string;
    description: string;
  };
  testCases: MfrTestCase[];
}

// Simulated report generation logic (mirrors actual service logic)
function generateMfrReport(
  customers: MfrTestCase['input']['customers'],
  memberships: MfrTestCase['input']['memberships'],
  filters: MfrTestCase['input']['filters'] = {}
) {
  // Platform name mapping
  const platformNames: Record<string, string> = {
    YOUTUBE: 'YouTube',
    BILIBILI: 'Bilibili',
    TWITCH: 'Twitch',
    NICONICO: 'Niconico',
  };

  // Membership class name mapping
  const classNames: Record<string, string> = {
    SUBSCRIPTION: 'Subscription',
    FANCLUB: 'Fan Club',
    VIP: 'VIP',
    SPONSORSHIP: 'Sponsorship',
  };

  // Membership level name mapping
  const levelNames: Record<string, string> = {
    BRONZE: 'Bronze',
    SILVER: 'Silver',
    GOLD: 'Gold',
    PLATINUM: 'Platinum',
  };

  // Create customer lookup
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  // Filter memberships
  let filteredMemberships = memberships.filter((m) => {
    // Expired filter
    if (!filters.includeExpired && !m.isActive) {
      return false;
    }

    // Platform filter
    if (filters.platformCodes && filters.platformCodes.length > 0) {
      if (!filters.platformCodes.includes(m.platformCode)) {
        return false;
      }
    }

    // Membership class filter
    if (filters.membershipClassCodes && filters.membershipClassCodes.length > 0) {
      if (!filters.membershipClassCodes.includes(m.membershipClassCode)) {
        return false;
      }
    }

    // Date range filter - validFrom
    if (filters.validFromStart) {
      if (m.validFrom < filters.validFromStart) {
        return false;
      }
    }
    if (filters.validFromEnd) {
      if (m.validFrom > filters.validFromEnd) {
        return false;
      }
    }

    return true;
  });

  // Generate rows
  const rows = filteredMemberships.map((m) => {
    const customer = customerMap.get(m.customerId);
    return {
      nickname: customer?.nickname || 'Unknown',
      platformName: platformNames[m.platformCode] || m.platformCode,
      membershipClassName: classNames[m.membershipClassCode] || m.membershipClassCode,
      membershipLevelName: levelNames[m.membershipLevelCode] || m.membershipLevelCode,
      status: m.isActive ? 'Active' : 'Expired',
      validFrom: m.validFrom,
      validTo: m.validTo,
    };
  });

  return {
    totalCount: rows.length,
    rows,
  };
}

describe('MFR Report Golden File Tests', () => {
  let goldenFile: GoldenFile;

  beforeAll(() => {
    const filePath = path.join(__dirname, '../golden-files/mfr-report-sample.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    goldenFile = JSON.parse(fileContent);
  });

  it('should load golden file successfully', () => {
    expect(goldenFile).toBeDefined();
    expect(goldenFile.metadata).toBeDefined();
    expect(goldenFile.testCases).toBeInstanceOf(Array);
    expect(goldenFile.testCases.length).toBeGreaterThan(0);
  });

  describe('Golden File Test Cases', () => {
    it('mfr-001: Single active membership', () => {
      const testCase = goldenFile.testCases.find((t) => t.id === 'mfr-001');
      expect(testCase).toBeDefined();

      const result = generateMfrReport(
        testCase!.input.customers,
        testCase!.input.memberships,
        testCase!.input.filters
      );

      expect(result.totalCount).toBe(testCase!.expectedOutput.totalCount);
      expect(result.rows.length).toBe(testCase!.expectedOutput.rows.length);

      if (result.rows.length > 0) {
        expect(result.rows[0].nickname).toBe(testCase!.expectedOutput.rows[0].nickname);
        expect(result.rows[0].platformName).toBe(testCase!.expectedOutput.rows[0].platformName);
        expect(result.rows[0].membershipLevelName).toBe(
          testCase!.expectedOutput.rows[0].membershipLevelName
        );
      }
    });

    it('mfr-002: Multiple memberships same customer', () => {
      const testCase = goldenFile.testCases.find((t) => t.id === 'mfr-002');
      expect(testCase).toBeDefined();

      const result = generateMfrReport(
        testCase!.input.customers,
        testCase!.input.memberships,
        testCase!.input.filters
      );

      expect(result.totalCount).toBe(testCase!.expectedOutput.totalCount);
      expect(result.rows.length).toBe(2);

      // Verify both rows are present
      const nicknames = result.rows.map((r) => r.nickname);
      expect(nicknames.every((n) => n === 'Multi Member')).toBe(true);

      const platforms = result.rows.map((r) => r.platformName);
      expect(platforms).toContain('YouTube');
      expect(platforms).toContain('Bilibili');
    });

    it('mfr-003: Expired membership filtering', () => {
      const testCase = goldenFile.testCases.find((t) => t.id === 'mfr-003');
      expect(testCase).toBeDefined();

      const result = generateMfrReport(
        testCase!.input.customers,
        testCase!.input.memberships,
        testCase!.input.filters
      );

      // With includeExpired: false, expired memberships should be excluded
      expect(result.totalCount).toBe(0);
      expect(result.rows.length).toBe(0);
    });

    it('mfr-004: Platform filter', () => {
      const testCase = goldenFile.testCases.find((t) => t.id === 'mfr-004');
      expect(testCase).toBeDefined();

      const result = generateMfrReport(
        testCase!.input.customers,
        testCase!.input.memberships,
        testCase!.input.filters
      );

      // Only YouTube memberships should be included
      expect(result.totalCount).toBe(1);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].platformName).toBe('YouTube');
    });

    it('mfr-005: Date range filter', () => {
      const testCase = goldenFile.testCases.find((t) => t.id === 'mfr-005');
      expect(testCase).toBeDefined();

      const result = generateMfrReport(
        testCase!.input.customers,
        testCase!.input.memberships,
        testCase!.input.filters
      );

      // Only membership starting in January 2026 should be included
      expect(result.totalCount).toBe(1);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].validFrom).toBe('2026-01-15');
    });
  });

  describe('Data Accuracy Invariants', () => {
    it('should never show expired memberships when includeExpired is false', () => {
      goldenFile.testCases.forEach((testCase) => {
        if (testCase.input.filters?.includeExpired === false) {
          const result = generateMfrReport(
            testCase.input.customers,
            testCase.input.memberships,
            testCase.input.filters
          );

          result.rows.forEach((row) => {
            expect(row.status).not.toBe('Expired');
          });
        }
      });
    });

    it('should respect platform filter strictly', () => {
      goldenFile.testCases.forEach((testCase) => {
        const filters = testCase.input.filters;
        if (filters?.platformCodes && filters.platformCodes.length > 0) {
          const result = generateMfrReport(
            testCase.input.customers,
            testCase.input.memberships,
            filters
          );

          const expectedPlatforms = filters.platformCodes.map((code) => {
            const mapping: Record<string, string> = {
              YOUTUBE: 'YouTube',
              BILIBILI: 'Bilibili',
              TWITCH: 'Twitch',
            };
            return mapping[code] || code;
          });

          result.rows.forEach((row) => {
            expect(expectedPlatforms).toContain(row.platformName);
          });
        }
      });
    });

    it('should maintain row count consistency', () => {
      goldenFile.testCases.forEach((testCase) => {
        const result = generateMfrReport(
          testCase.input.customers,
          testCase.input.memberships,
          testCase.input.filters
        );

        // totalCount should always match rows.length
        expect(result.totalCount).toBe(result.rows.length);
      });
    });
  });
});

describe('MFR Report Edge Cases', () => {
  it('should handle empty customer list', () => {
    const result = generateMfrReport([], [], {});
    expect(result.totalCount).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it('should handle customers with no memberships', () => {
    const customers = [{ id: 'c1', nickname: 'No Membership User', status: 'active' }];
    const result = generateMfrReport(customers, [], {});
    expect(result.totalCount).toBe(0);
  });

  it('should handle unknown platform codes gracefully', () => {
    const customers = [{ id: 'c1', nickname: 'Test', status: 'active' }];
    const memberships = [
      {
        customerId: 'c1',
        platformCode: 'UNKNOWN_PLATFORM',
        membershipClassCode: 'SUBSCRIPTION',
        membershipLevelCode: 'GOLD',
        validFrom: '2026-01-01',
        validTo: null,
        isActive: true,
      },
    ];

    const result = generateMfrReport(customers, memberships, {});
    expect(result.rows[0].platformName).toBe('UNKNOWN_PLATFORM');
  });

  it('should handle null validTo dates correctly', () => {
    const customers = [{ id: 'c1', nickname: 'Test', status: 'active' }];
    const memberships = [
      {
        customerId: 'c1',
        platformCode: 'YOUTUBE',
        membershipClassCode: 'SUBSCRIPTION',
        membershipLevelCode: 'GOLD',
        validFrom: '2026-01-01',
        validTo: null,
        isActive: true,
      },
    ];

    const result = generateMfrReport(customers, memberships, {});
    expect(result.rows[0].validTo).toBeNull();
  });
});
