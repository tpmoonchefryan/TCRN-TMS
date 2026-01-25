// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Application configuration constants
 */
export const AppConfig = {
  /**
   * Supported languages (PRD supports zh/en/ja)
   */
  SUPPORTED_LANGUAGES: ['en', 'zh', 'ja'] as const,

  /**
   * Default language
   */
  DEFAULT_LANGUAGE: 'en' as const,

  /**
   * Pagination defaults
   */
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },

  /**
   * JWT configuration (PRD §19 P-10)
   */
  JWT: {
    ACCESS_TOKEN_TTL: 15 * 60, // 15 minutes
    REFRESH_TOKEN_TTL: 12 * 60 * 60, // 12 hours
    PII_TOKEN_TTL: 5 * 60, // 5 minutes (PRD §21)
  },

  /**
   * Password policy (PRD §12.3)
   */
  PASSWORD: {
    MIN_LENGTH: 12,
    EXPIRY_DAYS: 90,
    HISTORY_COUNT: 5, // Prevent reuse of last N passwords
  },

  /**
   * Two-factor authentication (PRD §12.9)
   */
  TOTP: {
    RECOVERY_CODES_COUNT: 10,
    ISSUER: 'TCRN-TMS',
  },

  /**
   * Import limits (PRD §21)
   */
  IMPORT: {
    MAX_ROWS: 50000,
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_EXTENSIONS: ['.csv'],
  },

  /**
   * Report configuration (PRD §20.1)
   */
  REPORT: {
    MAX_ROWS: 50000,
    PRESIGNED_URL_TTL: 15 * 60, // 15 minutes
    WORKER_CONCURRENCY: 1,
  },

  /**
   * Cache TTL (seconds)
   */
  CACHE: {
    PERMISSION_SNAPSHOT_TTL: 0, // No TTL for permission cache (PRD §12.6)
    PERMISSION_REFRESH_INTERVAL: 6 * 60 * 60, // 6 hours full refresh
    CDN_DEFAULT_MAX_AGE: 300, // 5 minutes (PRD §16.2)
    CDN_DEFAULT_S_MAXAGE: 900, // 15 minutes
  },

  /**
   * Log retention (PRD §4.4)
   */
  LOG_RETENTION: {
    STAGING_DAYS: 30,
    PRODUCTION_DAYS: 60,
  },

  /**
   * Rate limiting defaults
   */
  RATE_LIMIT: {
    GLOBAL_POINTS: 100,
    GLOBAL_DURATION: 60, // seconds
    LOGIN_POINTS: 5,
    LOGIN_DURATION: 300, // 5 minutes
  },
} as const;

/**
 * UI Theme colors (PRD §5)
 */
export const DefaultThemeColors = {
  PRIMARY: '#5599FF', // Blue
  ACCENT: '#FF88CC', // Pink
  BACKGROUND: '#FFFFFF', // White
  MUTED: '#F5F7FA', // Grey
} as const;
