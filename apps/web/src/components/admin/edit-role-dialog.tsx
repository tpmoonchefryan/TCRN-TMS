 
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Textarea
} from '@/components/ui';
import { ScrollArea } from '@/components/ui/scroll-area';
import { systemRoleApi } from '@/lib/api/client';

import { PermissionSelector } from './permission-selector';

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  role: {
    id: string;
    code: string;
    nameEn: string;
    description?: string;
  } | null;
}

export function EditRoleDialog({ open, onOpenChange, onSuccess, role }: EditRoleDialogProps) {
  const tRole = useTranslations('adminConsole.roles');
  const tCommon = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  const [formData, setFormData] = useState({
    nameEn: '',
    description: '',
  });
  const [permissions, setPermissions] = useState<Array<{ resource: string; action: string }>>([]);

  useEffect(() => {
    if (role && open) {
      // Set basic info immediately
      setFormData({
        nameEn: role.nameEn || '',
        description: role.description || '',
      });

      // Fetch full details including permissions
      const fetchRoleDetails = async () => {
        setIsFetching(true);
        try {
          const response = await systemRoleApi.get(role.id);
          if (response.success && response.data) {
             const roleData = response.data;
             setFormData({
                nameEn: roleData.nameEn,
                description: roleData.description || '',
             });
             
             if (roleData.permissions) {
                setPermissions(roleData.permissions);
             }
          }
        } catch (error) {
          console.error('Failed to fetch role details:', error);
          toast.error(tCommon('error'));
        } finally {
          setIsFetching(false);
        }
      };

      fetchRoleDetails();
    }
  }, [role, open, tCommon]); // Added tCommon dependency to satisfy lint, though typically stable

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    setIsLoading(true);

    try {
      await systemRoleApi.update(role.id, {
        nameEn: formData.nameEn,
        description: formData.description,
        permissions: permissions,
      });

      toast.success(tCommon('success'));
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(tCommon('error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{tRole('editRole')}</DialogTitle>
          <DialogDescription>
            {tRole('description')}
          </DialogDescription>
        </DialogHeader>
        
        {isFetching ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <form id="edit-role-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">{tRole('roleCode')}</Label>
                  <Input
                    id="code"
                    value={role?.code || ''}
                    readOnly
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nameEn">{tRole('roleName')}</Label>
                  <Input
                    id="nameEn"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder="e.g. Platform Administrator"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">{tCommon('description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role's responsibilities"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-base mb-4 block">Permissions</Label>
              <ScrollArea className="h-[40vh]">
                <PermissionSelector 
                  value={permissions}
                  onChange={setPermissions}
                  disabled={isLoading}
                />
              </ScrollArea>
            </div>
          </form>
        )}

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" form="edit-role-form" disabled={isLoading || isFetching} className="bg-purple-600 hover:bg-purple-700">
            {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon('loading')}
                </>
              ) : (
                tCommon('save')
              )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
