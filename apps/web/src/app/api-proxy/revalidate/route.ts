// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to revalidate cached pages on demand.
 * Called after publish/unpublish operations to ensure users see the latest content.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, secret } = body;

    // Validate secret if provided (for external calls)
    // For internal frontend calls, we rely on same-origin protection
    if (secret && secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Invalid revalidation secret' },
        { status: 401 }
      );
    }

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Path is required' },
        { status: 400 }
      );
    }

    // Sanitize path - remove leading slashes and ensure it's a valid path segment
    const sanitizedPath = path.replace(/^\/+/, '').replace(/[^a-z0-9\-_]/gi, '');
    
    if (!sanitizedPath) {
      return NextResponse.json(
        { success: false, error: 'Invalid path' },
        { status: 400 }
      );
    }

    // Revalidate the public homepage path
    revalidatePath(`/p/${sanitizedPath}`);

    return NextResponse.json({
      success: true,
      revalidated: true,
      path: `/p/${sanitizedPath}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revalidate' },
      { status: 500 }
    );
  }
}
