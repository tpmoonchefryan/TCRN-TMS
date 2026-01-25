// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Role } from './db-schema';
import { ActionType, EffectType } from './enums';

export interface Permission {
  id: string;
  resource_code: string;
  action: ActionType;
  effect: EffectType;
  name?: string;
  description?: string;
  is_system?: boolean;
}

export interface ResourceDefinition {
  module: string;
  module_name: string;
  resources: {
    code: string;
    name: string;
    actions: ActionType[];
  }[];
}

export interface RoleDetail extends Role {
  permissions: Permission[];
  user_count?: number;
}

export interface CreateRoleRequest {
  code: string;
  name_en: string;
  name_zh?: string;
  name_ja?: string;
  description?: string;
  permission_ids: string[];
}

export interface UpdateRoleRequest {
  name_en?: string;
  name_zh?: string;
  name_ja?: string;
  description?: string;
}
