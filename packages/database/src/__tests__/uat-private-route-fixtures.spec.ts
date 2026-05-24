import { describe, it } from 'node:test';

import assert from 'node:assert/strict';

import {
  buildUatPrivateFixtureRoutes,
  UAT_PRIVATE_ROUTE_FIXTURE,
} from '../domains/acceptance/uat-private-route-fixtures';

describe('UAT private route fixtures', () => {
  it('keeps the canonical WS6 acceptance fixture pinned to stable UAT codes', () => {
    assert.deepEqual(UAT_PRIVATE_ROUTE_FIXTURE, {
      tenantCode: 'UAT_CORP',
      tenantSchemaName: 'tenant_uat_corp',
      adminUsername: 'corp_admin',
      viewerUsername: 'viewer_hq',
      subsidiaryCode: 'BU_GAMING',
      talentCode: 'TALENT_SAKURA',
    });
  });

  it('builds the private and public acceptance routes from resolved ids', () => {
    assert.deepEqual(
      buildUatPrivateFixtureRoutes({
        tenantId: 'tenant-1',
        subsidiaryId: 'subsidiary-1',
        talentId: 'talent-1',
        firstCustomerId: 'customer-1',
      }),
      {
        tenantSettings: '/tenant/tenant-1/settings',
        subsidiarySettings: '/tenant/tenant-1/subsidiary/subsidiary-1/settings',
        talentSettings: '/tenant/tenant-1/talent/talent-1/settings',
        talentOverview: '/tenant/tenant-1/talent/talent-1',
        customerList: '/tenant/tenant-1/talent/talent-1/customers',
        customerCreate: '/tenant/tenant-1/talent/talent-1/customers/new',
        firstCustomer: '/tenant/tenant-1/talent/talent-1/customers/customer-1',
        homepageManagement: '/tenant/tenant-1/talent/talent-1/homepage',
        publicHomepage: '/uat_corp/talent_sakura/homepage',
      }
    );
  });

  it('omits the first-customer route when no customer fixture is present', () => {
    assert.equal(
      buildUatPrivateFixtureRoutes({
        tenantId: 'tenant-1',
        subsidiaryId: 'subsidiary-1',
        talentId: 'talent-1',
      }).firstCustomer,
      null
    );
  });
});
