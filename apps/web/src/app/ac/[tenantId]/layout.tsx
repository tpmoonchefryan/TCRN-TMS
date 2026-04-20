import { AcShell } from '@/platform/routing/AcShell';

export default async function AcLayout(props: LayoutProps<'/ac/[tenantId]'>) {
  const { tenantId } = await props.params;

  return <AcShell tenantId={tenantId}>{props.children}</AcShell>;
}
