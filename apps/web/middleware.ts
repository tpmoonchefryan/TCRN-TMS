// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { NextRequest } from 'next/server';

import { proxy } from './src/proxy';

export function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
