import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { CustomerController } from '../../modules/customer/controllers/customer.controller';
import { ExternalIdController } from '../../modules/customer/controllers/external-id.controller';
import { MembershipController } from '../../modules/customer/controllers/membership.controller';
import { PlatformIdentityController } from '../../modules/customer/controllers/platform-identity.controller';
import { ExportController } from '../../modules/export/controllers/export.controller';
import { HomepageController } from '../../modules/homepage/controllers/homepage.controller';
import { ImportController } from '../../modules/import/controllers/import.controller';
import { MarshmallowController } from '../../modules/marshmallow/controllers/marshmallow.controller';
import { ReportController } from '../../modules/report/controllers/report.controller';
import { REQUIRE_PUBLISHED_TALENT_ACCESS_KEY } from './require-published-talent-access.decorator';

function getPublishedTalentAccessMetadata(
  target: object,
  propertyKey?: string,
): unknown {
  if (propertyKey) {
    const handler = (target as Record<string, unknown>)[propertyKey];
    return Reflect.getMetadata(REQUIRE_PUBLISHED_TALENT_ACCESS_KEY, handler);
  }

  return Reflect.getMetadata(REQUIRE_PUBLISHED_TALENT_ACCESS_KEY, target);
}

describe('RequirePublishedTalentAccess contract coverage', () => {
  it('keeps class-level published-talent guards on business controller families', () => {
    expect(getPublishedTalentAccessMetadata(CustomerController)).toEqual({});
    expect(getPublishedTalentAccessMetadata(ExternalIdController)).toEqual({});
    expect(getPublishedTalentAccessMetadata(PlatformIdentityController)).toEqual({});
    expect(getPublishedTalentAccessMetadata(MembershipController)).toEqual({});
    expect(getPublishedTalentAccessMetadata(ExportController)).toEqual({});
    expect(getPublishedTalentAccessMetadata(ReportController)).toEqual({});
    expect(getPublishedTalentAccessMetadata(HomepageController)).toEqual({});
    expect(getPublishedTalentAccessMetadata(MarshmallowController)).toEqual({});
  });

  it('keeps import template downloads exempt while guarding import runtime endpoints', () => {
    expect(getPublishedTalentAccessMetadata(ImportController)).toBeUndefined();

    expect(
      getPublishedTalentAccessMetadata(ImportController.prototype, 'downloadIndividualTemplate'),
    ).toBeUndefined();
    expect(
      getPublishedTalentAccessMetadata(ImportController.prototype, 'downloadCompanyTemplate'),
    ).toBeUndefined();

    expect(getPublishedTalentAccessMetadata(ImportController.prototype, 'uploadIndividual')).toEqual(
      {},
    );
    expect(getPublishedTalentAccessMetadata(ImportController.prototype, 'uploadCompany')).toEqual(
      {},
    );
    expect(getPublishedTalentAccessMetadata(ImportController.prototype, 'listJobs')).toEqual({});
  });

  it('keeps job-backed endpoints on explicit job-owner guard resolution', () => {
    expect(getPublishedTalentAccessMetadata(ExportController.prototype, 'getJob')).toEqual({
      jobOwnerSource: 'export',
    });
    expect(getPublishedTalentAccessMetadata(ExportController.prototype, 'downloadExport')).toEqual({
      jobOwnerSource: 'export',
    });
    expect(getPublishedTalentAccessMetadata(ExportController.prototype, 'cancelJob')).toEqual({
      jobOwnerSource: 'export',
    });

    expect(getPublishedTalentAccessMetadata(ImportController.prototype, 'getJob')).toEqual({
      jobOwnerSource: 'import',
    });
    expect(getPublishedTalentAccessMetadata(ImportController.prototype, 'getJobErrors')).toEqual({
      jobOwnerSource: 'import',
    });
    expect(getPublishedTalentAccessMetadata(ImportController.prototype, 'cancelJob')).toEqual({
      jobOwnerSource: 'import',
    });

    expect(getPublishedTalentAccessMetadata(ReportController.prototype, 'getMfrJob')).toEqual({
      jobOwnerSource: 'report',
    });
    expect(
      getPublishedTalentAccessMetadata(ReportController.prototype, 'downloadMfrJob'),
    ).toEqual({
      jobOwnerSource: 'report',
    });
    expect(getPublishedTalentAccessMetadata(ReportController.prototype, 'cancelMfrJob')).toEqual({
      jobOwnerSource: 'report',
    });
  });
});
