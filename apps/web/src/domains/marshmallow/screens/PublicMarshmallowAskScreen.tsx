// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { SubmitMessageSchema } from '@tcrn/shared';
import { ArrowLeft, CheckCircle2, Link as LinkIcon, Loader2, Send, User } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { use, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EmojiPicker } from '@/components/marshmallow/public/EmojiPicker';
import { getThrownErrorMessage } from '@/lib/api/error-utils';
import { publicApi, type PublicMarshmallowConfigResponse } from '@/lib/api/modules/content';
import { useZodForm } from '@/lib/form';
import { Button, Input, Label, Switch, Textarea } from '@/platform/ui';

// Cloudflare Turnstile Site Key (use test key in development)
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // Test key

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

interface TurnstileApi {
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  getResponse: (widgetId: string) => string | undefined;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// Simple fingerprint generation
const generateFingerprint = async (): Promise<string> => {
  const data = [
    navigator.userAgent,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    navigator.language,
  ].join('|');

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export function PublicMarshmallowAskScreen({ params }: { params: Promise<{ path: string }> }) {
  const { path } = use(params);
  const t = useTranslations('publicMarshmallow');
  const [config, setConfig] = useState<PublicMarshmallowConfigResponse | null>(null);
  const effectiveConfig: PublicMarshmallowConfigResponse = config ?? {
    talent: { displayName: t('defaultTalentName'), avatarUrl: null },
    title: t('defaultTitle'),
    welcomeText: t('defaultWelcomeText'),
    placeholderText: t('defaultPlaceholderText'),
    allowAnonymous: true,
    captchaMode: 'never',
    maxMessageLength: 500,
    minMessageLength: 1,
    reactionsEnabled: true,
    allowedReactions: ['❤️', '👍', '😊'],
    theme: {},
    terms: { en: null, zh: null, ja: null },
    privacy: { en: null, zh: null, ja: null },
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Honeypot field - should remain empty
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Form with Zod validation
  const form = useZodForm(SubmitMessageSchema, {
    defaultValues: {
      content: '',
      senderName: '',
      isAnonymous: true,
      fingerprint: '',
      socialLink: '',
      honeypot: '',
    },
  });

  const content = form.watch('content');
  const isAnonymous = form.watch('isAnonymous');
  const senderName = form.watch('senderName');
  const socialLink = form.watch('socialLink');
  const requiresTurnstile = effectiveConfig.captchaMode !== 'never';

  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Generate fingerprint on mount
  useEffect(() => {
    generateFingerprint().then((fp) => {
      setFingerprint(fp);
      form.setValue('fingerprint', fp);
    });
  }, [form]);

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await publicApi.getMarshmallowConfig(path);
        if (response.success && response.data) {
          setConfig(response.data);
        }
      } catch {
        // Keep the default client-safe config if the public request fails.
      }
    };
    loadConfig();
  }, [path]);

  // Initialize Turnstile
  useEffect(() => {
    if (isSubmitted) return;

    if (!requiresTurnstile) {
      setTurnstileToken(null);
      setTurnstileVerified(false);
      widgetIdRef.current = null;
      return;
    }

    // Load Turnstile script if not already loaded
    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Wait for script to load and render widget
    const renderTurnstile = () => {
      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => {
            setTurnstileToken(token);
            setTurnstileVerified(true);
          },
          'expired-callback': () => {
            setTurnstileToken(null);
            setTurnstileVerified(false);
          },
          'error-callback': () => {
            setTurnstileToken(null);
            setTurnstileVerified(false);
          },
        });
      }
    };

    // Check if turnstile is already loaded
    if (window.turnstile) {
      renderTurnstile();
    } else {
      // Wait for script load
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          renderTurnstile();
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }
  }, [isSubmitted, requiresTurnstile]);

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!data.content.trim()) return;

    // Validate content length
    if (data.content.length < effectiveConfig.minMessageLength) {
      toast.error(t('messageTooShort', { min: effectiveConfig.minMessageLength }));
      return;
    }

    // Check Turnstile verification
    if (requiresTurnstile && !turnstileToken) {
      toast.error(t('completeSecurityCheck'));
      return;
    }

    // Validate sender name for non-anonymous
    if (!data.isAnonymous && !data.senderName?.trim()) {
      toast.error(t('enterName'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Real API call with all required fields
      const response = await publicApi.submitMarshmallow(path, {
        content: data.content,
        senderName: data.isAnonymous ? undefined : data.senderName?.trim(),
        isAnonymous: data.isAnonymous,
        turnstileToken: requiresTurnstile ? turnstileToken || undefined : undefined,
        fingerprint: data.fingerprint,
        honeypot: honeypot || undefined, // Pass honeypot value for bot detection
        socialLink: data.socialLink?.trim() || undefined,
        selectedImageUrls: selectedImages.length > 0 ? selectedImages : undefined,
      });

      if (!response.success) {
        throw new Error(response.error?.message || t('sendFailed'));
      }

      setSubmitMessage(response.data?.message || t('defaultThankYou'));
      setIsSubmitted(true);
      toast.success(t('sendSuccess'));
    } catch (error) {
      toast.error(getThrownErrorMessage(error, t('sendFailed')));
      // Reset Turnstile on error
      if (requiresTurnstile && window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken(null);
        setTurnstileVerified(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  const handlePreviewImage = async () => {
    if (!socialLink?.trim()) return;

    setLoadingPreview(true);
    setPreviewImages([]);
    setSelectedImages([]);

    try {
      const res = await publicApi.previewMarshmallowImage(socialLink.trim());
      if (res.success && res.data) {
        if (res.data.images.length > 0) {
          setPreviewImages(res.data.images);
          toast.success(t('imageLoadSuccess'));
        } else {
          toast.error(res.data.error || t('imageLoadFailed'));
        }
      } else {
        toast.error(res.error?.message || t('imageLoadFailed'));
      }
    } catch {
      toast.error(t('imageLoadFailed'));
    } finally {
      setLoadingPreview(false);
    }
  };

  const toggleImageSelection = (url: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(url)) {
        return prev.filter((i) => i !== url);
      } else {
        return [...prev, url];
      }
    });
  };

  if (isSubmitted) {
    return (
      <div className="animate-in fade-in zoom-in-95 flex min-h-[60vh] flex-1 flex-col items-center justify-center px-4 pb-8 pt-12 text-center duration-500">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-sm">
          <Send size={40} className="translate-x-1 translate-y-1" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-slate-900">{t('sent')}</h2>
        <p className="mx-auto mb-8 max-w-md whitespace-pre-wrap text-slate-600">
          {submitMessage || t('defaultThankYou')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setIsSubmitted(false);
              setSubmitMessage(null);
              form.reset();
              form.setValue('fingerprint', fingerprint);
            }}
          >
            {t('sendAnother')}
          </Button>
          <Button asChild>
            <Link href={`/m/${path}`}>{t('backToProfile')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 pb-8 pt-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 mb-4 text-slate-500 hover:text-slate-800"
        >
          <Link href={`/m/${path}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('backToProfile')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">{t('askQuestion')}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAnonymous ? t('anonymousNotice') : t('namedNotice')}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit}>
          {/* Honeypot field - hidden from users, visible to bots */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '-9999px',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
            }}
          >
            <label htmlFor="website" aria-hidden="true"></label>
            <input
              type="text"
              id="website"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Anonymous Toggle - only show if allowAnonymous is true */}
          {effectiveConfig.allowAnonymous && (
            <div className="mb-6 flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                <Label htmlFor="anonymous-toggle" className="text-sm text-slate-600">
                  {t('sendAnonymously')}
                </Label>
              </div>
              <Switch
                id="anonymous-toggle"
                checked={isAnonymous}
                onCheckedChange={(checked) => form.setValue('isAnonymous', checked)}
              />
            </div>
          )}

          {/* Sender Name Input - show when not anonymous */}
          {!isAnonymous && (
            <div className="mb-6">
              <Label htmlFor="sender-name" className="mb-2 block text-sm text-slate-600">
                {t('yourName')}
              </Label>
              <Input
                id="sender-name"
                {...form.register('senderName')}
                placeholder={t('namePlaceholder')}
                maxLength={64}
                className="border-slate-200"
              />
            </div>
          )}

          {/* Message Content */}
          <div className="relative">
            <Textarea
              {...form.register('content')}
              placeholder={effectiveConfig.placeholderText || t('messagePlaceholder')}
              className="min-h-[200px] resize-none border-0 p-0 pr-10 text-base leading-relaxed placeholder:text-slate-300 focus-visible:ring-0"
              maxLength={effectiveConfig.maxMessageLength}
              autoFocus
            />
            <div className="absolute bottom-0 left-0 text-xs font-medium text-slate-300">
              {t('characterCount', {
                count: content?.length || 0,
                max: effectiveConfig.maxMessageLength,
              })}
            </div>
            <div className="absolute bottom-0 right-0">
              <EmojiPicker
                onEmojiSelect={(emoji) => form.setValue('content', (content || '') + emoji)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Bilibili Link Input */}
          <div className="mt-6 space-y-2">
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="social-link"
                {...form.register('socialLink')}
                placeholder={t('bilibiliLinkPlaceholder')}
                className="border-slate-200 pl-9 pr-20"
                onChange={(e) => {
                  form.setValue('socialLink', e.target.value);
                  if (previewImages.length > 0) {
                    setPreviewImages([]);
                    setSelectedImages([]);
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 text-xs text-slate-500 hover:text-[var(--mm-primary)]"
                disabled={!socialLink?.trim() || loadingPreview}
                onClick={handlePreviewImage}
              >
                {loadingPreview ? <Loader2 className="h-3 w-3 animate-spin" /> : t('getImage')}
              </Button>
            </div>

            {/* Image Preview Area */}
            {previewImages.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {previewImages.map((img, index) => (
                  <div
                    key={index}
                    className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border transition-all ${selectedImages.includes(img) ? 'border-[var(--mm-primary)] ring-2 ring-[var(--mm-primary)] ring-offset-1' : 'border-slate-200 opacity-70 hover:opacity-100'}`}
                    onClick={() => toggleImageSelection(img)}
                  >
                    <img
                      src={img}
                      alt={t('attachmentAlt', { index: index + 1 })}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {selectedImages.includes(img) && (
                      <div className="absolute right-1 top-1 rounded-full bg-[var(--mm-primary)] p-0.5 text-white">
                        <CheckCircle2 size={12} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400">{t('bilibiliHelpText')}</p>
          </div>

          <div className="my-6 h-px bg-slate-100" />

          <div className="space-y-6">
            {/* Cloudflare Turnstile Widget */}
            {requiresTurnstile ? (
              <div className="flex items-center gap-3">
                <div ref={turnstileRef} />
                {turnstileVerified && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('verified')}
                  </div>
                )}
              </div>
            ) : null}

            <Button
              type="submit"
              className="hover:bg-[var(--mm-primary)]/90 h-12 w-full rounded-xl bg-[var(--mm-primary)] text-base font-semibold"
              disabled={
                !content?.trim() ||
                isSubmitting ||
                (requiresTurnstile && !turnstileVerified) ||
                (!isAnonymous && !senderName?.trim())
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('sending')}
                </>
              ) : (
                t('sendMarshmallow')
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 px-8 text-center">
        <p className="text-xs leading-relaxed text-slate-400">{t('termsNotice')}</p>
      </div>
    </div>
  );
}
