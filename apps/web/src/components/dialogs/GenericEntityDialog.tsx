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
} from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Field types supported by the dialog
export type FieldType = 'text' | 'number' | 'email' | 'password' | 'textarea' | 'boolean' | 'select';

// Field definition for the form
export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: unknown) => string | null;
  colSpan?: 1 | 2;
}

// Generic entity dialog props
export interface GenericEntityDialogProps<T extends Record<string, unknown>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  
  // Dialog metadata
  title: string;
  description?: string;
  
  // Mode: create or edit
  mode: 'create' | 'edit';
  
  // Initial data for edit mode
  initialData?: Partial<T>;
  
  // Form field definitions
  fields: FieldDefinition[];
  
  // API handlers
  onSubmit: (data: T) => Promise<void>;
  
  // Optional: custom validation
  validate?: (data: T) => Record<string, string> | null;
  
  // Optional: styling
  maxWidth?: string;
  submitLabel?: string;
  cancelLabel?: string;
}

export function GenericEntityDialog<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  onSuccess,
  title,
  description,
  mode,
  initialData,
  fields,
  onSubmit,
  validate,
  maxWidth = 'sm:max-w-[500px]',
  submitLabel,
  cancelLabel,
}: GenericEntityDialogProps<T>) {
  const tCommon = useTranslations('common');
  const tToast = useTranslations('toast');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when dialog opens or initialData changes
  useEffect(() => {
    if (open) {
      const initial: Record<string, unknown> = {};
      fields.forEach((field) => {
        initial[field.name] = initialData?.[field.name] ?? (field.type === 'boolean' ? false : '');
      });
      setFormData(initial);
      setErrors({});
    }
  }, [open, initialData, fields]);

  const handleFieldChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Check required fields
    fields.forEach((field) => {
      const value = formData[field.name];
      if (field.required && (value === '' || value === null || value === undefined)) {
        newErrors[field.name] = 'Required';
      }
      // Run custom field validation
      if (field.validation && value) {
        const error = field.validation(value);
        if (error) {
          newErrors[field.name] = error;
        }
      }
    });
    
    // Run form-level validation
    if (validate) {
      const formErrors = validate(formData as T);
      if (formErrors) {
        Object.assign(newErrors, formErrors);
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(tCommon('pleaseFixErrors'));
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData as T);
      toast.success(mode === 'create' ? tToast('success.created') : tToast('success.updated'));
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : tToast('error.generic');
      toast.error(mode === 'create' ? tToast('error.create') : tToast('error.update'), {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FieldDefinition) => {
    const value = formData[field.name];
    const error = errors[field.name];
    
    const commonProps = {
      id: field.name,
      disabled: isSubmitting || field.disabled,
      placeholder: field.placeholder,
    };

    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <Label htmlFor={field.name} className="flex flex-col gap-1">
              <span>{field.label}</span>
              {field.hint && <span className="text-xs font-normal text-muted-foreground">{field.hint}</span>}
            </Label>
            <Switch
              id={field.name}
              checked={value as boolean}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
              disabled={isSubmitting || field.disabled}
            />
          </div>
        );
      
      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && '*'}
            </Label>
            <Textarea
              {...commonProps}
              value={value as string}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={cn(error && 'border-destructive')}
              rows={3}
            />
            {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && '*'}
            </Label>
            <Input
              {...commonProps}
              type="number"
              value={value as number}
              onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
              className={cn(error && 'border-destructive')}
            />
            {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      
      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && '*'}
            </Label>
            <Input
              {...commonProps}
              type={field.type}
              value={value as string}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={cn(error && 'border-destructive')}
            />
            {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidth, 'glass-dialog')}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {fields.map((field) => (
              <div
                key={field.name}
                className={cn(
                  field.colSpan === 2 && 'col-span-2',
                  field.colSpan !== 2 && 'col-span-2 sm:col-span-1'
                )}
              >
                {renderField(field)}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {cancelLabel || tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {tCommon('loading')}
                </>
              ) : (
                submitLabel || (mode === 'create' ? tCommon('create') : tCommon('save'))
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
