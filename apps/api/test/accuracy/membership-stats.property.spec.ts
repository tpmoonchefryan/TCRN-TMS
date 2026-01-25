// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Membership Statistics Property-Based Tests

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ============================================================================
// Types
// ============================================================================

interface Membership {
  id: string;
  customerId: string;
  platformCode: string;
  levelCode: string;
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
}

interface Customer {
  id: string;
  nickname: string;
  status: 'active' | 'inactive';
}

interface MembershipStats {
  totalActive: number;
  totalExpired: number;
  byPlatform: Record<string, number>;
  byLevel: Record<string, number>;
}

// ============================================================================
// Test Subject Functions
// ============================================================================

function calculateMembershipStats(memberships: Membership[]): MembershipStats {
  const stats: MembershipStats = {
    totalActive: 0,
    totalExpired: 0,
    byPlatform: {},
    byLevel: {},
  };

  for (const m of memberships) {
    if (m.isActive) {
      stats.totalActive++;
    } else {
      stats.totalExpired++;
    }

    stats.byPlatform[m.platformCode] = (stats.byPlatform[m.platformCode] || 0) + 1;
    stats.byLevel[m.levelCode] = (stats.byLevel[m.levelCode] || 0) + 1;
  }

  return stats;
}

function filterMembershipsByDateRange(
  memberships: Membership[],
  startDate: Date | null,
  endDate: Date | null
): Membership[] {
  return memberships.filter((m) => {
    if (startDate && m.validFrom < startDate) {
      return false;
    }
    if (endDate && m.validFrom > endDate) {
      return false;
    }
    return true;
  });
}

function getHighestMembershipLevel(memberships: Membership[]): string | null {
  const levelRanks: Record<string, number> = {
    PLATINUM: 1,
    GOLD: 2,
    SILVER: 3,
    BRONZE: 4,
  };

  let highest: string | null = null;
  let highestRank = Infinity;

  for (const m of memberships) {
    if (!m.isActive) continue;
    const rank = levelRanks[m.levelCode] ?? 999;
    if (rank < highestRank) {
      highestRank = rank;
      highest = m.levelCode;
    }
  }

  return highest;
}

// ============================================================================
// Arbitraries (Data Generators)
// ============================================================================

const platformCodeArb = fc.constantFrom('YOUTUBE', 'BILIBILI', 'TWITCH', 'NICONICO');
const levelCodeArb = fc.constantFrom('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2027-12-31') });

const membershipArb: fc.Arbitrary<Membership> = fc.record({
  id: fc.uuid(),
  customerId: fc.uuid(),
  platformCode: platformCodeArb,
  levelCode: levelCodeArb,
  validFrom: dateArb,
  validTo: fc.option(dateArb, { nil: null }),
  isActive: fc.boolean(),
});

const customerArb: fc.Arbitrary<Customer> = fc.record({
  id: fc.uuid(),
  nickname: fc.string({ minLength: 1, maxLength: 50 }),
  status: fc.constantFrom('active' as const, 'inactive' as const),
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Membership Statistics Properties', () => {
  describe('calculateMembershipStats', () => {
    it('should satisfy: totalActive + totalExpired = total memberships', () => {
      fc.assert(
        fc.property(fc.array(membershipArb, { maxLength: 100 }), (memberships) => {
          const stats = calculateMembershipStats(memberships);
          expect(stats.totalActive + stats.totalExpired).toBe(memberships.length);
        }),
        { numRuns: 100 }
      );
    });

    it('should satisfy: sum of byPlatform = total memberships', () => {
      fc.assert(
        fc.property(fc.array(membershipArb, { maxLength: 100 }), (memberships) => {
          const stats = calculateMembershipStats(memberships);
          const platformSum = Object.values(stats.byPlatform).reduce((a, b) => a + b, 0);
          expect(platformSum).toBe(memberships.length);
        }),
        { numRuns: 100 }
      );
    });

    it('should satisfy: sum of byLevel = total memberships', () => {
      fc.assert(
        fc.property(fc.array(membershipArb, { maxLength: 100 }), (memberships) => {
          const stats = calculateMembershipStats(memberships);
          const levelSum = Object.values(stats.byLevel).reduce((a, b) => a + b, 0);
          expect(levelSum).toBe(memberships.length);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle empty array', () => {
      const stats = calculateMembershipStats([]);
      expect(stats.totalActive).toBe(0);
      expect(stats.totalExpired).toBe(0);
      expect(Object.keys(stats.byPlatform)).toHaveLength(0);
      expect(Object.keys(stats.byLevel)).toHaveLength(0);
    });

    it('should never have negative counts', () => {
      fc.assert(
        fc.property(fc.array(membershipArb, { maxLength: 100 }), (memberships) => {
          const stats = calculateMembershipStats(memberships);
          expect(stats.totalActive).toBeGreaterThanOrEqual(0);
          expect(stats.totalExpired).toBeGreaterThanOrEqual(0);
          Object.values(stats.byPlatform).forEach((count) => {
            expect(count).toBeGreaterThan(0);
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('filterMembershipsByDateRange', () => {
    it('should return subset of original when filtering', () => {
      fc.assert(
        fc.property(
          fc.array(membershipArb, { maxLength: 50 }),
          fc.option(dateArb, { nil: null }),
          fc.option(dateArb, { nil: null }),
          (memberships, startDate, endDate) => {
            const filtered = filterMembershipsByDateRange(memberships, startDate, endDate);
            expect(filtered.length).toBeLessThanOrEqual(memberships.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all when no date constraints', () => {
      fc.assert(
        fc.property(fc.array(membershipArb, { maxLength: 50 }), (memberships) => {
          const filtered = filterMembershipsByDateRange(memberships, null, null);
          expect(filtered.length).toBe(memberships.length);
        }),
        { numRuns: 50 }
      );
    });

    it('should respect start date constraint', () => {
      fc.assert(
        fc.property(fc.array(membershipArb, { maxLength: 50 }), dateArb, (memberships, startDate) => {
          const filtered = filterMembershipsByDateRange(memberships, startDate, null);
          filtered.forEach((m) => {
            expect(m.validFrom >= startDate).toBe(true);
          });
        }),
        { numRuns: 50 }
      );
    });

    it('should respect end date constraint', () => {
      fc.assert(
        fc.property(fc.array(membershipArb, { maxLength: 50 }), dateArb, (memberships, endDate) => {
          const filtered = filterMembershipsByDateRange(memberships, null, endDate);
          filtered.forEach((m) => {
            expect(m.validFrom <= endDate).toBe(true);
          });
        }),
        { numRuns: 50 }
      );
    });

    it('should return empty when start > end with strict range', () => {
      // When startDate > endDate, the filter should return empty
      // because no validFrom can satisfy: validFrom >= startDate AND validFrom <= endDate
      const memberships: Membership[] = [
        {
          id: 'test-1',
          customerId: 'cust-1',
          platformCode: 'YOUTUBE',
          levelCode: 'GOLD',
          validFrom: new Date('2025-06-15'),
          validTo: null,
          isActive: true,
        },
      ];
      
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2025-01-01'); // Before start
      
      const filtered = filterMembershipsByDateRange(memberships, startDate, endDate);
      expect(filtered.length).toBe(0);
    });
  });

  describe('getHighestMembershipLevel', () => {
    it('should return null for empty array', () => {
      const result = getHighestMembershipLevel([]);
      expect(result).toBeNull();
    });

    it('should return null when no active memberships', () => {
      fc.assert(
        fc.property(
          fc.array(membershipArb.map((m) => ({ ...m, isActive: false })), { minLength: 1, maxLength: 20 }),
          (memberships) => {
            const result = getHighestMembershipLevel(memberships);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should always return PLATINUM when present and active', () => {
      fc.assert(
        fc.property(
          fc.array(membershipArb, { minLength: 0, maxLength: 20 }),
          fc.uuid(),
          (memberships, customerId) => {
            const withPlatinum = [
              ...memberships,
              {
                id: fc.sample(fc.uuid())[0],
                customerId,
                platformCode: 'YOUTUBE',
                levelCode: 'PLATINUM',
                validFrom: new Date(),
                validTo: null,
                isActive: true,
              },
            ];
            const result = getHighestMembershipLevel(withPlatinum);
            expect(result).toBe('PLATINUM');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should respect level hierarchy', () => {
      const hierarchy = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];
      
      for (let i = 0; i < hierarchy.length; i++) {
        const lowerLevels = hierarchy.slice(i);
        const memberships: Membership[] = lowerLevels.map((level, idx) => ({
          id: `id-${idx}`,
          customerId: 'cust-1',
          platformCode: 'YOUTUBE',
          levelCode: level,
          validFrom: new Date(),
          validTo: null,
          isActive: true,
        }));

        const result = getHighestMembershipLevel(memberships);
        expect(result).toBe(hierarchy[i]);
      }
    });
  });
});

describe('Cross-Property Invariants', () => {
  it('filtering should not change stats proportions significantly', () => {
    fc.assert(
      fc.property(
        fc.array(membershipArb, { minLength: 10, maxLength: 50 }),
        (memberships) => {
          const fullStats = calculateMembershipStats(memberships);
          
          // Filter to only active
          const activeMemberships = memberships.filter((m) => m.isActive);
          const activeStats = calculateMembershipStats(activeMemberships);

          // Active count should match
          expect(activeStats.totalActive).toBe(fullStats.totalActive);
          expect(activeStats.totalExpired).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});
