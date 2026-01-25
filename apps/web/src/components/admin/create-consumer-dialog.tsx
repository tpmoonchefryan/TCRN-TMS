// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2 } from 'lucide-react';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui';
import { integrationApi } from '@/lib/api/client';

interface Platform {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string;
}

interface CreateConsumerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ADAPTER_TYPES = [
  { value: 'api_key', label: 'API Key', description: 'Simple API key authentication' },
  { value: 'oauth', label: 'OAuth 2.0', description: 'OAuth 2.0 client credentials' },
  { value: 'webhook', label: 'Webhook', description: 'Outbound webhook events' },
] as const;

export function CreateConsumerDialog({ open, onOpenChange, onSuccess }: CreateConsumerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    nameEn: '',
    nameJa: '',
    platformId: '',
    adapterType: '' as 'oauth' | 'api_key' | 'webhook' | '',
  });

  // Fetch platforms when dialog opens
  useEffect(() => {
    if (open && platforms.length === 0) {
      fetchPlatforms();
    }
  }, [open]);

  const fetchPlatforms = async () => {
    setIsLoadingPlatforms(true);
    try {
      const response = await integrationApi.listPlatforms();
      if (response.success && response.data) {
        setPlatforms(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch platforms:', err);
    } finally {
      setIsLoadingPlatforms(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.code || !formData.nameEn || !formData.platformId || !formData.adapterType) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate code format
    if (!/^[A-Z0-9_]{3,32}$/.test(formData.code)) {
      toast.error('Code must be 3-32 uppercase letters, numbers, or underscores');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await integrationApi.createAdapter({
        code: formData.code,
        nameEn: formData.nameEn,
        nameJa: formData.nameJa || undefined,
        platformId: formData.platformId,
        adapterType: formData.adapterType as 'oauth' | 'api_key' | 'webhook',
      });

      if (response.success) {
        toast.success('API Consumer created successfully', {
          description: `Consumer ${formData.code} has been created.`,
        });
        // Reset form
        setFormData({
          code: '',
          nameEn: '',
          nameJa: '',
          platformId: '',
          adapterType: '',
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error('Failed to create consumer', {
          description: response.error?.message || 'An error occurred',
        });
      }
    } catch (err: any) {
      toast.error('Failed to create consumer', {
        description: err.message || 'An error occurred',
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
            Create a new API consumer for external integration.
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
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                disabled={isSubmitting}
              />
              <p className="text-xs text-slate-500">3-32 uppercase chars</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platformId">Platform *</Label>
              <Select 
                value={formData.platformId} 
                onValueChange={(value) => setFormData({ ...formData, platformId: value })}
                disabled={isSubmitting || isLoadingPlatforms}
              >
                <SelectTrigger id="platformId">
                  <SelectValue placeholder={isLoadingPlatforms ? "Loading..." : "Select platform"} />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      {platform.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adapterType">Adapter Type *</Label>
            <Select 
              value={formData.adapterType} 
              onValueChange={(value) => setFormData({ ...formData, adapterType: value as any })}
              disabled={isSubmitting}
            >
              <SelectTrigger id="adapterType">
                <SelectValue placeholder="Select adapter type" />
              </SelectTrigger>
              <SelectContent>
                {ADAPTER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-slate-500">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
