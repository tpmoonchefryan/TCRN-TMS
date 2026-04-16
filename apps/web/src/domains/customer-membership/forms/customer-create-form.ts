// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { z } from 'zod';

import type {
  CompanyCreateData,
  CompanyPiiData,
  CustomerCreateData,
} from '@/lib/api/modules/customer';

const requiredText = z.string().trim().min(1, 'Required');
const optionalText = z.string().trim();
const optionalEmail = z.union([z.literal(''), z.string().trim().email('Invalid email address')]);
const optionalWebsite = z.union([z.literal(''), z.string().trim().url('Invalid website URL')]);

export const individualCustomerCreateFormSchema = z.object({
  nickname: requiredText,
  statusCode: requiredText,
  tags: optionalText,
  notes: optionalText,
  givenName: optionalText,
  familyName: optionalText,
  phoneNumber: optionalText,
  email: optionalEmail,
});

export const companyCustomerCreateFormSchema = z.object({
  nickname: requiredText,
  statusCode: requiredText,
  tags: optionalText,
  notes: optionalText,
  companyLegalName: requiredText,
  companyShortName: optionalText,
  registrationNumber: optionalText,
  website: optionalWebsite,
  contactName: optionalText,
  contactPhone: optionalText,
  contactEmail: optionalEmail,
});

export type IndividualCustomerCreateFormValues = z.output<
  typeof individualCustomerCreateFormSchema
>;
export type CompanyCustomerCreateFormValues = z.output<typeof companyCustomerCreateFormSchema>;

export const individualCustomerCreateDefaults: IndividualCustomerCreateFormValues = {
  nickname: '',
  statusCode: 'NEW',
  tags: '',
  notes: '',
  givenName: '',
  familyName: '',
  phoneNumber: '',
  email: '',
};

export const companyCustomerCreateDefaults: CompanyCustomerCreateFormValues = {
  nickname: '',
  statusCode: 'NEW',
  tags: '',
  notes: '',
  companyLegalName: '',
  companyShortName: '',
  registrationNumber: '',
  website: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
};

function toOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalTagList(value: string): string[] | undefined {
  const tags = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return tags.length > 0 ? tags : undefined;
}

export function mapIndividualCustomerCreatePayload(
  values: IndividualCustomerCreateFormValues,
  talentId: string,
  options?: { piiEnabled?: boolean },
): CustomerCreateData {
  const pii = options?.piiEnabled === false
    ? undefined
    : {
        givenName: toOptionalString(values.givenName),
        familyName: toOptionalString(values.familyName),
        phoneNumbers: toOptionalString(values.phoneNumber)
          ? [{ typeCode: 'mobile', number: values.phoneNumber.trim(), isPrimary: true }]
          : undefined,
        emails: toOptionalString(values.email)
          ? [{ typeCode: 'personal', address: values.email.trim(), isPrimary: true }]
          : undefined,
      };
  const hasPiiPayload = Boolean(
    pii && Object.values(pii).some((value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return value !== undefined;
    }),
  );

  return {
    talentId,
    nickname: values.nickname.trim(),
    primaryLanguage: 'en',
    statusCode: toOptionalString(values.statusCode),
    tags: toOptionalTagList(values.tags),
    notes: toOptionalString(values.notes),
    pii: hasPiiPayload ? pii : undefined,
  };
}

export function mapCompanyCustomerCreatePayload(
  values: CompanyCustomerCreateFormValues,
  talentId: string,
  options?: { piiEnabled?: boolean },
): CompanyCreateData {
  const pii: CompanyPiiData | undefined = options?.piiEnabled === false
    ? undefined
    : {
        contactName: toOptionalString(values.contactName),
        contactPhone: toOptionalString(values.contactPhone),
        contactEmail: toOptionalString(values.contactEmail),
      };
  const hasPiiPayload = Boolean(
    pii && Object.values(pii).some((value) => value !== undefined),
  );

  return {
    talentId,
    nickname: values.nickname.trim(),
    primaryLanguage: 'en',
    statusCode: toOptionalString(values.statusCode),
    tags: toOptionalTagList(values.tags),
    notes: toOptionalString(values.notes),
    companyLegalName: values.companyLegalName.trim(),
    companyShortName: toOptionalString(values.companyShortName),
    registrationNumber: toOptionalString(values.registrationNumber),
    website: toOptionalString(values.website),
    pii: hasPiiPayload ? pii : undefined,
  };
}
