import { redirect } from 'next/navigation';

export default async function AcIndexPage(props: PageProps<'/ac/[tenantId]'>) {
  const { tenantId } = await props.params;

  redirect(`/ac/${tenantId}/tenants`);
}
