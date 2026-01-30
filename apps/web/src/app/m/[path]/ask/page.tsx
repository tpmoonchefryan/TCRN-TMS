// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowLeft, CheckCircle2, Link as LinkIcon, Loader2, Send, User } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { use, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EmojiPicker } from '@/components/marshmallow/public/EmojiPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { publicApi } from '@/lib/api/client';

// Cloudflare Turnstile Site Key (use test key in development)
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // Test key
console.log('[Debug] Turnstile Site Key:', TURNSTILE_SITE_KEY);

// Config type matching backend API response (camelCase)
interface MarshmallowConfig {
  talent: {
    displayName: string;
    avatarUrl: string | null;
  };
  title: string | null;
  welcomeText: string | null;
  placeholderText: string | null;
  thankYouText?: string | null;
  allowAnonymous: boolean;
  maxMessageLength: number;
  minMessageLength: number;
  reactionsEnabled: boolean;
  allowedReactions: string[];
  theme: Record<string, unknown>;
}

// Default config for when API fails
const DEFAULT_CONFIG: MarshmallowConfig = {
  talent: { displayName: 'Unknown', avatarUrl: null },
  title: 'Marshmallow',
  welcomeText: 'Send me a message!',
  placeholderText: 'Write your message here...',
  thankYouText: 'Thank you for your message!',
  allowAnonymous: true,
  maxMessageLength: 500,
  minMessageLength: 1,
  reactionsEnabled: true,
  allowedReactions: ['❤️', '👍', '😊'],
  theme: {},
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
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
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export default function AskMarshmallowPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = use(params);
  const t = useTranslations('publicMarshmallow');
  const [config, setConfig] = useState<MarshmallowConfig>(DEFAULT_CONFIG);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  const [content, setContent] = useState('');
  const [senderName, setSenderName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fingerprint, setFingerprint] = useState('');
  const [honeypot, setHoneypot] = useState('');  // Honeypot field - should remain empty
  const [socialLink, setSocialLink] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Generate fingerprint on mount
  useEffect(() => {
    generateFingerprint().then(setFingerprint);
  }, []);

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await publicApi.getMarshmallowConfig(path);
        if (response.success && response.data) {
          setConfig(response.data);
        }
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    loadConfig();
  }, [path]);

  // Initialize Turnstile
  useEffect(() => {
    if (isSubmitted) return;

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
  }, [isSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    // Validate content length
    if (content.length < config.minMessageLength) {
      toast.error(t('messageTooShort', { min: config.minMessageLength }));
      return;
    }

    // Check Turnstile verification
    if (!turnstileToken) {
      toast.error(t('completeSecurityCheck'));
      return;
    }

    // Validate sender name for non-anonymous
    if (!isAnonymous && !senderName.trim()) {
      toast.error(t('enterName'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Real API call with all required fields
      const response = await publicApi.submitMarshmallow(path, {
        content,
        senderName: isAnonymous ? undefined : senderName.trim(),
        isAnonymous,
        turnstileToken: turnstileToken || undefined,
        fingerprint,
        honeypot: honeypot || undefined,  // Pass honeypot value for bot detection
        socialLink: socialLink.trim() || undefined,
        selectedImageUrls: selectedImages.length > 0 ? selectedImages : undefined,
      });

      if (!response.success) {
        throw new Error(response.error?.message || t('sendFailed'));
      }

      setIsSubmitted(true);
      toast.success(t('sendSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('sendFailed'));
      // Reset Turnstile on error
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken(null);
        setTurnstileVerified(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviewImage = async () => {
    if (!socialLink.trim()) return;
    
    setLoadingPreview(true);
    setPreviewImage(null);
    setPreviewImages([]);
    setSelectedImages([]);

    try {
        const res = await publicApi.previewMarshmallowImage(socialLink.trim());
        if (res.success) {
            if (res.data?.images && res.data.images.length > 0) {
                 setPreviewImages(res.data.images);
                 // Auto-select all by default? Or none? Let's select none and let user pick, or maybe select all?
                 // Let's select all by default for convenience if <= 9? 
                 // Actually user requested "let submitter choose".
                 // Let's select none or let them click. 
                 // We can also just show them to pick.
            } else if (res.data?.imageUrl) {
                 setPreviewImages([res.data.imageUrl]);
                 setSelectedImages([res.data.imageUrl]);
            }
            toast.success('Images loaded successfully');
        } else {
            toast.error(res.data?.error || 'Failed to load images');
        }
    } catch (e) {
        toast.error('Failed to load images');
    } finally {
        setLoadingPreview(false);
    }
  };

  const toggleImageSelection = (url: string) => {
      setSelectedImages(prev => {
          if (prev.includes(url)) {
              return prev.filter(i => i !== url);
          } else {
              return [...prev, url];
          }
      });
  };

  if (isSubmitted) {
    return (
      <div className="px-4 pt-12 pb-8 flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Send size={40} className="translate-x-1 translate-y-1" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">{t('sent')}</h2>
        <p className="text-slate-600 max-w-md mx-auto mb-8 whitespace-pre-wrap">
          {config.thankYouText || t('defaultThankYou')}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setIsSubmitted(false); setContent(''); setSenderName(''); setSocialLink(''); }}>
            {t('sendAnother')}
          </Button>
          <Button asChild>
            <Link href={`/m/${path}`}>
              {t('backToProfile')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 pb-8 flex-1">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-slate-500 hover:text-slate-800">
          <Link href={`/m/${path}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('backToProfile')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">{t('askQuestion')}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAnonymous ? t('anonymousNotice') : t('namedNotice')}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
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
            <label htmlFor="website">Website</label>
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
          {config.allowAnonymous && (
            <div className="flex items-center justify-between mb-6 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                <Label htmlFor="anonymous-toggle" className="text-sm text-slate-600">
                  {t('sendAnonymously')}
                </Label>
              </div>
              <Switch
                id="anonymous-toggle"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
            </div>
          )}

          {/* Sender Name Input - show when not anonymous */}
          {!isAnonymous && (
            <div className="mb-6">
              <Label htmlFor="sender-name" className="text-sm text-slate-600 mb-2 block">
                {t('yourName')}
              </Label>
              <Input
                id="sender-name"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                placeholder={t('namePlaceholder')}
                maxLength={64}
                className="border-slate-200"
              />
            </div>
          )}

          {/* Message Content */}
          <div className="relative">
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={config.placeholderText || t('messagePlaceholder')}
              className="min-h-[200px] resize-none border-0 focus-visible:ring-0 p-0 pr-10 text-base leading-relaxed placeholder:text-slate-300"
              maxLength={config.maxMessageLength}
              autoFocus
            />
            <div className="absolute bottom-0 left-0 text-xs text-slate-300 font-medium">
              {t('characterCount', { count: content.length, max: config.maxMessageLength })}
            </div>
            <div className="absolute bottom-0 right-0">
              <EmojiPicker 
                onEmojiSelect={(emoji) => setContent(prev => prev + emoji)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Bilibili Link Input */}
          <div className="mt-6 space-y-2">
            <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    id="social-link"
                    value={socialLink}
                    onChange={e => {
                        setSocialLink(e.target.value);
                        setSocialLink(e.target.value);
                        if (previewImages.length > 0) {
                             setPreviewImages([]); 
                             setSelectedImages([]);
                        }
                    }}
                    placeholder="https://www.bilibili.com/opus/......"
                    className="pl-9 pr-20 border-slate-200"
                />
                <Button
                    type="button"
                    variant="ghost" 
                    size="sm"
                    className="absolute right-1 top-1 h-8 text-xs text-slate-500 hover:text-[var(--mm-primary)]"
                    disabled={!socialLink.trim() || loadingPreview}
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
                            className={`relative aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all ${selectedImages.includes(img) ? 'border-[var(--mm-primary)] ring-2 ring-[var(--mm-primary)] ring-offset-1' : 'border-slate-200 opacity-70 hover:opacity-100'}`}
                            onClick={() => toggleImageSelection(img)}
                        >
                            <img 
                                src={img} 
                                alt={`Preview ${index}`} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                            {selectedImages.includes(img) && (
                                <div className="absolute top-1 right-1 bg-[var(--mm-primary)] text-white rounded-full p-0.5">
                                    <CheckCircle2 size={12} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {previewImages.length > 0 && (
                <p className="text-[10px] text-slate-500 mt-1">
                    {/* Reuse existing "click to select" logic or keep it simple? Actually user only asked to change the bottom help text. */}
                    {/* The text "点击图片选择要发送的内容" was not requested to be changed, but good to check. */}
                    {/* Wait, the user provided text is: "在此粘贴你想发送图片的Bilibili动态网址，点击获取图片，然后选择你想发给主播的图片后点击发送棉花糖即可" */}
                    {/* This single sentence seems to replace the previous help text at the bottom. */}
                    {/* So I should remove the separate "Click to select" text if it's redundant, or just focus on the bottom text. */}
                    {/* The bottom text was: "本链接仅作为获取图片用途，不会存储用户账号信息" */}
                    {/* The user request says: "Change THIS text to..." */}
                    {/* So I will replace the bottom text with the new one. */}
                </p>
            )}

            <p className="text-[10px] text-slate-400">
                {t('bilibiliHelpText')}
            </p>
          </div>

          <div className="h-px bg-slate-100 my-6" />

          <div className="space-y-6">
            {/* Cloudflare Turnstile Widget */}
            <div className="flex items-center gap-3">
              <div ref={turnstileRef} />
              {turnstileVerified && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('verified')}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold rounded-xl bg-[var(--mm-primary)] hover:bg-[var(--mm-primary)]/90"
              disabled={!content.trim() || isSubmitting || !turnstileVerified || (!isAnonymous && !senderName.trim())}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('sending')}
                </>
              ) : t('sendMarshmallow')}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 text-center px-8">
        <p className="text-xs text-slate-400 leading-relaxed">
          {t('termsNotice')}
        </p>
      </div>
    </div>
  );
}
