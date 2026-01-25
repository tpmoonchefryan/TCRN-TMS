// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { PermissionSelector } from './permission-selector';

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

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateRoleDialog({ open, onOpenChange, onSuccess }: CreateRoleDialogProps) {
  const tRole = useTranslations('adminConsole.roles');
  const tCommon = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    nameEn: '',
    description: '',
  });
  const [permissions, setPermissions] = useState<Array<{ resource: string; action: string }>>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.code || !formData.nameEn) {
      toast.error(tCommon('description')); 
      return;
    }

    setIsLoading(true);

    try {
      await systemRoleApi.create({
        code: formData.code.toUpperCase(),
        nameEn: formData.nameEn,
        description: formData.description,
        isActive: true, // Default to active
        permissions: permissions,
      });

      toast.success(tCommon('success'));
      setFormData({ code: '', nameEn: '', description: '' });
      setPermissions([]);
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
          <DialogTitle>{tRole('createRole')}</DialogTitle>
          <DialogDescription>
            {tRole('description')}
          </DialogDescription>
        </DialogHeader>
        
        <form id="create-role-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">{tRole('roleCode')}</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                  placeholder="e.g. PLATFORM_ADMIN"
                  required
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                disabled={isLoading}
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

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" form="create-role-form" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tCommon('loading')}
              </>
            ) : (
              tCommon('create')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
