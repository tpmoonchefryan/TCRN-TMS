// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Navigation module - wraps Next.js navigation for i18n support
 * This module re-exports navigation utilities from next/navigation
 * In future, can be swapped for next-intl/navigation when i18n routing is enabled
 */

export { default as Link } from 'next/link';
export { usePathname, useRouter, useSearchParams } from 'next/navigation';
