import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { ModuleCapabilityService } from './module-capability.service';
import {
  CreateTenantDto,
  ReplaceTenantCapabilitiesDto,
  TenantSettingsDto,
  UpdateTenantDto,
} from './tenant.controller';

const SWAGGER_MODEL_PROPERTIES = 'swagger/apiModelProperties';
const SWAGGER_MODEL_PROPERTIES_ARRAY = 'swagger/apiModelPropertiesArray';

function getSwaggerPropertyNames(dto: new () => unknown) {
  const rawProperties = (Reflect.getMetadata(SWAGGER_MODEL_PROPERTIES_ARRAY, dto.prototype) ??
    []) as string[];

  return rawProperties.map((property) => property.replace(/^:/, ''));
}

describe('tenant Swagger and retired feature settings contract', () => {
  it('does not expose retired settings.features in Swagger model properties', () => {
    expect(getSwaggerPropertyNames(TenantSettingsDto)).toEqual([
      'maxTalents',
      'maxCustomersPerTalent',
    ]);
    expect(
      Reflect.getMetadata(SWAGGER_MODEL_PROPERTIES, TenantSettingsDto.prototype, 'features')
    ).toBeUndefined();

    expect(getSwaggerPropertyNames(CreateTenantDto)).toContain('enabledCapabilityCodes');
    expect(getSwaggerPropertyNames(UpdateTenantDto)).not.toContain('enabledCapabilityCodes');
    expect(getSwaggerPropertyNames(ReplaceTenantCapabilitiesDto)).toEqual([
      'enabledCapabilityCodes',
      'version',
      'note',
    ]);
  });

  it('rejects retired settings.features while stripping it from persisted settings defensively', () => {
    const service = new ModuleCapabilityService({} as never);

    expect(() =>
      service.rejectRetiredSettingsFeatures({ features: { homepage: true } })
    ).toThrowError(/retired/i);
    expect(
      service.sanitizeTenantSettings({
        maxTalents: 20,
        maxCustomersPerTalent: 5000,
        features: { homepage: true },
      })
    ).toEqual({
      maxTalents: 20,
      maxCustomersPerTalent: 5000,
    });
  });
});
