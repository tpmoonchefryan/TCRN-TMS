// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PUBLISHED_TALENT_ACCESS_KEY = 'requirePublishedTalentAccess';

export type PublishedTalentJobOwnerSource = 'export' | 'import' | 'report';

export interface RequirePublishedTalentAccessOptions {
  jobOwnerSource?: PublishedTalentJobOwnerSource;
}

export const RequirePublishedTalentAccess = (
  options: RequirePublishedTalentAccessOptions = {},
) => SetMetadata(REQUIRE_PUBLISHED_TALENT_ACCESS_KEY, options);
