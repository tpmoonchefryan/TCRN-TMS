// SPDX-License-Identifier: Apache-2.0

export const MARSHMALLOW_EXPORT_DOWNLOAD_TTL_DAYS = 7;

export const getMarshmallowExportJobExpiryAt = (now: Date = new Date()): Date => {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + MARSHMALLOW_EXPORT_DOWNLOAD_TTL_DAYS);
  return expiresAt;
};
