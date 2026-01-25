// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { FolderTree, Loader2, Plus, Search, Settings, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { OrganizationTree, TreeNode } from '@/components/organization/organization-tree';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { organizationApi, profileStoreApi, subsidiaryApi, talentApi } from '@/lib/api/client';
import { SubsidiaryInfo, useTalentStore } from '@/stores/talent-store';

export default function OrganizationStructurePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('organizationPage');
  const tc = useTranslations('common');
  const tenantId = params.tenantId as string;

  const { organizationTree, directTalents, currentTenantCode, setOrganizationTree, setDirectTalents } = useTalentStore();

  // Refresh organization tree from API
  const refreshOrganization = useCallback(async () => {
    try {
      const response = await organizationApi.getTree();
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
        const response = await organizationApi.getTree({ 
          search: debouncedSearch || undefined,
          includeInactive: false 
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
  const [profileStores, setProfileStores] = useState<Array<{ id: string; code: string; nameEn: string }>>([]);

  // Fetch Profile Stores using dedicated API
  useEffect(() => {
    const fetchProfileStores = async () => {
      try {
        const response = await profileStoreApi.list({ includeInactive: false });
        if (response.success && response.data?.items) {
          setProfileStores(response.data.items.map((item: any) => ({
            id: item.id,
            code: item.code,
            nameEn: item.nameEn || item.name_en || item.code,
          })));
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
  const tenantName = currentTenantCode || 'Current Tenant';

  // Flatten subsidiaries for select dropdown
  const flattenSubsidiaries = useCallback((subs: SubsidiaryInfo[], prefix = ''): Array<{ id: string; displayName: string }> => {
    const result: Array<{ id: string; displayName: string }> = [];
    for (const sub of subs) {
      result.push({ id: sub.id, displayName: prefix + sub.displayName });
      if (sub.children.length > 0) {
        result.push(...flattenSubsidiaries(sub.children, prefix + '  '));
      }
    }
    return result;
  }, []);

  const flatSubsidiaries = flattenSubsidiaries(subsidiaries);

  // Create subsidiary handler
  const handleCreateSubsidiary = async () => {
    if (!subsidiaryForm.code || !subsidiaryForm.nameEn) {
      toast.error(t('fillRequiredFields') || 'Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const response = await subsidiaryApi.create({
        code: subsidiaryForm.code.toUpperCase(),
        nameEn: subsidiaryForm.nameEn,
        nameZh: subsidiaryForm.nameZh || undefined,
        nameJa: subsidiaryForm.nameJa || undefined,
        parentId: subsidiaryForm.parentId || null,
      });

      if (response.success) {
        toast.success(t('subsidiaryCreated') || 'Subsidiary created successfully');
        setShowSubsidiaryDialog(false);
        setSubsidiaryForm({ code: '', nameEn: '', nameZh: '', nameJa: '', parentId: '' });
        // Refresh organization tree
        refreshOrganization();
      } else {
        toast.error(response.error?.message || 'Failed to create subsidiary');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create subsidiary');
    } finally {
      setIsCreating(false);
    }
  };

  // Create talent handler
  const handleCreateTalent = async () => {
    if (!talentForm.code || !talentForm.nameEn || !talentForm.displayName || !talentForm.profileStoreId) {
      toast.error(t('fillRequiredFields') || 'Please fill in all required fields (including Profile Store)');
      return;
    }

    setIsCreating(true);
    try {
      const response = await talentApi.create({
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
        toast.success(t('talentCreated') || 'Talent created successfully');
        setShowTalentDialog(false);
        setTalentForm({ code: '', nameEn: '', displayName: '', nameZh: '', nameJa: '', subsidiaryId: '', homepagePath: '', profileStoreId: '' });
        // Refresh organization tree
        refreshOrganization();
      } else {
        toast.error(response.error?.message || 'Failed to create talent');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create talent');
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

    let targetUrl = '';
    
    switch (node.type) {
      case 'tenant':
        targetUrl = `/tenant/${tenantId}/${action === 'settings' ? 'settings' : ''}`;
        break;
      case 'subsidiary':
        targetUrl = `/tenant/${tenantId}/subsidiary/${node.id}/${action}`;
        break;
      case 'talent':
        const parentSub = findParentSubsidiary(node.id, subsidiaries);
        if (parentSub) {
          targetUrl = `/tenant/${tenantId}/subsidiary/${parentSub.id}/talent/${node.id}/${action}`;
        } else {
          targetUrl = `/tenant/${tenantId}/talent/${node.id}/${action}`;
        }
        break;
    }

    if (targetUrl) {
      router.push(targetUrl);
    }
  };

  // Helper to find parent subsidiary of a talent
  const findParentSubsidiary = (
    talentId: string,
    subs: SubsidiaryInfo[]
  ): SubsidiaryInfo | null => {
    for (const sub of subs) {
      if (sub.talents.some((t) => t.id === talentId)) {
        return sub;
      }
      if (sub.children.length > 0) {
        const found = findParentSubsidiary(talentId, sub.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Empty state when no organization data
  const isEmpty = subsidiaries.length === 0 && talents.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
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
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t('searchPlaceholder') || 'Search subsidiaries or talents...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {(search || isSearching) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
               {isSearching ? (
                 <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
               ) : (
                 <button onClick={() => setSearch('')}>
                   <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                 </button>
               )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree View */}
        <div className="lg:col-span-2">
          {isEmpty ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('emptyTitle') || 'No Organization Structure'}</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {t('emptyDescription') || 'Start by adding subsidiaries or talents to your organization.'}
                </p>
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
              <CardTitle>
                {selectedNode ? selectedNode.displayName : t('selectItem')}
              </CardTitle>
              <CardDescription>
                {selectedNode
                  ? `${tc('type')}: ${tc(selectedNode.type)}`
                  : t('clickToSeeDetails')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{tc('code')}</label>
                    <p className="font-mono text-sm">{selectedNode.code}</p>
                  </div>
                  {selectedNode.path && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{tc('source')}</label>
                      <p className="font-mono text-sm">{selectedNode.path}</p>
                    </div>
                  )}
                  <div className="pt-4 flex gap-2">
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
                <p className="text-muted-foreground text-sm">
                  {t('selectItemHint')}
                </p>
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
            <DialogDescription>
              {t('addSubsidiaryDesc') || 'Create a new subsidiary in your organization structure.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sub-code">{tc('code')} *</Label>
              <Input
                id="sub-code"
                placeholder={t('subsidiaryCodePlaceholder')}
                value={subsidiaryForm.code}
                onChange={(e) => setSubsidiaryForm({ ...subsidiaryForm, code: e.target.value.toUpperCase() })}
              />
              <p className="text-xs text-muted-foreground">
                {t('codeHint') || '3-32 uppercase letters, numbers, and underscores'}
              </p>
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
              <Label htmlFor="sub-parent">{t('parentSubsidiary') || 'Parent Subsidiary'}</Label>
              <Select
                value={subsidiaryForm.parentId}
                onValueChange={(value) => setSubsidiaryForm({ ...subsidiaryForm, parentId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectParent') || 'Select parent (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('noParent') || 'No parent (root level)'}</SelectItem>
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
            <Button variant="outline" onClick={() => setShowSubsidiaryDialog(false)} disabled={isCreating}>
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
            <DialogDescription>
              {t('addTalentDesc') || 'Create a new talent in your organization.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="talent-code">{tc('code')} *</Label>
              <Input
                id="talent-code"
                placeholder={t('talentCodePlaceholder')}
                value={talentForm.code}
                onChange={(e) => setTalentForm({ ...talentForm, code: e.target.value.toUpperCase() })}
              />
              <p className="text-xs text-muted-foreground">
                {t('codeHint') || '3-32 uppercase letters, numbers, and underscores'}
              </p>
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
              <Label htmlFor="talent-display-name">{t('displayName') || 'Display Name'} *</Label>
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
              <Label htmlFor="talent-profile-store">{t('profileStore') || 'Profile Store'} *</Label>
              <Select
                value={talentForm.profileStoreId}
                onValueChange={(value) => setTalentForm({ ...talentForm, profileStoreId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectProfileStore') || 'Select Profile Store (required)'} />
                </SelectTrigger>
                <SelectContent>
                  {profileStores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.nameEn} ({store.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('profileStoreHint') || 'Profile store determines how customer PII is managed'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="talent-subsidiary">{t('subsidiary') || 'Subsidiary'}</Label>
              <Select
                value={talentForm.subsidiaryId}
                onValueChange={(value) => setTalentForm({ ...talentForm, subsidiaryId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectSubsidiary') || 'Select subsidiary (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('directTalent') || 'Direct talent (no subsidiary)'}</SelectItem>
                  {flatSubsidiaries.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="talent-homepage-path">{t('homepagePath') || 'Homepage Path'}</Label>
              <Input
                id="talent-homepage-path"
                placeholder={t('homepagePathPlaceholder')}
                value={talentForm.homepagePath}
                onChange={(e) => setTalentForm({ ...talentForm, homepagePath: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              />
              <p className="text-xs text-muted-foreground">
                {t('homepagePathHint') || 'Lowercase letters, numbers, and hyphens only'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTalentDialog(false)} disabled={isCreating}>
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
