// SPDX-License-Identifier: Apache-2.0
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PUBLISHED_TALENT_ACCESS_KEY = 'requirePublishedTalentAccess';

export type PublishedTalentJobOwnerSource = 'export' | 'import' | 'report';

export interface RequirePublishedTalentAccessOptions {
  allowDraft?: boolean;
  jobOwnerSource?: PublishedTalentJobOwnerSource;
}

export const RequirePublishedTalentAccess = (options: RequirePublishedTalentAccessOptions = {}) =>
  SetMetadata(REQUIRE_PUBLISHED_TALENT_ACCESS_KEY, options);
