// SPDX-License-Identifier: Apache-2.0
import type { LocalizedText } from '../constants/locale';

/**
 * Base entity with common fields
 * PRD §10.1 通用字段
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  version: number;
}

/**
 * Configuration entity base (PRD §10.1)
 */
export interface ConfigEntity extends BaseEntity {
  ownerLevel: OwnerLevel;
  ownerLevelId: string;
  code: string;
  name: LocalizedText;
  description?: LocalizedText;
  isActive: boolean;
}

/**
 * Owner level types (PRD §7)
 */
export type OwnerLevel = 'TENANT' | 'SUBSIDIARY' | 'TALENT';

/**
 * Profile type (individual or company)
 */
export type ProfileType = 'individual' | 'company';

/**
 * Gender options (PRD §14 System Dictionary)
 */
export type Gender = 'male' | 'female' | 'other' | 'undisclosed';
