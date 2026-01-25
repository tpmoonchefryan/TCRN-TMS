// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Change Log Diff format
 * Uses simplified Before/After format
 */
export interface ChangeLogDiff {
  [field: string]: {
    old: unknown;
    new: unknown;
  };
}

/**
 * Change action types
 */
export type ChangeAction = 
  | 'create' 
  | 'update' 
  | 'deactivate' 
  | 'reactivate' 
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'approve'
  | 'reject'
  | 'reply'
  | 'cancel'
  | 'regenerate_key'
  | 'restore'
  | 'disable_inherited'
  | 'enable_inherited';

/**
 * Complete Change Log entry
 */
export interface ChangeLogEntry {
  id: string;
  occurredAt: Date;
  operatorId: string | null;
  operatorName: string | null;
  action: ChangeAction;
  objectType: string;
  objectId: string;
  objectName: string | null;
  diff: ChangeLogDiff | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
}

/**
 * DTO for creating change log
 */
export interface CreateChangeLogDto {
  action: ChangeAction;
  objectType: string;
  objectId: string;
  objectName?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

/**
 * Request context for logging
 */
export interface RequestContext {
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  tenantId?: string;
  tenantSchema?: string;
}
