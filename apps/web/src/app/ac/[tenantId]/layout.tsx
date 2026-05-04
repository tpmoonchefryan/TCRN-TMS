import type { ReactNode } from 'react';

import { AcShell } from '@/platform/routing/AcShell';

type AcLayoutProps = {
  children: ReactNode;
  params: Promise<{ tenantId: string }>;
};

export default async function AcLayout(props: AcLayoutProps) {
  const { tenantId } = await props.params;

  return <AcShell tenantId={tenantId}>{props.children}</AcShell>;
}
