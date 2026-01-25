
import { Controller, Get, Logger, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { lookup } from 'mime-types';
import { BUCKETS, MinioService } from '../minio/minio.service';

import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Public Assets')
@Controller('public/assets')
export class PublicAssetsController {
  private readonly logger = new Logger(PublicAssetsController.name);

  constructor(private readonly minioService: MinioService) {}

  @Public()
  @Get(':bucket/*key')
  @ApiOperation({ summary: 'Get public asset' })
  async getAsset(
    @Param('bucket') bucket: string,
    @Param('key') key: string, // This captures the first segment, we need the "rest"
    @Res({ passthrough: true }) res: Response,
    @Param() params: Record<string, string>,
  ) {
    // In NestJS, wildcard parameters are often captured in params['0']
    let fullKey = params['0'] || key;
    if (Array.isArray(fullKey)) {
      fullKey = fullKey.join('/');
    } 
    
    this.logger.log(`Received request for public asset: bucket=${bucket}, key=${fullKey}`);

    // Security check: Only allow specific public buckets
    const ALLOWED_BUCKETS = [BUCKETS.AVATARS, BUCKETS.HOMEPAGE_ASSETS];
    if (!ALLOWED_BUCKETS.includes(bucket as any)) {
      throw new NotFoundException('Bucket not found or not public');
    }

    try {
      const stream = await this.minioService.getFileStream(bucket as any, fullKey);
      
      const stats = await this.minioService.getFileStats(bucket as any, fullKey);
      
      if (stats) {
        res.set({
            'Content-Length': stats.size,
            'Content-Type': lookup(fullKey) || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        });
      }

      return new StreamableFile(stream);
    } catch (error) {
      this.logger.warn(`Failed to serve asset: ${bucket}/${fullKey} - ${error.message}`);
      throw new NotFoundException('File not found');
    }
  }
}
