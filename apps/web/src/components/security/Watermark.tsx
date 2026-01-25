// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useEffect, useState, useCallback } from 'react';

import { securityApi } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

interface WatermarkProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Invisible watermark component for security tracking.
 * 
 * This component injects hidden fingerprint data into the DOM that:
 * - Is NOT visible to users (completely hidden)
 * - CAN be discovered via DOM inspection or source code search
 * - Enables tracing of data leaks back to specific users
 * 
 * The watermark is embedded as:
 * 1. Hidden DOM elements with data attributes
 * 2. CSS custom properties
 * 3. Hidden spans in multiple locations
 */
export function Watermark({ children, className }: WatermarkProps) {
  const { user, tenantCode, isAuthenticated } = useAuthStore();
  const [fingerprintData, setFingerprintData] = useState<{
    fingerprint: string;
    shortFingerprint: string;
    version: string;
    generatedAt: string;
  } | null>(null);

  const fetchFingerprint = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      const response = await securityApi.generateFingerprint();
      if (response.success && response.data) {
        setFingerprintData(response.data);
      }
    } catch {
      // Silently fail - fingerprint is for security tracking, not critical for UX
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchFingerprint();
  }, [fetchFingerprint]);

  // Generate timestamp for watermark
  const timestamp = new Date().toISOString();

  return (
    <div 
      className={className}
      // Embed fingerprint in CSS custom properties (hidden but inspectable)
      style={{
        '--tcrn-fp': fingerprintData?.fingerprint || '',
        '--tcrn-fp-short': fingerprintData?.shortFingerprint || '',
        '--tcrn-fp-v': fingerprintData?.version || '',
        '--tcrn-fp-t': timestamp,
        '--tcrn-fp-u': user?.id || '',
        '--tcrn-fp-tn': tenantCode || '',
      } as React.CSSProperties}
    >
      {/* Hidden watermark elements - invisible but discoverable */}
      <InvisibleWatermark 
        fingerprint={fingerprintData?.fingerprint || ''}
        shortFingerprint={fingerprintData?.shortFingerprint || ''}
        version={fingerprintData?.version || ''}
        timestamp={timestamp}
        userId={user?.id || ''}
        tenantCode={tenantCode || ''}
      />
      {children}
    </div>
  );
}

interface InvisibleWatermarkProps {
  fingerprint: string;
  shortFingerprint: string;
  version: string;
  timestamp: string;
  userId: string;
  tenantCode: string;
}

/**
 * Invisible watermark that embeds tracking data in multiple hidden locations.
 * All elements use display: none or equivalent to be completely invisible.
 */
function InvisibleWatermark({
  fingerprint,
  shortFingerprint,
  version,
  timestamp,
  userId,
  tenantCode,
}: InvisibleWatermarkProps) {
  if (!fingerprint) return null;

  // Create obfuscated data for additional tracking
  const obfuscatedData = btoa(`${tenantCode}|${userId}|${timestamp}`);

  return (
    <>
      {/* Method 1: Hidden div with data attributes */}
      <div
        data-tcrn-watermark="true"
        data-tcrn-fp={fingerprint}
        data-tcrn-fp-short={shortFingerprint}
        data-tcrn-fp-version={version}
        data-tcrn-fp-timestamp={timestamp}
        data-tcrn-integrity={obfuscatedData}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Method 2: Hidden span with class-based markers */}
      <span
        className="tcrn-wm"
        data-v={version}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
        aria-hidden="true"
      >
        {/* Text content visible only in source/DOM inspection */}
        TCRN-FP:{shortFingerprint}:{timestamp}
      </span>

      {/* Method 3: Comment-like structure in noscript */}
      <noscript>
        <div data-fp={fingerprint} data-ts={timestamp} />
      </noscript>

      {/* Method 4: Hidden input fields for form submissions */}
      <input
        type="hidden"
        name="_tcrn_fp"
        value={fingerprint}
        data-generated-at={timestamp}
      />
      <input
        type="hidden"
        name="_tcrn_integrity"
        value={obfuscatedData}
      />

      {/* Method 5: Template element (not rendered but in DOM) */}
      <template data-tcrn-watermark-template="true">
        <div className="tcrn-watermark-data">
          <span data-key="fp">{fingerprint}</span>
          <span data-key="fps">{shortFingerprint}</span>
          <span data-key="v">{version}</span>
          <span data-key="t">{timestamp}</span>
          <span data-key="u">{userId}</span>
          <span data-key="tn">{tenantCode}</span>
        </div>
      </template>
    </>
  );
}
