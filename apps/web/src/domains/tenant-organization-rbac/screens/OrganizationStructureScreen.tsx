// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { FolderTree, Loader2, Plus, Search, Settings, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { OrganizationTree, TreeNode } from '@/components/organization/organization-tree';
import {
  buildOrganizationNodeRoute,
  flattenOrganizationSubsidiaries,
  organizationManagementApi,
  type ProfileStoreSummaryRecord,
} from '@/domains/tenant-organization-rbac/api/organization-management.api';
import { useTalentStore } from '@/platform/state/talent-store';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/platform/ui';

export function OrganizationStructureScreen() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('organizationPage');
  const tc = useTranslations('common');
  const tenantId = params.tenantId as string;

  const {
    organizationTree,
    directTalents,
    currentTenantCode,
    setOrganizationTree,
    setDirectTalents,
  } = useTalentStore();

  // Refresh organization tree from API
  const refreshOrganization = useCallback(async () => {
    try {
      const response = await organizationManagementApi.getTree();
      if (response.success && response.data) {
        setOrganizationTree(response.data.subsidiaries || []);
        setDirectTalents(response.data.directTalents || []);
      }
    } catch {
      // Silently fail - tree will remain unchanged
    }
  }, [setOrganizationTree, setDirectTalents]);

  // Search state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Handle search
  useEffect(() => {
    const performSearch = async () => {
      setIsSearching(true);
      try {
        const response = await organizationManagementApi.getTree({
          search: debouncedSearch || undefined,
          includeInactive: false,
        });
        if (response.success && response.data) {
          setOrganizationTree(response.data.subsidiaries || []);
          setDirectTalents(response.data.directTalents || []);
        }
      } catch (error) {
        console.error('Failed to search organization:', error);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearch, setOrganizationTree, setDirectTalents]);

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  // Dialog states
  const [showSubsidiaryDialog, setShowSubsidiaryDialog] = useState(false);
  const [showTalentDialog, setShowTalentDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Subsidiary form state
  const [subsidiaryForm, setSubsidiaryForm] = useState({
    code: '',
    nameEn: '',
    nameZh: '',
    nameJa: '',
    parentId: '',
  });

  // Talent form state
  const [talentForm, setTalentForm] = useState({
    code: '',
    nameEn: '',
    displayName: '',
    nameZh: '',
    nameJa: '',
    subsidiaryId: '',
    homepagePath: '',
    profileStoreId: '',
  });

  // Profile Store list for talent creation
  const [profileStores, setProfileStores] = useState<ProfileStoreSummaryRecord[]>([]);

  // Fetch Profile Stores using dedicated API
  useEffect(() => {
    const fetchProfileStores = async () => {
      try {
        const response = await organizationManagementApi.listProfileStores();
        if (response.success && response.data?.items) {
          setProfileStores(response.data.items);
        }
      } catch {
        // Silently fail - profile stores will be empty
      }
    };
    fetchProfileStores();
  }, []);

  // Use store data only - no mock fallback
  const subsidiaries = organizationTree;
  const talents = directTalents;
  const tenantName = currentTenantCode || t('currentTenant');

  const flatSubsidiaries = flattenOrganizationSubsidiaries(subsidiaries);

  // Create subsidiary handler
  const handleCreateSubsidiary = async () => {
    if (!subsidiaryForm.code || !subsidiaryForm.nameEn) {
      toast.error(t('fillRequiredFields'));
      return;
    }

    setIsCreating(true);
    try {
      const response = await organizationManagementApi.createSubsidiary({
        code: subsidiaryForm.code.toUpperCase(),
        nameEn: subsidiaryForm.nameEn,
        nameZh: subsidiaryForm.nameZh || undefined,
        nameJa: subsidiaryForm.nameJa || undefined,
        parentId: subsidiaryForm.parentId || null,
      });

      if (response.success) {
        toast.success(t('subsidiaryCreated'));
        setShowSubsidiaryDialog(false);
        setSubsidiaryForm({ code: '', nameEn: '', nameZh: '', nameJa: '', parentId: '' });
        // Refresh organization tree
        refreshOrganization();
      } else {
        toast.error(response.error?.message || t('subsidiaryCreateFailed'));
      }
    } catch (error: unknown) {
      const description =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : t('subsidiaryCreateFailed');

      toast.error(description);
    } finally {
      setIsCreating(false);
    }
  };

  // Create talent handler
  const handleCreateTalent = async () => {
    if (
      !talentForm.code ||
      !talentForm.nameEn ||
      !talentForm.displayName ||
      !talentForm.profileStoreId
    ) {
      toast.error(t('fillRequiredFieldsWithProfileStore'));
      return;
    }

    setIsCreating(true);
    try {
      const response = await organizationManagementApi.createTalent({
        code: talentForm.code.toUpperCase(),
        nameEn: talentForm.nameEn,
        displayName: talentForm.displayName,
        nameZh: talentForm.nameZh || undefined,
        nameJa: talentForm.nameJa || undefined,
        subsidiaryId: talentForm.subsidiaryId || undefined,
        homepagePath: talentForm.homepagePath || undefined,
        profileStoreId: talentForm.profileStoreId,
      });

      if (response.success) {
        toast.success(t('talentCreated'));
        setShowTalentDialog(false);
        setTalentForm({
          code: '',
          nameEn: '',
          displayName: '',
          nameZh: '',
          nameJa: '',
          subsidiaryId: '',
          homepagePath: '',
          profileStoreId: '',
        });
        // Refresh organization tree
        refreshOrganization();
      } else {
        toast.error(response.error?.message || t('talentCreateFailed'));
      }
    } catch (error: unknown) {
      const description =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : t('talentCreateFailed');

      toast.error(description);
    } finally {
      setIsCreating(false);
    }
  };

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const handleNavigate = (node: TreeNode, action: 'details' | 'settings') => {
    if (!node.id || !tenantId) {
      return;
    }

    router.push(
      buildOrganizationNodeRoute({
        tenantId,
        node,
        action,
        subsidiaries,
      })
    );
  };

  // Empty state when no organization data
  const isEmpty = subsidiaries.length === 0 && talents.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSubsidiaryDialog(true)}>
            <Plus size={16} className="mr-2" />
            {t('addSubsidiary')}
          </Button>
          <Button onClick={() => setShowTalentDialog(true)}>
            <Plus size={16} className="mr-2" />
            {t('addTalent')}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {(search || isSearching) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isSearching ? (
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              ) : (
                <button onClick={() => setSearch('')}>
                  <X className="text-muted-foreground hover:text-foreground h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tree View */}
        <div className="lg:col-span-2">
          {isEmpty ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <FolderTree className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">{t('emptyTitle')}</h3>
                <p className="text-muted-foreground mb-6 max-w-md">{t('emptyDescription')}</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowSubsidiaryDialog(true)}>
                    <Plus size={16} className="mr-2" />
                    {t('addSubsidiary')}
                  </Button>
                  <Button onClick={() => setShowTalentDialog(true)}>
                    <Plus size={16} className="mr-2" />
                    {t('addTalent')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <OrganizationTree
              tenantName={tenantName}
              tenantId={tenantId}
              subsidiaries={subsidiaries}
              directTalents={talents}
              selectable
              selectedNode={selectedNode}
              onNodeSelect={handleNodeSelect}
              navigable
              onNavigate={handleNavigate}
              showSettings
            />
          )}
        </div>

        {/* Selected Node Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{selectedNode ? selectedNode.displayName : t('selectItem')}</CardTitle>
              <CardDescription>
                {selectedNode ? `${tc('type')}: ${tc(selectedNode.type)}` : t('clickToSeeDetails')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-muted-foreground text-sm font-medium">
                      {tc('code')}
                    </label>
                    <p className="font-mono text-sm">{selectedNode.code}</p>
                  </div>
                  {selectedNode.path && (
                    <div>
                      <label className="text-muted-foreground text-sm font-medium">
                        {tc('source')}
                      </label>
                      <p className="font-mono text-sm">{selectedNode.path}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleNavigate(selectedNode, 'details')}
                    >
                      {tc('edit')}
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleNavigate(selectedNode, 'settings')}
                    >
                      <Settings size={16} className="mr-2" />
                      {tc('actions')}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{t('selectItemHint')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Subsidiary Dialog */}
      <Dialog open={showSubsidiaryDialog} onOpenChange={setShowSubsidiaryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addSubsidiary')}</DialogTitle>
            <DialogDescription>{t('addSubsidiaryDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sub-code">{tc('code')} *</Label>
              <Input
                id="sub-code"
                placeholder={t('subsidiaryCodePlaceholder')}
                value={subsidiaryForm.code}
                onChange={(e) =>
                  setSubsidiaryForm({ ...subsidiaryForm, code: e.target.value.toUpperCase() })
                }
              />
              <p className="text-muted-foreground text-xs">{t('codeHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-name-en">{tc('name')} (English) *</Label>
              <Input
                id="sub-name-en"
                placeholder={t('subsidiaryNamePlaceholder')}
                value={subsidiaryForm.nameEn}
                onChange={(e) => setSubsidiaryForm({ ...subsidiaryForm, nameEn: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sub-name-zh">{tc('name')} (中文)</Label>
                <Input
                  id="sub-name-zh"
                  placeholder={t('subsidiaryNameZhPlaceholder')}
                  value={subsidiaryForm.nameZh}
                  onChange={(e) => setSubsidiaryForm({ ...subsidiaryForm, nameZh: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub-name-ja">{tc('name')} (日本語)</Label>
                <Input
                  id="sub-name-ja"
                  placeholder={t('subsidiaryNameJaPlaceholder')}
                  value={subsidiaryForm.nameJa}
                  onChange={(e) => setSubsidiaryForm({ ...subsidiaryForm, nameJa: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-parent">{t('parentSubsidiary')}</Label>
              <Select
                value={subsidiaryForm.parentId}
                onValueChange={(value) =>
                  setSubsidiaryForm({ ...subsidiaryForm, parentId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectParent')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('noParent')}</SelectItem>
                  {flatSubsidiaries.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubsidiaryDialog(false)}
              disabled={isCreating}
            >
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreateSubsidiary} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Talent Dialog */}
      <Dialog open={showTalentDialog} onOpenChange={setShowTalentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addTalent')}</DialogTitle>
            <DialogDescription>{t('addTalentDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="talent-code">{tc('code')} *</Label>
              <Input
                id="talent-code"
                placeholder={t('talentCodePlaceholder')}
                value={talentForm.code}
                onChange={(e) =>
                  setTalentForm({ ...talentForm, code: e.target.value.toUpperCase() })
                }
              />
              <p className="text-muted-foreground text-xs">{t('codeHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="talent-name-en">{tc('name')} (English) *</Label>
              <Input
                id="talent-name-en"
                placeholder={t('talentNamePlaceholder')}
                value={talentForm.nameEn}
                onChange={(e) => setTalentForm({ ...talentForm, nameEn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="talent-display-name">{t('displayName')} *</Label>
              <Input
                id="talent-display-name"
                placeholder={t('displayNamePlaceholder')}
                value={talentForm.displayName}
                onChange={(e) => setTalentForm({ ...talentForm, displayName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="talent-name-zh">{tc('name')} (中文)</Label>
                <Input
                  id="talent-name-zh"
                  placeholder={t('talentNameZhPlaceholder')}
                  value={talentForm.nameZh}
                  onChange={(e) => setTalentForm({ ...talentForm, nameZh: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="talent-name-ja">{tc('name')} (日本語)</Label>
                <Input
                  id="talent-name-ja"
                  placeholder={t('talentNameJaPlaceholder')}
                  value={talentForm.nameJa}
                  onChange={(e) => setTalentForm({ ...talentForm, nameJa: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="talent-profile-store">{t('profileStore')} *</Label>
              <Select
                value={talentForm.profileStoreId}
                onValueChange={(value) => setTalentForm({ ...talentForm, profileStoreId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectProfileStore')} />
                </SelectTrigger>
                <SelectContent>
                  {profileStores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} ({store.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">{t('profileStoreHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="talent-subsidiary">{t('subsidiary')}</Label>
              <Select
                value={talentForm.subsidiaryId}
                onValueChange={(value) =>
                  setTalentForm({ ...talentForm, subsidiaryId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectSubsidiary')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('directTalent')}</SelectItem>
                  {flatSubsidiaries.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="talent-homepage-path">{t('homepagePath')}</Label>
              <Input
                id="talent-homepage-path"
                placeholder={t('homepagePathPlaceholder')}
                value={talentForm.homepagePath}
                onChange={(e) =>
                  setTalentForm({
                    ...talentForm,
                    homepagePath: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  })
                }
              />
              <p className="text-muted-foreground text-xs">{t('homepagePathHint')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTalentDialog(false)}
              disabled={isCreating}
            >
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreateTalent} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
