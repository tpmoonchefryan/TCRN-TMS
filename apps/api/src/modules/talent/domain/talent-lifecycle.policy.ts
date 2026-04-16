// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  getReadinessAction,
  type TalentData,
  type TalentExternalPagesDomainConfig,
  type TalentPublishReadiness,
} from './talent-read.policy';

export const buildTalentPublishReadiness = (params: {
  talent: TalentData;
  hasReadyCustomerArchive: boolean;
  externalPagesDomain: TalentExternalPagesDomainConfig;
}): TalentPublishReadiness => {
  const blockers: TalentPublishReadiness['blockers'] = [];
  const warnings: TalentPublishReadiness['warnings'] = [];

  if (
    params.talent.lifecycleStatus !== 'published' &&
    !params.hasReadyCustomerArchive
  ) {
    blockers.push({
      code: 'PROFILE_STORE_REQUIRED',
      message: 'Talent must be bound to an active profile store before publish.',
    });
  }

  if (!params.externalPagesDomain.homepage?.isPublished) {
    warnings.push({
      code: 'HOMEPAGE_NOT_PUBLISHED',
      message: 'Homepage content is still unpublished.',
    });
  }

  if (!params.externalPagesDomain.marshmallow?.isEnabled) {
    warnings.push({
      code: 'MARSHMALLOW_NOT_ENABLED',
      message: 'Marshmallow is not configured or enabled yet.',
    });
  }

  if (!params.talent.avatarUrl) {
    warnings.push({
      code: 'AVATAR_MISSING',
      message: 'Talent avatar is still missing.',
    });
  }

  if (
    !params.talent.descriptionEn &&
    !params.talent.descriptionZh &&
    !params.talent.descriptionJa
  ) {
    warnings.push({
      code: 'DESCRIPTION_MISSING',
      message: 'Talent description is still empty.',
    });
  }

  return {
    id: params.talent.id,
    lifecycleStatus: params.talent.lifecycleStatus,
    targetState: 'published',
    recommendedAction: getReadinessAction(params.talent.lifecycleStatus),
    canEnterPublishedState: blockers.length === 0,
    blockers,
    warnings,
    version: params.talent.version,
  };
};
