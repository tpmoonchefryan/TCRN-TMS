import { describe, expect, it } from 'vitest';

import { SUPPORTED_UI_LOCALES } from '../constants/locale';
import {
  assertModuleCapabilityRegistry,
  ASSIGNABLE_CAPABILITY_CODES,
  buildDefaultCapabilityCodesForTenant,
  CAPABILITY_DEFINITIONS,
  mapLegacyFeatureSettings,
  MODULE_CAPABILITY_REGISTRY,
  MODULE_CAPABILITY_REGISTRY_VERSION,
  normalizeAssignableCapabilityCodes,
  stripLegacyFeatureSettings,
} from './index';

describe('module capability registry', () => {
  it('validates registry shape, RBAC references, dependencies, and localization', () => {
    expect(() => assertModuleCapabilityRegistry()).not.toThrow();
    expect(MODULE_CAPABILITY_REGISTRY.registryVersion).toBe(MODULE_CAPABILITY_REGISTRY_VERSION);

    for (const capability of CAPABILITY_DEFINITIONS) {
      for (const locale of SUPPORTED_UI_LOCALES) {
        expect(capability.label[locale]).toBeTruthy();
        expect(capability.description[locale]).toBeTruthy();
      }
    }
  });

  it('keeps assignable and default standard tenant capabilities explicit', () => {
    expect(ASSIGNABLE_CAPABILITY_CODES).toEqual([
      'public_presence.homepage',
      'marshmallow.mailbox',
      'reports.mfr',
      'integration.webhooks',
    ]);
    expect(buildDefaultCapabilityCodesForTenant('standard')).toEqual([
      'public_presence.homepage',
      'marshmallow.mailbox',
    ]);
    expect(buildDefaultCapabilityCodesForTenant('ac')).toEqual([]);
  });

  it('normalizes requested codes and rejects unknown or locked codes', () => {
    expect(
      normalizeAssignableCapabilityCodes([
        'marshmallow.mailbox',
        'core.settings',
        'unknown.capability',
        'public_presence.homepage',
        'marshmallow.mailbox',
      ])
    ).toEqual({
      enabledCapabilityCodes: ['public_presence.homepage', 'marshmallow.mailbox'],
      invalidCapabilityCodes: ['unknown.capability'],
      nonAssignableCapabilityCodes: ['core.settings'],
    });
  });

  it('maps legacy feature arrays and object maps without keeping feature settings', () => {
    expect(mapLegacyFeatureSettings(['homepage', 'marshmallow', 'unknownLegacy'])).toEqual({
      enabledCapabilityCodes: ['public_presence.homepage', 'marshmallow.mailbox'],
      unsupportedLegacyFeatureKeys: ['unknownLegacy'],
    });

    expect(
      mapLegacyFeatureSettings({
        advancedReports: true,
        apiIntegration: true,
        multiSubsidiary: true,
      })
    ).toEqual({
      enabledCapabilityCodes: [
        'public_presence.homepage',
        'marshmallow.mailbox',
        'reports.mfr',
        'integration.webhooks',
      ],
      unsupportedLegacyFeatureKeys: ['multiSubsidiary'],
    });

    expect(stripLegacyFeatureSettings({ features: ['homepage'], maxTalents: 20 })).toEqual({
      maxTalents: 20,
    });
  });
});
