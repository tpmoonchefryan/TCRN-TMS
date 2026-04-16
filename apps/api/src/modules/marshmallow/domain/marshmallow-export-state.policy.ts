// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export const MARSHMALLOW_EXPORT_DOWNLOAD_TTL_DAYS = 7;

export const getMarshmallowExportJobExpiryAt = (now: Date = new Date()): Date => {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + MARSHMALLOW_EXPORT_DOWNLOAD_TTL_DAYS);
  return expiresAt;
};
