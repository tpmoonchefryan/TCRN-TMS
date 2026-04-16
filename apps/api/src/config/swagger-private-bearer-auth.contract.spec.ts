import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { CustomerController } from '../modules/customer/controllers/customer.controller';
import { ExternalIdController } from '../modules/customer/controllers/external-id.controller';
import { MembershipController } from '../modules/customer/controllers/membership.controller';
import { PlatformIdentityController } from '../modules/customer/controllers/platform-identity.controller';
import { EmailTemplateController } from '../modules/email/controllers/email-template.controller';
import { ExportController } from '../modules/export/controllers/export.controller';
import { HealthController } from '../modules/health/health.controller';
import { CalendarController } from '../modules/homepage/controllers/calendar.controller';
import { DomainLookupController } from '../modules/homepage/controllers/domain-lookup.controller';
import { HomepageController } from '../modules/homepage/controllers/homepage.controller';
import { InternalDomainController } from '../modules/homepage/controllers/internal-domain.controller';
import { PublicHomepageController } from '../modules/homepage/controllers/public-homepage.controller';
import { ImportController } from '../modules/import/controllers/import.controller';
import { IntegrationController } from '../modules/integration/controllers/integration.controller';
import {
  SubsidiaryIntegrationAdapterController,
  TalentIntegrationAdapterController,
} from '../modules/integration/controllers/scoped-integration-adapter.controller';
import { LogSearchController } from '../modules/log/controllers/log-search.controller';
import { ExternalBlocklistController } from '../modules/marshmallow/controllers/external-blocklist.controller';
import { MarshmallowController } from '../modules/marshmallow/controllers/marshmallow.controller';
import { PublicMarshmallowController } from '../modules/marshmallow/controllers/public-marshmallow.controller';
import { PiiServiceConfigController } from '../modules/pii-config/controllers/pii-service-config.controller';
import { ProfileStoreController } from '../modules/pii-config/controllers/profile-store.controller';
import { PublicAssetsController } from '../modules/public/public-assets.controller';
import { PublicDomainController } from '../modules/public/public-domain.controller';
import { ReportController } from '../modules/report/controllers/report.controller';
import { RateLimitStatsController } from '../modules/security/controllers/rate-limit-stats.controller';
import { SecurityController } from '../modules/security/controllers/security.controller';
import { SystemRoleController } from '../modules/system-role/system-role.controller';

const API_SECURITY_METADATA_KEY = 'swagger/apiSecurity';

const PRIVATE_CONTROLLERS = [
  CustomerController,
  EmailTemplateController,
  ExportController,
  ExternalBlocklistController,
  ExternalIdController,
  HomepageController,
  ImportController,
  IntegrationController,
  LogSearchController,
  MarshmallowController,
  MembershipController,
  PiiServiceConfigController,
  PlatformIdentityController,
  ProfileStoreController,
  RateLimitStatsController,
  ReportController,
  SecurityController,
  SubsidiaryIntegrationAdapterController,
  SystemRoleController,
  TalentIntegrationAdapterController,
] as const;

const PUBLIC_OR_INTERNAL_CONTROLLERS = [
  CalendarController,
  DomainLookupController,
  HealthController,
  InternalDomainController,
  PublicAssetsController,
  PublicDomainController,
  PublicHomepageController,
  PublicMarshmallowController,
] as const;

describe('Swagger private-controller bearer-auth contract', () => {
  it.each(PRIVATE_CONTROLLERS)('documents JWT bearer auth for %p', (controllerClass) => {
    expect(Reflect.getMetadata(API_SECURITY_METADATA_KEY, controllerClass)).toEqual(
      expect.arrayContaining([{ bearer: [] }]),
    );
  });

  it.each(PUBLIC_OR_INTERNAL_CONTROLLERS)(
    'does not document JWT bearer auth for %p',
    (controllerClass) => {
      expect(Reflect.getMetadata(API_SECURITY_METADATA_KEY, controllerClass)).toBeUndefined();
    },
  );
});
