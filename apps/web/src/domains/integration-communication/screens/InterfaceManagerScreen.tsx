// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { AdapterManager } from '@/components/integration/AdapterManager';

export function InterfaceManagerScreen() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <AdapterManager ownerType="tenant" />
    </div>
  );
}
