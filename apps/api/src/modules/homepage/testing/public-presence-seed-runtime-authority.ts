import {
  PUBLIC_PRESENCE_COMPONENT_SEED_BLUEPRINTS,
  PUBLIC_PRESENCE_SEED_METADATA,
  PUBLIC_PRESENCE_STAGE_SECTION_SEED_BLUEPRINTS,
  PUBLIC_PRESENCE_TEMPLATE_SEED_BLUEPRINTS,
  type PublicPresenceAssetRuntimeAuthority,
  type PublicPresenceTemplateId,
} from '@tcrn/shared';

export function buildPublicPresenceSeedRuntimeAuthorityForTests(
  templateId: PublicPresenceTemplateId,
): PublicPresenceAssetRuntimeAuthority {
  const template = structuredClone(PUBLIC_PRESENCE_TEMPLATE_SEED_BLUEPRINTS[templateId]);
  const allowedSectionKinds = Array.from(
    new Set([
      ...template.requiredSections,
      ...template.recommendedSections,
      ...template.optionalSections,
      ...template.lockedSections,
      ...template.defaultSectionOrder,
    ]),
  );

  return {
    components: structuredClone(PUBLIC_PRESENCE_COMPONENT_SEED_BLUEPRINTS),
    registryVersion: PUBLIC_PRESENCE_SEED_METADATA.registryVersion,
    safetyPolicyVersion: PUBLIC_PRESENCE_SEED_METADATA.safetyPolicyVersion,
    stageSections: Object.fromEntries(
      allowedSectionKinds.map((sectionKind) => [
        sectionKind,
        structuredClone(PUBLIC_PRESENCE_STAGE_SECTION_SEED_BLUEPRINTS[sectionKind]),
      ]),
    ),
    template,
  };
}
