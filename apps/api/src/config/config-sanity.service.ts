// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function getProductionUrlWarning(
  nodeEnv: string | undefined,
  key: string,
  url: string | undefined,
  purpose: string,
): string | null {
  if (nodeEnv !== 'production' || !url) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (!LOOPBACK_HOSTS.has(hostname)) {
      return null;
    }

    return `${key} resolves to loopback URL (${url}) in production. ${purpose}`;
  } catch {
    return null;
  }
}

@Injectable()
export class ConfigSanityService implements OnModuleInit {
  private readonly logger = new Logger(ConfigSanityService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    const warnings = [
      getProductionUrlWarning(
        nodeEnv,
        'FRONTEND_URL',
        this.configService.get<string>('FRONTEND_URL'),
        'Password reset and email verification links may send users to localhost.',
      ),
      getProductionUrlWarning(
        nodeEnv,
        'APP_URL',
        this.configService.get<string>('APP_URL'),
        'Homepage and public-page links may point operators or users back to localhost.',
      ),
    ].filter((warning): warning is string => warning !== null);

    for (const warning of warnings) {
      this.logger.warn(warning);
    }
  }
}
