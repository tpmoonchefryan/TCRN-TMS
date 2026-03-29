// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  integrationApi,
  type IntegrationConsumerCategory,
} from '@/lib/api/modules/integration';

interface CreateConsumerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CONSUMER_CATEGORIES: Array<{
  value: IntegrationConsumerCategory;
  label: string;
  description: string;
}> = [
  { value: 'external', label: 'External', description: 'Third-party API client' },
  { value: 'partner', label: 'Partner', description: 'Trusted partner integration' },
  { value: 'internal', label: 'Internal', description: 'Internal platform service' },
];

export function CreateConsumerDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateConsumerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    nameEn: '',
    nameJa: '',
    consumerCategory: '' as IntegrationConsumerCategory | '',
    contactEmail: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.nameEn || !formData.consumerCategory) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!/^[A-Z0-9_]{3,32}$/.test(formData.code)) {
      toast.error('Code must be 3-32 uppercase letters, numbers, or underscores');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await integrationApi.createConsumer({
        code: formData.code,
        nameEn: formData.nameEn,
        nameJa: formData.nameJa || undefined,
        consumerCategory: formData.consumerCategory,
        contactEmail: formData.contactEmail || undefined,
      });

      if (response.success) {
        toast.success('API Consumer created successfully', {
          description: `Consumer ${formData.code} has been created.`,
        });
        setFormData({
          code: '',
          nameEn: '',
          nameJa: '',
          consumerCategory: '',
          contactEmail: '',
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error('Failed to create consumer', {
          description: response.error?.message || 'An error occurred',
        });
      }
    } catch (err: unknown) {
      toast.error('Failed to create consumer', {
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create API Consumer</DialogTitle>
          <DialogDescription>
            Create a new API consumer for external integrations and key-based access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="EXAMPLE_API"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
                  })
                }
                disabled={isSubmitting}
              />
              <p className="text-xs text-slate-500">3-32 uppercase chars</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consumerCategory">Category *</Label>
              <Select
                value={formData.consumerCategory}
                onValueChange={(value: IntegrationConsumerCategory) =>
                  setFormData({ ...formData, consumerCategory: value })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="consumerCategory">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CONSUMER_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex flex-col">
                        <span>{category.label}</span>
                        <span className="text-xs text-slate-500">{category.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nameEn">Name (English) *</Label>
            <Input
              id="nameEn"
              placeholder="Example API Consumer"
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nameJa">Name (Japanese)</Label>
            <Input
              id="nameJa"
              placeholder="サンプルAPIコンシューマー"
              value={formData.nameJa}
              onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="api-team@example.com"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Consumer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
