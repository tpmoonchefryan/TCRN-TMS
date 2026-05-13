import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCodes } from '@tcrn/shared';
import { randomUUID } from 'crypto';

import { BUCKETS, MinioService } from '../../minio/minio.service';

export const HOMEPAGE_ASSET_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const HOMEPAGE_ASSET_ALLOWED_TYPES: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

interface UploadHomepageImageInput {
  file?: Express.Multer.File;
  talentId: string;
  tenantSchema: string;
}

interface UploadHomepageImageResult {
  url: string;
}

function validationError(message: string) {
  return new BadRequestException({
    code: ErrorCodes.VALIDATION_FAILED,
    message,
  });
}

@Injectable()
export class HomepageAssetService {
  constructor(
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
  ) {}

  async uploadImage(input: UploadHomepageImageInput): Promise<UploadHomepageImageResult> {
    const { extension, file } = this.validateImage(input.file);
    const objectName = [
      input.tenantSchema,
      input.talentId,
      `${Date.now()}-${randomUUID()}.${extension}`,
    ].join('/');

    try {
      await this.minioService.uploadFile(
        BUCKETS.HOMEPAGE_ASSETS,
        objectName,
        file.buffer,
        file.mimetype,
      );
    } catch {
      throw validationError('Homepage asset upload failed.');
    }

    return {
      url: `${this.getPublicAssetsBaseUrl()}/${BUCKETS.HOMEPAGE_ASSETS}/${objectName}`,
    };
  }

  private validateImage(file?: Express.Multer.File): { extension: string; file: Express.Multer.File } {
    if (!file) {
      throw validationError('No file uploaded.');
    }

    const extension = HOMEPAGE_ASSET_ALLOWED_TYPES[file.mimetype];

    if (!extension) {
      throw validationError('Invalid file type. Allowed: jpg, png, gif, webp.');
    }

    if (file.size > HOMEPAGE_ASSET_MAX_FILE_SIZE_BYTES) {
      throw validationError('File too large. Maximum size: 5MB.');
    }

    return { extension, file };
  }

  private getPublicAssetsBaseUrl() {
    const configuredUrl = this.configService.get<string>('MINIO_PUBLIC_URL')?.trim();

    if (configuredUrl) {
      return configuredUrl.replace(/\/+$/, '');
    }

    const appUrl = this.configService.get<string>('APP_URL', '').trim().replace(/\/+$/, '');

    return `${appUrl}/api/v1/public/assets`;
  }
}
