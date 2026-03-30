import { NotFoundException, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BUCKETS, MinioService } from '../../minio/minio.service';
import { PublicAssetsController } from '../public-assets.controller';

describe('PublicAssetsController', () => {
  let controller: PublicAssetsController;
  let mockMinioService: Pick<MinioService, 'getFileStream' | 'getFileStats'>;

  beforeEach(() => {
    mockMinioService = {
      getFileStream: vi.fn(),
      getFileStats: vi.fn(),
    };

    controller = new PublicAssetsController(mockMinioService as MinioService);
  });

  it('serves assets only from allowed public buckets', async () => {
    mockMinioService.getFileStream = vi
      .fn()
      .mockResolvedValue(Readable.from(['asset-content']));
    mockMinioService.getFileStats = vi.fn().mockResolvedValue({
      size: 12,
      lastModified: new Date('2026-03-30T00:00:00.000Z'),
    });

    const response = {
      set: vi.fn(),
    } as unknown as Response;
    const request = {
      path: '/api/v1/public/assets/avatars/folder%2Ffile.png',
      url: '/api/v1/public/assets/avatars/folder%2Ffile.png',
    } as Request;

    const result = await controller.getAsset(BUCKETS.AVATARS, response, request);

    expect(mockMinioService.getFileStream).toHaveBeenCalledWith(
      BUCKETS.AVATARS,
      'folder/file.png',
    );
    expect(mockMinioService.getFileStats).toHaveBeenCalledWith(
      BUCKETS.AVATARS,
      'folder/file.png',
    );
    expect(response.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Length': 12,
        'Cache-Control': 'public, max-age=31536000',
      }),
    );
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('rejects non-public buckets before touching MinIO', async () => {
    const response = {
      set: vi.fn(),
    } as unknown as Response;
    const request = {
      path: '/api/v1/public/assets/imports/private.csv',
      url: '/api/v1/public/assets/imports/private.csv',
    } as Request;

    await expect(
      controller.getAsset(BUCKETS.IMPORTS, response, request),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(mockMinioService.getFileStream).not.toHaveBeenCalled();
    expect(mockMinioService.getFileStats).not.toHaveBeenCalled();
  });

  it('rejects malformed asset paths', async () => {
    const response = {
      set: vi.fn(),
    } as unknown as Response;
    const request = {
      path: '/api/v1/public/assets/avatars',
      url: '/api/v1/public/assets/avatars',
    } as Request;

    await expect(
      controller.getAsset(BUCKETS.AVATARS, response, request),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(mockMinioService.getFileStream).not.toHaveBeenCalled();
  });
});
