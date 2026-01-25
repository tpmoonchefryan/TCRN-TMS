// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Camera, Loader2, Trash2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { userApi } from '@/lib/api/client';
import { getAvatarUrl } from '@/lib/utils/gravatar';
import { cn } from '@/lib/utils';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Button } from './button';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  email?: string | null;
  displayName?: string | null;
  onAvatarChange?: (newUrl: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  showGravatarHint?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

const buttonSizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

export function AvatarUpload({
  currentAvatarUrl,
  email,
  displayName,
  onAvatarChange,
  size = 'md',
  showGravatarHint = true,
  className,
}: AvatarUploadProps) {
  const t = useTranslations('avatar');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Get display avatar URL
  const avatarUrl = previewUrl || getAvatarUrl({
    avatarUrl: currentAvatarUrl,
    email,
    size: size === 'lg' ? 128 : size === 'md' ? 96 : 64,
  });

  // Get initials for fallback
  const initials = displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('invalidFileType'));
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('fileTooLarge'));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    try {
      const result = await userApi.uploadAvatar(file);
      if (result.success && result.data?.avatarUrl) {
        setPreviewUrl(null);
        onAvatarChange?.(result.data.avatarUrl);
        toast.success(t('uploadSuccess'));
      } else {
        setPreviewUrl(null);
        toast.error(result.error?.message || t('uploadFailed'));
      }
    } catch (error) {
      setPreviewUrl(null);
      toast.error(t('uploadFailed'));
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!currentAvatarUrl) return;

    setIsDeleting(true);
    try {
      const result = await userApi.deleteAvatar();
      if (result.success) {
        onAvatarChange?.(null);
        toast.success(t('deleteSuccess'));
      } else {
        toast.error(t('deleteFailed'));
      }
    } catch (error) {
      toast.error(t('deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClick = () => {
    if (!isUploading && !isDeleting) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Avatar with overlay */}
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], 'border-4 border-background shadow-md')}>
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-lg font-medium">{initials}</AvatarFallback>
        </Avatar>

        {/* Upload overlay */}
        <button
          type="button"
          onClick={handleClick}
          disabled={isUploading || isDeleting}
          className={cn(
            'absolute inset-0 rounded-full flex items-center justify-center',
            'bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity',
            'text-white cursor-pointer',
            (isUploading || isDeleting) && 'opacity-100 cursor-wait'
          )}
        >
          {isUploading ? (
            <Loader2 className={cn(buttonSizeClasses[size], 'animate-spin')} />
          ) : (
            <Camera className={buttonSizeClasses[size]} />
          )}
        </button>

        {/* Delete button (shown when has custom avatar) */}
        {currentAvatarUrl && !isUploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isDeleting}
            className={cn(
              'absolute -top-1 -right-1 rounded-full p-1',
              'bg-destructive text-destructive-foreground shadow-md',
              'hover:bg-destructive/90 transition-colors',
              isDeleting && 'opacity-50 cursor-wait'
            )}
          >
            {isDeleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <X className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isUploading || isDeleting}
        >
          <Upload className="w-4 h-4 mr-2" />
          {t('upload')}
        </Button>
        {currentAvatarUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isUploading || isDeleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('delete')}
          </Button>
        )}
      </div>

      {/* Gravatar hint */}
      {showGravatarHint && !currentAvatarUrl && (
        <div className="text-center text-xs text-muted-foreground max-w-xs">
          <p>{t('gravatarHint')}</p>
          <a
            href="https://gravatar.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {t('setupGravatar')}
          </a>
        </div>
      )}
    </div>
  );
}
