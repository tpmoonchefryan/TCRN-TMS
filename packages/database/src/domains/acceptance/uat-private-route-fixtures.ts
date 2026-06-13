// SPDX-License-Identifier: Apache-2.0

export interface UatPrivateRouteFixtureDefinition {
  tenantCode: string;
  tenantSchemaName: string;
  adminUsername: string;
  viewerUsername: string;
  subsidiaryCode: string;
  talentCode: string;
}

export interface UatPrivateRouteFixtureIds {
  tenantId: string;
  subsidiaryId: string;
  talentId: string;
  firstCustomerId?: string | null;
}

export const UAT_PRIVATE_ROUTE_FIXTURE: UatPrivateRouteFixtureDefinition = {
  tenantCode: 'UAT_CORP',
  tenantSchemaName: 'tenant_uat_corp',
  adminUsername: 'corp_admin',
  viewerUsername: 'viewer_hq',
  subsidiaryCode: 'BU_GAMING',
  talentCode: 'TALENT_SAKURA',
};

export function buildUatPrivateFixtureRoutes(ids: UatPrivateRouteFixtureIds) {
  const tenantBase = `/tenant/${ids.tenantId}`;
  const talentBase = `${tenantBase}/talent/${ids.talentId}`;

  return {
    tenantSettings: `${tenantBase}/settings`,
    subsidiarySettings: `${tenantBase}/subsidiary/${ids.subsidiaryId}/settings`,
    talentSettings: `${talentBase}/settings`,
    talentOverview: talentBase,
    customerList: `${talentBase}/customers`,
    customerCreate: `${talentBase}/customers/new`,
    firstCustomer: ids.firstCustomerId ? `${talentBase}/customers/${ids.firstCustomerId}` : null,
    homepageManagement: `${talentBase}/homepage`,
    publicHomepage: `/${UAT_PRIVATE_ROUTE_FIXTURE.tenantCode.toLowerCase()}/${UAT_PRIVATE_ROUTE_FIXTURE.talentCode.toLowerCase()}/homepage`,
  };
}
