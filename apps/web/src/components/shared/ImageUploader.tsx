// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ImagePlus, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getTranslatedApiErrorMessage } from '@/lib/api/error-utils';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<string>;
  disabled?: boolean;
  className?: string;
  maxSizeMB?: number;
}

export function ImageUploader({
  value,
  onChange,
  onUpload,
  disabled = false,
  className,
  maxSizeMB = 5,
}: ImageUploaderProps) {
  const t = useTranslations('imageUploader');
  const te = useTranslations('errors');
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;
      
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(t('fileSizeExceeded', { size: maxSizeMB }));
        return;
      }

      setIsUploading(true);
      try {
        const url = await onUpload(file);
        onChange(url);
        toast.success(t('uploadSuccess'));
      } catch (error) {
        toast.error(getTranslatedApiErrorMessage(error, te, t('uploadFailed')));
      } finally {
        setIsUploading(false);
      }
    },
    [disabled, maxSizeMB, onUpload, onChange, t, te]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    disabled: disabled || isUploading,
  });

  if (value) {
    return (
      <div className={cn("relative group w-32 h-32", className)}>
        <img
          src={value}
          alt={t('altUploadedImage')}
          className="w-full h-full object-cover rounded-full border-2 border-border"
        />
        {!disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onChange(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-colors bg-muted/5",
        isDragActive && "border-primary bg-primary/5",
        (disabled || isUploading) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      ) : (
        <ImagePlus className="h-8 w-8 text-muted-foreground" />
      )}
      <div className="mt-2 text-xs text-muted-foreground font-medium text-center px-2">
        {isUploading ? t('uploading') : t('upload')}
      </div>
    </div>
  );
}
