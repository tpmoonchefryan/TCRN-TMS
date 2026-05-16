// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) - PolyForm Noncommercial License

import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { Public } from '../../../common/decorators';
import { RateLimiterGuard } from '../../../common/guards/rate-limiter.guard';
import { PublicHomepageProjectionService } from '../services/public-homepage-projection.service';

const PUBLIC_HOMEPAGE_SCHEMA = {
  type: 'object',
  properties: {
    projectionSchemaVersion: { type: 'string', example: '1.0' },
    resolvedRevealPhase: { type: 'string', example: 'always' },
    route: {
      type: 'object',
      properties: {
        canonicalPath: { type: 'string', example: '/tenant-a/aki/homepage' },
        legacyPath: { type: 'string', nullable: true, example: 'aki-home' },
        tenantCode: { type: 'string', nullable: true, example: 'tenant-a' },
        talentCode: { type: 'string', nullable: true, example: 'aki' },
        domainHostname: { type: 'string', nullable: true, example: null },
      },
      required: [
        'canonicalPath',
        'legacyPath',
        'tenantCode',
        'talentCode',
        'domainHostname',
      ],
    },
    metadata: {
      type: 'object',
      properties: {
        title: { type: 'string', nullable: true, example: 'Aki Homepage' },
        description: { type: 'string', nullable: true, example: 'Official homepage' },
        canonicalPath: { type: 'string', example: '/tenant-a/aki/homepage' },
        ogImageAlt: { type: 'string', nullable: true, example: 'Aki homepage preview' },
      },
      required: ['title', 'description', 'canonicalPath', 'ogImageAlt'],
    },
    appearance: {
      type: 'object',
      properties: {
        theme: {
          type: 'object',
          additionalProperties: true,
        },
      },
      required: ['theme'],
    },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
      },
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
      },
    },
    media: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
      },
    },
  },
  required: [
    'projectionSchemaVersion',
    'resolvedRevealPhase',
    'route',
    'metadata',
    'appearance',
    'sections',
    'actions',
    'media',
  ],
  example: {
    projectionSchemaVersion: '1.0',
    resolvedRevealPhase: 'always',
    route: {
      canonicalPath: '/tenant-a/aki/homepage',
      legacyPath: null,
      tenantCode: 'tenant-a',
      talentCode: 'aki',
      domainHostname: null,
    },
    metadata: {
      title: 'Aki Homepage',
      description: 'Official homepage',
      canonicalPath: '/tenant-a/aki/homepage',
      ogImageAlt: 'Aki homepage preview',
    },
    appearance: {
      theme: {
        preset: 'soft',
      },
    },
    sections: [
      {
        id: 'hero',
        sectionType: 'hero',
        title: 'Aki Rosenthal',
      },
    ],
    actions: [],
    media: [],
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
  constructor(
    private readonly publicHomepageProjectionService: PublicHomepageProjectionService,
  ) {}

  @Get(':tenantCode/:talentCode')
  @Public()
  @UseGuards(RateLimiterGuard)
  @ApiResponse({
    status: 200,
    description: 'Returns homepage projection via canonical shared-domain route',
    schema: PUBLIC_HOMEPAGE_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Homepage not found',
    schema: PUBLIC_HOMEPAGE_NOT_FOUND_SCHEMA,
  })
  async getPublicHomepageByCodes(
    @Param('tenantCode') tenantCode: string,
    @Param('talentCode') talentCode: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const internalProjection =
      await this.publicHomepageProjectionService.getPublishedHomepageProjectionByCodesOrThrow(
        tenantCode,
        talentCode,
      );
    const projection =
      this.publicHomepageProjectionService.toPublicProjection(internalProjection);

    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=900',
      'CDN-Cache-Control': 'public, max-age=900',
      'ETag': `"${internalProjection.projectionHash}"`,
      'Surrogate-Key': internalProjection.route.cacheKeys.join(' '),
      'X-Public-Presence-Projection-Hash': internalProjection.projectionHash,
    });

    return projection;
  }

  @Get(':path')
  @Public()
  @UseGuards(RateLimiterGuard)
  @ApiResponse({
    status: 200,
    description: 'Returns homepage projection',
    schema: PUBLIC_HOMEPAGE_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Homepage not found',
    schema: PUBLIC_HOMEPAGE_NOT_FOUND_SCHEMA,
  })
  async getPublicHomepageByLegacyPath(
    @Param('path') path: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const internalProjection =
      await this.publicHomepageProjectionService.getPublishedHomepageProjectionOrThrow(
        path,
      );
    const projection =
      this.publicHomepageProjectionService.toPublicProjection(internalProjection);

    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=900',
      'CDN-Cache-Control': 'public, max-age=900',
      'ETag': `"${internalProjection.projectionHash}"`,
      'Surrogate-Key': internalProjection.route.cacheKeys.join(' '),
      'X-Public-Presence-Projection-Hash': internalProjection.projectionHash,
    });

    return projection;
  }
}
