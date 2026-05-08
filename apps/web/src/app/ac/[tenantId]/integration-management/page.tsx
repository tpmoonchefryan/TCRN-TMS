import { redirect } from 'next/navigation';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcIntegrationManagementPage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  redirect(`/ac/${tenantId}/interface-management`);
}
