// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Controller,
    Get,
    Param,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { Public } from '../../../common/decorators';
import { RateLimiterGuard } from '../../../common/guards/rate-limiter.guard';
import { PublicHomepageService } from '../services/public-homepage.service';

@ApiTags('Public Homepage')
@Controller('public/homepage')
export class PublicHomepageController {
  constructor(private readonly publicHomepageService: PublicHomepageService) {}

  /**
   * Get public homepage data (JSON API)
   */
  @Get('*path')
  @Public()
  @UseGuards(RateLimiterGuard)
  @ApiResponse({ status: 200, description: 'Returns homepage content' })
  @ApiResponse({ status: 404, description: 'Homepage not found' })
  async getPublicHomepage(
    @Param('path') path: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.publicHomepageService.getPublishedHomepageOrThrow(path);

    // Set cache headers
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=900',
      'CDN-Cache-Control': 'public, max-age=900',
      'ETag': `"${Buffer.from(data.updatedAt).toString('base64')}"`,
    });

    return {
      talent: data.talent,
      content: data.content,
      theme: data.theme,
      seo: data.seo,
      updatedAt: data.updatedAt,
    };
  }
}
