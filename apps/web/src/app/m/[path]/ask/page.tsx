// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowLeft, CheckCircle2, Loader2, Send, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
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
          <Button variant="outline" onClick={() => { setIsSubmitted(false); setContent(''); setSenderName(''); }}>
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
