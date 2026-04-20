import { PrivateShell } from '@/platform/routing/PrivateShell';

export default async function TenantLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}>) {
  const { tenantId } = await params;

  return <PrivateShell tenantId={tenantId}>{children}</PrivateShell>;
}
