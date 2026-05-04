import { ProfileScreen } from '@/domains/profile/screens/ProfileScreen';

type AcRoutePageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function AcProfilePage(props: AcRoutePageProps) {
  const { tenantId } = await props.params;

  return <ProfileScreen tenantId={tenantId} workspaceKind="ac" />;
}
