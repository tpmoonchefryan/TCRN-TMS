import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { lookup } from 'mime-types';

import { Public } from '../../common/decorators/public.decorator';
import { quoteSqlIdentifier } from '../../common/security/sql-identifier.util';
import { DatabaseService } from '../database';
import { MinioService } from '../minio/minio.service';
import { extractPublicAssetKey, resolvePublicAssetBucket } from './public-assets.utils';

const HOMEPAGE_ASSET_KEY_PATTERN =
  /^(?<tenantSchema>[A-Za-z_][A-Za-z0-9_]*)\/(?<talentId>[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/.+$/i;

@ApiTags('Public - Assets')
@Controller('public/assets')
export class PublicAssetsController {
  private readonly logger = new Logger(PublicAssetsController.name);

  constructor(
    private readonly minioService: MinioService,
    private readonly databaseService: DatabaseService
  ) {}

  @Public()
  @Get(':bucket/*key')
  @ApiOperation({ summary: 'Get public asset' })
  async getAsset(
    @Param('bucket') bucket: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request
  ) {
    try {
      const pathOrUrl = req.path || req.url;
      const fullKey = extractPublicAssetKey(pathOrUrl, bucket);
      if (!fullKey) {
        this.logger.warn(`Invalid public asset path format for bucket=${bucket}`);
        throw new NotFoundException('Invalid path');
      }

      const publicBucket = resolvePublicAssetBucket(bucket);
      if (!publicBucket) {
        throw new NotFoundException('Bucket not found or not public');
      }

      if (publicBucket === 'homepage-assets') {
        await this.assertPublishedHomepageAsset(fullKey);
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

  private async assertPublishedHomepageAsset(fullKey: string): Promise<void> {
    const match = fullKey.match(HOMEPAGE_ASSET_KEY_PATTERN);
    if (!match?.groups) {
      throw new NotFoundException('File not found');
    }

    const tenantSchema = match.groups.tenantSchema;
    const talentId = match.groups.talentId;
    const quotedTenantSchema = quoteSqlIdentifier(tenantSchema, 'homepage asset tenant schema');
    const prisma = this.databaseService.getPrisma();

    const rows = await prisma.$queryRawUnsafe<
      Array<{ content: unknown; theme: unknown; ogImageUrl: string | null }>
    >(
      `
      SELECT v.content, v.theme, h.og_image_url as "ogImageUrl"
      FROM ${quotedTenantSchema}.talent_homepage h
      JOIN ${quotedTenantSchema}.homepage_version v ON v.id = h.published_version_id
      WHERE h.talent_id = $1::uuid
        AND h.is_published = true
        AND h.published_version_id IS NOT NULL
    `,
      talentId
    );

    const publicPath = `/public/assets/homepage-assets/${fullKey}`;
    const apiPublicPath = `/api/v1${publicPath}`;
    const isReferencedByPublishedHomepage = rows.some((row) => {
      const serialized = JSON.stringify([row.content, row.theme, row.ogImageUrl]);
      return (
        serialized.includes(publicPath) ||
        serialized.includes(apiPublicPath) ||
        serialized.includes(fullKey)
      );
    });

    if (!isReferencedByPublishedHomepage) {
      throw new NotFoundException('File not found');
    }
  }
}
