// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * TCRN TMS - Database Package
 * Prisma Client and database utilities
 */

export * from './client';

// Re-export Prisma types for convenience
export type {
  // Public Schema
  Tenant,
  GlobalConfig,
  
  // Organization
  Subsidiary,
  Talent,
  
  // User & Permission
  SystemUser,
  RecoveryCode,
  Role,
  Resource,
  Policy,
  RolePolicy,
  UserRole,
  DelegatedAdmin,
  RefreshToken,
  
  // Customer Management
  PiiServiceConfig,
  ProfileStore,
  CustomerProfile,
  CustomerCompanyInfo,
  CustomerExternalId,
  CustomerAccessLog,
  PlatformIdentity,
  PlatformIdentityHistory,
  MembershipRecord,
  ConsentAgreement,
  
  // Configuration Entities
  BusinessSegment,
  CommunicationType,
  AddressType,
  CustomerStatus,
  ReasonCategory,
  InactivationReason,
  MembershipClass,
  MembershipType,
  MembershipLevel,
  Consent,
  Consumer,
  SocialPlatform,
  BlocklistEntry,
  IpAccessRule,
  
  // Logging
  ChangeLog,
  TechnicalEventLog,
  IntegrationLog,
  
  // External Pages
  TalentHomepage,
  HomepageVersion,
  MarshmallowConfig,
  MarshmallowMessage,
  MarshmallowReaction,
  ExternalBlocklistPattern,
  
  // Jobs
  ImportJob,
  ReportJob,
  
  // Integration
  IntegrationAdapter,
  AdapterConfig,
  Webhook,
} from '@prisma/client';
