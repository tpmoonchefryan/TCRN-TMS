// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { type PiiData } from '@tcrn/shared';

import type { PiiProfile } from '@/lib/pii';

export interface PiiRevealCustomer {
  id: string;
  individual?: {
    rmProfileId?: string;
    piiLoaded?: boolean;
    piiData?: PiiData | PiiProfile | null;
    pii_data?: PiiData | null;
    searchHintName?: string | null;
    search_hint_name?: string | null;
    searchHintPhoneLast4?: string | null;
    search_hint_phone_last4?: string | null;
  } | null;
}

export type PiiRevealData = PiiData | PiiProfile;

export interface NormalizedPiiPhone {
  typeCode: string | null;
  number: string;
  isPrimary: boolean;
}

export interface NormalizedPiiEmail {
  typeCode: string | null;
  address: string;
  isPrimary: boolean;
}

export interface NormalizedPiiAddress {
  typeCode: string | null;
  countryCode: string;
  province: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  postalCode: string | null;
  isPrimary: boolean;
}

const isLegacyPiiData = (piiData: PiiRevealData): piiData is PiiData =>
  'given_name' in piiData ||
  'family_name' in piiData ||
  'birth_date' in piiData ||
  'phone_numbers' in piiData;

export const getInitialPiiData = (customer: PiiRevealCustomer): PiiRevealData | null =>
  customer.individual?.piiData ?? customer.individual?.pii_data ?? null;

export const getSearchHintName = (customer: PiiRevealCustomer): string | null =>
  customer.individual?.searchHintName ?? customer.individual?.search_hint_name ?? null;

export const getSearchHintPhoneLast4 = (customer: PiiRevealCustomer): string | null =>
  customer.individual?.searchHintPhoneLast4 ?? customer.individual?.search_hint_phone_last4 ?? null;

export const getPiiFullName = (piiData: PiiRevealData): string =>
  isLegacyPiiData(piiData)
    ? [piiData.family_name, piiData.given_name].filter(Boolean).join(' ')
    : [piiData.familyName, piiData.givenName].filter(Boolean).join(' ');

export const getPiiBirthDate = (piiData: PiiRevealData): string | null =>
  isLegacyPiiData(piiData) ? piiData.birth_date ?? null : piiData.birthDate ?? null;

export const getPiiPhones = (piiData: PiiRevealData): NormalizedPiiPhone[] => {
  if (isLegacyPiiData(piiData)) {
    return (piiData.phone_numbers ?? []).map((phone) => ({
      typeCode: phone.type_code ?? null,
      number: phone.number,
      isPrimary: Boolean(phone.is_primary),
    }));
  }

  return (piiData.phoneNumbers ?? []).map((phone) => ({
    typeCode: phone.typeCode ?? null,
    number: phone.number,
    isPrimary: Boolean(phone.isPrimary),
  }));
};

export const getPiiEmails = (piiData: PiiRevealData): NormalizedPiiEmail[] => {
  if (isLegacyPiiData(piiData)) {
    return (piiData.emails ?? []).map((email) => ({
      typeCode: email.type_code ?? null,
      address: email.address,
      isPrimary: Boolean(email.is_primary),
    }));
  }

  return (piiData.emails ?? []).map((email) => ({
    typeCode: email.typeCode ?? null,
    address: email.address,
    isPrimary: Boolean(email.isPrimary),
  }));
};

export const getPiiAddresses = (piiData: PiiRevealData): NormalizedPiiAddress[] => {
  if (isLegacyPiiData(piiData)) {
    return (piiData.addresses ?? []).map((address) => ({
      typeCode: address.type_code ?? null,
      countryCode: address.country_code,
      province: address.province ?? null,
      city: address.city ?? null,
      district: address.district ?? null,
      street: address.street ?? null,
      postalCode: address.postal_code ?? null,
      isPrimary: Boolean(address.is_primary),
    }));
  }

  return (piiData.addresses ?? []).map((address) => ({
    typeCode: address.typeCode ?? null,
    countryCode: address.countryCode,
    province: address.province ?? null,
    city: address.city ?? null,
    district: address.district ?? null,
    street: address.street ?? null,
    postalCode: address.postalCode ?? null,
    isPrimary: Boolean(address.isPrimary),
  }));
};
