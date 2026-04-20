import { UserManagementScreen } from '@/domains/user-management/screens/UserManagementScreen';

export default function AcUserManagementPage(_: PageProps<'/ac/[tenantId]/user-management'>) {
  return <UserManagementScreen workspaceKind="ac" />;
}
