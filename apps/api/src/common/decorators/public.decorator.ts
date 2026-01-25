// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() decorator
 * Marks an endpoint as publicly accessible (no auth required)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
