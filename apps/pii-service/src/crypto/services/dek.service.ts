// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';

import { KekService } from './kek.service';
import { PrismaClient } from '.prisma/pii-client';

/**
 * Data Encryption Key (DEK) Service
 * Manages per-tenant encryption keys
 */
@Injectable()
export class DekService {
  // In-memory cache for decrypted DEKs (consider using Redis in production)
  private dekCache: Map<string, { dek: Buffer; version: number; expiresAt: number }> = new Map();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject('PII_PRISMA') private readonly prisma: PrismaClient,
    private readonly kekService: KekService,
  ) {}

  /**
   * Get or create DEK for a tenant
   */
  async getDekForTenant(tenantId: string): Promise<Buffer> {
    // Check cache first
    const cached = this.dekCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.dek;
    }

    // Load from database
    let tenantDek = await this.prisma.tenantDek.findUnique({
      where: { tenantId },
    });

    // Create new DEK if not exists
    if (!tenantDek) {
      tenantDek = await this.createDekForTenant(tenantId);
    }

    // Decrypt the DEK using KEK
    const dek = this.kekService.decryptWithKek(tenantDek.encryptedDek);

    // Cache the decrypted DEK
    this.dekCache.set(tenantId, {
      dek,
      version: tenantDek.dekVersion,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return dek;
  }

  /**
   * Create a new DEK for a tenant
   */
  async createDekForTenant(tenantId: string) {
    // Generate new 256-bit DEK
    const dek = crypto.randomBytes(32);

    // Encrypt DEK with KEK
    const encryptedDek = this.kekService.encryptWithKek(dek);

    // Store in database
    const tenantDek = await this.prisma.tenantDek.create({
      data: {
        tenantId,
        encryptedDek,
        dekVersion: 1,
        algorithm: 'AES-256-GCM',
      },
    });

    // Cache the new DEK
    this.dekCache.set(tenantId, {
      dek,
      version: 1,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return tenantDek;
  }

  /**
   * Rotate DEK for a tenant
   */
  async rotateDek(tenantId: string): Promise<void> {
    // Get current DEK info
    const currentDek = await this.prisma.tenantDek.findUnique({
      where: { tenantId },
    });

    if (!currentDek) {
      throw new NotFoundException('Tenant DEK not found');
    }

    // Generate new DEK
    const newDek = crypto.randomBytes(32);
    const encryptedNewDek = this.kekService.encryptWithKek(newDek);

    // Get old DEK for re-encryption
    const oldDek = this.kekService.decryptWithKek(currentDek.encryptedDek);

    // Re-encrypt all PII profiles for this tenant
    await this.reencryptTenantData(tenantId, oldDek, newDek);

    // Update DEK in database
    await this.prisma.tenantDek.update({
      where: { tenantId },
      data: {
        encryptedDek: encryptedNewDek,
        dekVersion: { increment: 1 },
        rotatedAt: new Date(),
      },
    });

    // Invalidate cache
    this.dekCache.delete(tenantId);
  }

  /**
   * Re-encrypt all PII data for a tenant with new DEK
   */
  private async reencryptTenantData(
    tenantId: string,
    oldDek: Buffer,
    newDek: Buffer,
  ): Promise<void> {
    // Process in batches
    const batchSize = 100;
    let skip = 0;

    while (true) {
      const profiles = await this.prisma.piiProfile.findMany({
        where: { tenantId },
        skip,
        take: batchSize,
      });

      if (profiles.length === 0) break;

      // Re-encrypt each profile
      for (const profile of profiles) {
        const updates: Record<string, Buffer | null> = {};

        const fieldsToReencrypt = [
          'givenName',
          'familyName',
          'birthDate',
          'phoneNumbers',
          'emails',
          'addresses',
        ] as const;

        for (const field of fieldsToReencrypt) {
          const value = profile[field];
          if (value) {
            // Decrypt with old DEK
            const decrypted = this.decryptField(value, oldDek);
            // Re-encrypt with new DEK
            updates[field] = this.encryptField(decrypted, newDek);
          }
        }

        // Update profile
        await this.prisma.piiProfile.update({
          where: { id: profile.id },
          data: updates,
        });
      }

      skip += batchSize;
    }
  }

  /**
   * Encrypt a field value
   */
  private encryptField(plaintext: string, dek: Buffer): Buffer {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]);
  }

  /**
   * Decrypt a field value
   */
  private decryptField(ciphertext: Buffer | Uint8Array, dek: Buffer): string {
    // Convert Uint8Array to Buffer if needed (Prisma 6.x returns Uint8Array)
    const buffer = Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext);
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  /**
   * Clear DEK cache (for testing or security events)
   */
  clearCache(): void {
    this.dekCache.clear();
  }
}
