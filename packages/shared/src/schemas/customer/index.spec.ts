import { describe, expect, it } from 'vitest';

import {
  CreateCompanyCustomerSchema,
  CreateIndividualCustomerSchema,
  UpdateCompanyCustomerSchema,
  UpdateIndividualCustomerSchema,
} from './index';

const talentId = '550e8400-e29b-41d4-a716-446655440001';

describe('customer primary language schema', () => {
  it('accepts supported UI locale tags for customer primaryLanguage', () => {
    expect(
      CreateIndividualCustomerSchema.parse({
        talentId,
        nickname: 'Aki fan',
        primaryLanguage: 'zh_HANS',
      }).primaryLanguage
    ).toBe('zh_HANS');
    expect(
      CreateCompanyCustomerSchema.parse({
        talentId,
        nickname: 'Aki Corp',
        companyLegalName: 'Aki Corporation',
        primaryLanguage: 'zh_HANT',
      }).primaryLanguage
    ).toBe('zh_HANT');
    expect(
      UpdateIndividualCustomerSchema.parse({
        version: 1,
        primaryLanguage: 'ko',
      }).primaryLanguage
    ).toBe('ko');
    expect(
      UpdateCompanyCustomerSchema.parse({
        version: 1,
        primaryLanguage: 'fr',
      }).primaryLanguage
    ).toBe('fr');
  });

  it('rejects the legacy aggregate Chinese language code', () => {
    expect(() =>
      CreateIndividualCustomerSchema.parse({
        talentId,
        nickname: 'Aki fan',
        primaryLanguage: 'zh',
      })
    ).toThrow();
  });
});
