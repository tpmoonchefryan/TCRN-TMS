import { ProfileScreen } from '@/domains/profile/screens/ProfileScreen';

export default async function AcProfilePage(props: PageProps<'/ac/[tenantId]/profile'>) {
  const { tenantId } = await props.params;

  return <ProfileScreen tenantId={tenantId} workspaceKind="ac" />;
}
