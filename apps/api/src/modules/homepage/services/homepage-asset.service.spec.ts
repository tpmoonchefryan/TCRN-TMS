import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { BUCKETS } from '../../minio/minio.service';
import { HOMEPAGE_ASSET_MAX_FILE_SIZE_BYTES, HomepageAssetService } from './homepage-asset.service';

function createFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  const buffer = Buffer.from('image-bytes');

  return {
    buffer,
    destination: '',
    encoding: '7bit',
    fieldname: 'file',
    filename: 'avatar.png',
    mimetype: 'image/png',
    originalname: 'avatar.png',
    path: '',
    size: buffer.length,
    stream: undefined as never,
    ...overrides,
  };
}

describe('HomepageAssetService', () => {
  it('uploads homepage images into the public homepage-assets bucket', async () => {
    const minioService = {
      uploadFile: vi.fn().mockResolvedValue('object-name'),
    };
    const configService = {
      get: vi.fn((key: string, fallback?: string) => {
        if (key === 'MINIO_PUBLIC_URL') {
          return '';
        }
        if (key === 'APP_URL') {
          return 'https://app.example.com/';
        }
        return fallback;
      }),
    };
    const service = new HomepageAssetService(minioService as never, configService as never);

    const result = await service.uploadImage({
      file: createFile(),
      talentId: '550e8400-e29b-41d4-a716-446655440001',
      tenantSchema: 'tenant_default',
    });

    expect(minioService.uploadFile).toHaveBeenCalledWith(
      BUCKETS.HOMEPAGE_ASSETS,
      expect.stringMatching(
        /^tenant_default\/550e8400-e29b-41d4-a716-446655440001\/\d+-[0-9a-f-]+\.png$/
      ),
      Buffer.from('image-bytes'),
      'image/png'
    );
    expect(result.url).toMatch(
      /^https:\/\/app\.example\.com\/api\/v1\/public\/assets\/homepage-assets\/tenant_default\/550e8400-e29b-41d4-a716-446655440001\/\d+-[0-9a-f-]+\.png$/
    );
  });

  it('rejects active image formats and oversized files before upload', async () => {
    const minioService = {
      uploadFile: vi.fn(),
    };
    const configService = {
      get: vi.fn(),
    };
    const service = new HomepageAssetService(minioService as never, configService as never);

    await expect(
      service.uploadImage({
        file: createFile({ mimetype: 'image/svg+xml' }),
        talentId: 'talent-1',
        tenantSchema: 'tenant_default',
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.uploadImage({
        file: createFile({ size: HOMEPAGE_ASSET_MAX_FILE_SIZE_BYTES + 1 }),
        talentId: 'talent-1',
        tenantSchema: 'tenant_default',
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(minioService.uploadFile).not.toHaveBeenCalled();
  });
});
