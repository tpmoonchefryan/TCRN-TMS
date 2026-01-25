// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * JWT Payload for authentication
 */
export interface JwtPayload {
  sub: string; // user id
  tenantId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

/**
 * PII Access JWT Payload (PRD §11.6)
 */
export interface PiiJwtPayload {
  sub: string; // rm_profile_id
  userId: string;
  tenantId: string;
  permissions: string[];
  iat: number;
  exp: number;
}

/**
 * Login request
 */
export interface LoginRequest {
  username: string;
  password: string;
  totpCode?: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  requireTwoFactor?: boolean;
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * User session info
 */
export interface SessionInfo {
  userId: string;
  tenantId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isTotpEnabled: boolean;
}
