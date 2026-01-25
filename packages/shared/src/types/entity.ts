// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

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
 * Multilingual text fields
 */
export interface MultilingualText {
  en: string;
  zh?: string;
  jp?: string;
}

/**
 * Configuration entity base (PRD §10.1)
 */
export interface ConfigEntity extends BaseEntity {
  ownerLevel: OwnerLevel;
  ownerLevelId: string;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJp?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJp?: string;
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

/**
 * Supported languages (PRD supports zh/en/ja)
 */
export type SupportedLanguage = 'zh' | 'en' | 'ja';
