// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';

import { resolveSwaggerExposurePolicy, shouldPersistSwaggerAuthorization } from './swagger.config';

describe('Swagger exposure policy', () => {
  it('keeps local Swagger usable while disabling persisted auth in prod-like modes', () => {
    expect(resolveSwaggerExposurePolicy('development')).toMatchObject({
      authRequirement: 'none_local_only',
      persistAuthorizationPolicy: 'local_only',
      tryOutMode: 'local_enabled',
    });
    expect(resolveSwaggerExposurePolicy('production')).toMatchObject({
      authRequirement: 'basic_auth_required',
      persistAuthorizationPolicy: 'disabled',
      tryOutMode: 'read_only_or_disabled_for_private_mutations',
    });
    expect(resolveSwaggerExposurePolicy('shared_dev')).toMatchObject({
      authRequirement: 'basic_auth_required',
      persistAuthorizationPolicy: 'disabled',
      tryOutMode: 'read_only_or_disabled_for_private_mutations',
    });
    expect(resolveSwaggerExposurePolicy('staging')).toMatchObject({
      authRequirement: 'basic_auth_required',
      persistAuthorizationPolicy: 'disabled',
      tryOutMode: 'read_only_or_disabled_for_private_mutations',
    });
    expect(shouldPersistSwaggerAuthorization('production')).toBe(false);
    expect(shouldPersistSwaggerAuthorization('shared_dev')).toBe(false);
    expect(shouldPersistSwaggerAuthorization('staging')).toBe(false);
  });

  it('preserves the accepted generated Swagger groups', () => {
    expect(resolveSwaggerExposurePolicy('production').allowedGroups).toEqual([
      'operations',
      'config',
      'public',
    ]);
  });
});
