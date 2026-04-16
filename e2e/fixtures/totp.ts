// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { createHmac } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function decodeBase32(secret: string): Buffer {
  const normalized = secret.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  let bits = '';

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Unsupported base32 character: ${char}`);
    }

    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }

  return Buffer.from(bytes);
}

export function generateTotpCode(
  secret: string,
  options?: {
    digits?: number;
    stepSeconds?: number;
    now?: number;
  },
): string {
  const digits = options?.digits ?? 6;
  const stepSeconds = options?.stepSeconds ?? 30;
  const now = options?.now ?? Date.now();
  const counter = Math.floor(now / 1000 / stepSeconds);
  const counterBuffer = Buffer.alloc(8);

  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', decodeBase32(secret))
    .update(counterBuffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binaryCode =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];

  return (binaryCode % 10 ** digits).toString().padStart(digits, '0');
}
