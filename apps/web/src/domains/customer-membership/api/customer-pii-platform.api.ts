// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { integrationApi } from '@/lib/api/modules/integration';

const PII_PLATFORM_CODE = 'TCRN_PII_PLATFORM';

export const customerPiiPlatformApi = {
  isEnabled: async (talentId: string): Promise<boolean> => {
    const response = await integrationApi.resolveEffectiveAdapter(
      { ownerType: 'talent', talentId },
      PII_PLATFORM_CODE,
    );

    return Boolean(response.success && response.data);
  },
};
