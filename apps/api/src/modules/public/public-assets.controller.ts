import { Controller, Get, Logger, NotFoundException, Param, Req, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { lookup } from 'mime-types';

import { Public } from '../../common/decorators/public.decorator';
import { MinioService } from '../minio/minio.service';
import {
  extractPublicAssetKey,
  resolvePublicAssetBucket,
} from './public-assets.utils';

@ApiTags('Public - Assets')
@Controller('public/assets')
export class PublicAssetsController {
  private readonly logger = new Logger(PublicAssetsController.name);

  constructor(private readonly minioService: MinioService) {}

  @Public()
  @Get(':bucket/*key')
  @ApiOperation({ summary: 'Get public asset' })
  async getAsset(
    @Param('bucket') bucket: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    try {
      this.logger.log(`Debugging 500: path=${req?.path}, url=${req?.url}, bucket=${bucket}`);

      const pathOrUrl = req.path || req.url;
      const fullKey = extractPublicAssetKey(pathOrUrl, bucket);
      if (!fullKey) {
        this.logger.warn(`Invalid path format: ${req.path}`);
        throw new NotFoundException('Invalid path');
      }
      this.logger.log(`Extracted key: ${fullKey}`);

      const publicBucket = resolvePublicAssetBucket(bucket);
      if (!publicBucket) {
        throw new NotFoundException('Bucket not found or not public');
      }

      const stream = await this.minioService.getFileStream(publicBucket, fullKey);
      const stats = await this.minioService.getFileStats(publicBucket, fullKey);

      if (stats) {
        res.set({
          'Content-Length': stats.size,
          'Content-Type': lookup(fullKey) || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000',
        });
      }

      return new StreamableFile(stream);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to serve asset: ${errorMessage}`, errorStack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('File not found (Internal Error)');
    }
  }
}
