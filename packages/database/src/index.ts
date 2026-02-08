// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * TCRN TMS - Database Package
 * Prisma Client and database utilities
 */

export * from './client';

// Re-export Prisma types for convenience
export type {
  AdapterConfig,
  AddressType,
  BlocklistEntry,
  // Configuration Entities
  BusinessSegment,
  // Logging
  ChangeLog,
  CommunicationType,
  Consent,
  ConsentAgreement,
  Consumer,
  CustomerAccessLog,
  CustomerCompanyInfo,
  CustomerExternalId,
  CustomerProfile,
  CustomerStatus,
  DelegatedAdmin,
  ExternalBlocklistPattern,
  GlobalConfig,
  HomepageVersion,
  // Jobs
  ImportJob,
  InactivationReason,
  // Integration
  IntegrationAdapter,
  IntegrationLog,
  IpAccessRule,
  MarshmallowConfig,
  MarshmallowMessage,
  MarshmallowReaction,
  MembershipClass,
  MembershipLevel,
  MembershipRecord,
  MembershipType,
  // Customer Management
  PiiServiceConfig,
  PlatformIdentity,
  PlatformIdentityHistory,
  Policy,
  ProfileStore,
  ReasonCategory,
  RecoveryCode,
  RefreshToken,
  ReportJob,
  Resource,
  Role,
  RolePolicy,
  SocialPlatform,
  // Organization
  Subsidiary,
  // User & Permission
  SystemUser,
  Talent,
  // External Pages
  TalentHomepage,
  TechnicalEventLog,
  // Public Schema
  Tenant,
  UserRole,
  Webhook,
} from '@prisma/client';
