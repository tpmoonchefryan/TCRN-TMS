const FALLBACK_FRONTEND_URL = 'http://localhost:3000';
const FALLBACK_PUBLIC_API_ORIGIN = 'http://localhost:4000';

export const BRAND_BACKGROUND_COLOR = '#f7f3f4';
export const BRAND_THEME_COLOR = '#9b9ddd';
export const DEFAULT_OG_IMAGE_PATH = '/artwork/og/system-og-default.png';
export const DEFAULT_OG_IMAGE_ALT = 'TCRN TMS social preview';

export function resolveMetadataBase() {
  const value = process.env.FRONTEND_URL?.trim() || FALLBACK_FRONTEND_URL;

  try {
    return new URL(value);
  } catch {
    return new URL(FALLBACK_FRONTEND_URL);
  }
}

export function resolvePublicApiOrigin() {
  return process.env.TMS_API_ORIGIN?.trim() || FALLBACK_PUBLIC_API_ORIGIN;
}
