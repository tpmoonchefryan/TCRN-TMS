// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  type CompanyCreateData,
  companyCustomerApi,
  customerApi,
  type CustomerCreateData,
} from '@/lib/api/modules/customer';

export const customerCreateDomainApi = {
  createIndividual: async (data: CustomerCreateData) => {
    return customerApi.create(data);
  },

  createCompany: async (data: CompanyCreateData) => {
    return companyCustomerApi.create(data);
  },
};
