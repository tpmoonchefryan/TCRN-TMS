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

const PUBLIC_HOMEPAGE_SCHEMA = {
  type: 'object',
  properties: {
    talent: {
      type: 'object',
      properties: {
        displayName: { type: 'string', example: 'Aki Rosenthal' },
        avatarUrl: { type: 'string', nullable: true, example: 'https://cdn.example.com/avatars/aki.png' },
        timezone: { type: 'string', nullable: true, example: 'Asia/Tokyo' },
      },
      required: ['displayName', 'avatarUrl', 'timezone'],
    },
    content: {
      type: 'object',
      additionalProperties: true,
      example: {
        components: [
          {
            id: 'hero_001',
            type: 'hero',
          },
        ],
      },
    },
    theme: {
      type: 'object',
      additionalProperties: true,
      example: {
        palette: 'sunrise',
      },
    },
    seo: {
      type: 'object',
      properties: {
        title: { type: 'string', nullable: true, example: 'Aki Homepage' },
        description: { type: 'string', nullable: true, example: 'Official homepage' },
        ogImageUrl: { type: 'string', nullable: true, example: 'https://cdn.example.com/og/aki.png' },
      },
      required: ['title', 'description', 'ogImageUrl'],
    },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T13:30:00.000Z' },
  },
  required: ['talent', 'content', 'theme', 'seo', 'updatedAt'],
  example: {
    talent: {
      displayName: 'Aki Rosenthal',
      avatarUrl: 'https://cdn.example.com/avatars/aki.png',
      timezone: 'Asia/Tokyo',
    },
    content: {
      components: [
        {
          id: 'hero_001',
          type: 'hero',
        },
      ],
    },
    theme: {
      palette: 'sunrise',
    },
    seo: {
      title: 'Aki Homepage',
      description: 'Official homepage',
      ogImageUrl: 'https://cdn.example.com/og/aki.png',
    },
    updatedAt: '2026-04-13T13:30:00.000Z',
  },
};

const PUBLIC_HOMEPAGE_NOT_FOUND_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'RES_NOT_FOUND' },
        message: { type: 'string', example: 'Homepage not found or not published' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code: 'RES_NOT_FOUND',
      message: 'Homepage not found or not published',
    },
  },
};

@ApiTags('Public - Homepage')
@Controller('public/homepage')
export class PublicHomepageController {
  constructor(private readonly publicHomepageService: PublicHomepageService) {}

  /**
   * Get public homepage data (JSON API)
   */
  @Get('*path')
  @Public()
  @UseGuards(RateLimiterGuard)
  @ApiResponse({ status: 200, description: 'Returns homepage content', schema: PUBLIC_HOMEPAGE_SCHEMA })
  @ApiResponse({ status: 404, description: 'Homepage not found', schema: PUBLIC_HOMEPAGE_NOT_FOUND_SCHEMA })
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
