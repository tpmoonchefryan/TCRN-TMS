
import { Controller, Get, Logger, NotFoundException, Param, Req, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { lookup } from 'mime-types';

import { Public } from '../../common/decorators/public.decorator';
import { BUCKETS, BucketName, MinioService } from '../minio/minio.service';


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

      // Manually extract key from URL
      const urlParts = (req.path || req.url).split(`/${bucket}/`);
      if (urlParts.length < 2) {
        this.logger.warn(`Invalid path format: ${req.path}`);
        throw new NotFoundException('Invalid path');
      }
      
      const fullKey = decodeURIComponent(urlParts[1]);
      this.logger.log(`Extracted key: ${fullKey}`);
  
      // Security check
      // Security check
      const ALLOWED_BUCKETS: string[] = [BUCKETS.AVATARS, BUCKETS.HOMEPAGE_ASSETS];
      if (!ALLOWED_BUCKETS.includes(bucket)) {
        throw new NotFoundException('Bucket not found or not public');
      }
  
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = await this.minioService.getFileStream(bucket as any as BucketName, fullKey);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats = await this.minioService.getFileStats(bucket as any as BucketName, fullKey);
        
      if (stats) {
        res.set({
            'Content-Length': stats.size,
            'Content-Type': lookup(fullKey) || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000', 
        });
      }
  
      return new StreamableFile(stream);
    } catch (error) {
      this.logger.error(`Failed to serve asset: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('File not found (Internal Error)');
    }
  }
}
