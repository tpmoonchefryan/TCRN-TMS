// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { createHash, randomBytes } from 'crypto';

export interface ValidatedConsumerRow {
  id: string;
  code: string;
  allowedIps: string[];
  tenantId: string;
  tenantSchema: string;
}

export const API_KEY_PREFIX = 'tcrn_';
export const API_KEY_LENGTH_BYTES = 32;
export const API_KEY_STORED_PREFIX_LENGTH = 8;
export const API_KEY_REGENERATION_WARNING = '请立即保存此 API Key，它不会再次显示。';

export function generateApiKeyMaterial(): { key: string; prefix: string; hash: string } {
  const randomPart = randomBytes(API_KEY_LENGTH_BYTES).toString('hex');
  const key = `${API_KEY_PREFIX}${randomPart}`;
  const prefix = getApiKeyStoredPrefix(key);
  const hash = hashApiKey(key);

  return { key, prefix, hash };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function getApiKeyStoredPrefix(key: string): string {
  return key.substring(0, API_KEY_STORED_PREFIX_LENGTH);
}

export function isManagedApiKey(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX);
}

export function isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
  if (!allowedIps || allowedIps.length === 0) {
    return true;
  }

  return allowedIps.some((allowed) => {
    if (clientIp === allowed) {
      return true;
    }

    if (allowed.includes('/')) {
      const [subnet] = allowed.split('/');
      return clientIp.startsWith(subnet.slice(0, -1));
    }

    return false;
  });
}
