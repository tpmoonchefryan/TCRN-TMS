// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, ConflictException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import type { SubsidiaryData } from './subsidiary-read.policy';

export interface SubsidiaryCreateInput {
  parentId?: string | null;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  sortOrder?: number;
}

export interface SubsidiaryUpdateInput {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  sortOrder?: number;
  version: number;
}

export const MAX_SUBSIDIARY_DEPTH = 10;

export const buildSubsidiaryPath = (
  code: string,
  parent: Pick<SubsidiaryData, 'path' | 'depth'> | null,
): { path: string; depth: number } => {
  if (!parent) {
    return {
      path: `/${code}/`,
      depth: 1,
    };
  }

  const depth = parent.depth + 1;

  if (depth > MAX_SUBSIDIARY_DEPTH) {
    throw new BadRequestException({
      code: 'MAX_DEPTH_EXCEEDED',
      message: `Maximum nesting depth of ${MAX_SUBSIDIARY_DEPTH} exceeded`,
    });
  }

  return {
    path: `${parent.path}${code}/`,
    depth,
  };
};

export const assertSubsidiaryVersion = (
  currentVersion: number,
  requestedVersion: number,
): void => {
  if (currentVersion !== requestedVersion) {
    throw new BadRequestException({
      code: ErrorCodes.RES_VERSION_MISMATCH,
      message: 'Data has been modified. Please refresh and try again.',
    });
  }
};

export const throwRetiredSubsidiaryMoveError = (): never => {
  throw new ConflictException({
    code: ErrorCodes.RES_CONFLICT,
    message:
      'Subsidiary move has been retired from normal product flow. If structural correction is required, it must be performed via direct database intervention.',
  });
};
