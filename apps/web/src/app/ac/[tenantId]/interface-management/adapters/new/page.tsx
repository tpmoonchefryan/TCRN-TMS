import { InterfaceAddAdapterScreen } from '@/domains/interface-management/screens/InterfaceAddAdapterScreen';

type AcInterfaceAddAdapterPageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcInterfaceAddAdapterPage(props: AcInterfaceAddAdapterPageProps) {
  const { tenantId } = await props.params;

  return <InterfaceAddAdapterScreen tenantId={tenantId} workspaceKind="ac" />;
}
