import { PublicPresenceManagementScreen } from '@/domains/public-presence-studio/screens/PublicPresenceManagementScreen';
import {
  ComponentStoreScreen,
  TemplateCenterScreen,
} from '@/domains/public-presence-studio/screens/public-presence-studio.catalog';
import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';

export default async function TalentHomepageManagementPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ tenantId: string; talentId: string }>;
  searchParams: Promise<{ surface?: string }>;
}>) {
  const { tenantId, talentId } = await params;
  const { surface } = await searchParams;

  return (
    <TalentBusinessAccessGate allowDraft tenantId={tenantId} talentId={talentId}>
      {surface === 'templates' ? (
        <TemplateCenterScreen talentId={talentId} tenantId={tenantId} />
      ) : surface === 'components' ? (
        <ComponentStoreScreen talentId={talentId} tenantId={tenantId} />
      ) : (
        <PublicPresenceManagementScreen tenantId={tenantId} talentId={talentId} />
      )}
    </TalentBusinessAccessGate>
  );
}
