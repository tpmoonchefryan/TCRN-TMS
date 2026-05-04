import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import {
  CreateCompanyCustomerDto,
  CreateIndividualCustomerDto,
  UpdateCompanyCustomerDto,
  UpdateIndividualCustomerDto,
} from './customer.dto';

async function getPrimaryLanguageErrors(dto: object) {
  const errors = await validate(dto);

  return errors.filter((error) => error.property === 'primaryLanguage');
}

describe('customer DTO primaryLanguage validation', () => {
  it('accepts supported UI locale tags', async () => {
    const createIndividual = Object.assign(new CreateIndividualCustomerDto(), {
      nickname: 'Aki fan',
      primaryLanguage: 'zh_HANS',
    });
    const createCompany = Object.assign(new CreateCompanyCustomerDto(), {
      nickname: 'Aki Corp',
      companyLegalName: 'Aki Corporation',
      primaryLanguage: 'zh_HANT',
    });
    const updateIndividual = Object.assign(new UpdateIndividualCustomerDto(), {
      version: 1,
      primaryLanguage: 'ko',
    });
    const updateCompany = Object.assign(new UpdateCompanyCustomerDto(), {
      version: 1,
      primaryLanguage: 'fr',
    });

    await expect(getPrimaryLanguageErrors(createIndividual)).resolves.toEqual([]);
    await expect(getPrimaryLanguageErrors(createCompany)).resolves.toEqual([]);
    await expect(getPrimaryLanguageErrors(updateIndividual)).resolves.toEqual([]);
    await expect(getPrimaryLanguageErrors(updateCompany)).resolves.toEqual([]);
  });

  it('rejects the legacy aggregate Chinese language code', async () => {
    const dto = Object.assign(new CreateIndividualCustomerDto(), {
      nickname: 'Aki fan',
      primaryLanguage: 'zh',
    });

    await expect(getPrimaryLanguageErrors(dto)).resolves.toHaveLength(1);
  });
});
