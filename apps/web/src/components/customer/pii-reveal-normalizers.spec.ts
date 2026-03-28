// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import {
  getInitialPiiData,
  getPiiAddresses,
  getPiiBirthDate,
  getPiiEmails,
  getPiiFullName,
  getPiiPhones,
  getSearchHintName,
  getSearchHintPhoneLast4,
  type PiiRevealData,
} from '@/components/customer/pii-reveal-normalizers';

describe('pii reveal normalizers', () => {
  it('reads legacy snake_case customer hints and cached pii data', () => {
    const customer = {
      id: 'customer-1',
      individual: {
        search_hint_name: '张*三',
        search_hint_phone_last4: '5678',
        pii_data: {
          family_name: '张',
          given_name: '三',
        },
      },
    };

    expect(getSearchHintName(customer)).toBe('张*三');
    expect(getSearchHintPhoneLast4(customer)).toBe('5678');
    expect(getInitialPiiData(customer)).toEqual(customer.individual.pii_data);
  });

  it('normalizes legacy snake_case pii payloads', () => {
    const piiData: PiiRevealData = {
      family_name: '张',
      given_name: '三',
      birth_date: '2000-01-01',
      phone_numbers: [{ type_code: 'MOBILE', number: '123', is_primary: true }],
      emails: [{ type_code: 'PERSONAL', address: 'a@example.com', is_primary: true }],
      addresses: [
        {
          type_code: 'HOME',
          country_code: 'CN',
          province: 'Shanghai',
          city: 'Shanghai',
          street: 'Road 1',
          postal_code: '200000',
          is_primary: true,
        },
      ],
    };

    expect(getPiiFullName(piiData)).toBe('张 三');
    expect(getPiiBirthDate(piiData)).toBe('2000-01-01');
    expect(getPiiPhones(piiData)).toEqual([
      { typeCode: 'MOBILE', number: '123', isPrimary: true },
    ]);
    expect(getPiiEmails(piiData)).toEqual([
      { typeCode: 'PERSONAL', address: 'a@example.com', isPrimary: true },
    ]);
    expect(getPiiAddresses(piiData)[0]).toMatchObject({
      typeCode: 'HOME',
      countryCode: 'CN',
      postalCode: '200000',
      isPrimary: true,
    });
  });

  it('normalizes current camelCase pii profiles', () => {
    const profile = {
      id: 'profile-1',
      familyName: 'Doe',
      givenName: 'Jane',
      birthDate: '1999-12-31',
      phoneNumbers: [{ typeCode: 'mobile', number: '456', isPrimary: true }],
      emails: [{ typeCode: 'personal', address: 'jane@example.com', isPrimary: true }],
      addresses: [
        {
          typeCode: 'HOME',
          countryCode: 'US',
          city: 'LA',
          street: 'Main St',
          postalCode: '90001',
        },
      ],
    };

    expect(getPiiFullName(profile)).toBe('Doe Jane');
    expect(getPiiBirthDate(profile)).toBe('1999-12-31');
    expect(getPiiPhones(profile)).toEqual([
      { typeCode: 'mobile', number: '456', isPrimary: true },
    ]);
    expect(getPiiEmails(profile)).toEqual([
      { typeCode: 'personal', address: 'jane@example.com', isPrimary: true },
    ]);
    expect(getPiiAddresses(profile)[0]).toMatchObject({
      typeCode: 'HOME',
      countryCode: 'US',
      city: 'LA',
      street: 'Main St',
      postalCode: '90001',
      isPrimary: false,
    });
  });
});
