 
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Bell, Check, Home, Languages, Layout, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import NextImage from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { setUserLocale } from '@/i18n/locale';
import { isStaging } from '@/lib/utils';
import { getAvatarUrl } from '@/lib/utils/gravatar';
import { useAuthStore } from '@/stores/auth-store';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'zh', name: '简体中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

const DEFAULT_MODULES = [
  { code: 'customers', name: 'Customer Management' },
  { code: 'homepage', name: 'Homepage Management' },
  { code: 'marshmallow', name: 'Marshmallow' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('header');
  const tCommon = useTranslations('common');
  const { user, logout, tenantCode } = useAuthStore();
  
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState(locale || 'en');
  const [defaultModule, setDefaultModule] = useState('customers');
  
  const pathSegments = pathname.split('/').filter(Boolean);
  
  // Clean up UUID segments in breadcrumbs
  const cleanedSegments = pathSegments.filter(seg => 
    !seg.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  );

  // Calculate top offset for staging banner
  const topOffset = isStaging() ? STAGING_BANNER_HEIGHT : 0;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleLanguageChange = async (langCode: string) => {
    setPreferredLanguage(langCode);
    // Update the app locale
    await setUserLocale(langCode as 'en' | 'zh' | 'ja');
    // Refresh the page to apply the new locale
    router.refresh();
  };

  const handleSavePreferences = async () => {
    // Save preferred language
    await setUserLocale(preferredLanguage as 'en' | 'zh' | 'ja');
    setPreferenceOpen(false);
    router.refresh();
  };

  const displayName = user?.display_name || user?.username || 'User';
  const email = user?.email || '';
  const avatarUrl = getAvatarUrl({
    avatarUrl: user?.avatar_url,
    email: user?.email,
    size: 36,
  });
  const currentLang = LANGUAGES.find(l => l.code === preferredLanguage) || LANGUAGES[0];

  return (
    <>
      <header 
        className="fixed right-0 left-0 md:left-64 h-16 glass-header px-6 flex items-center justify-between animate-fade-in"
        style={{ top: topOffset }}
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu size={20} />
          </Button>
          
          {/* Breadcrumbs */}
          <nav className="hidden sm:flex items-center text-sm font-medium text-slate-500">
            <span className="text-slate-400">TCRN</span>
            {cleanedSegments.map((segment, index) => (
              <React.Fragment key={`${segment}-${index}`}>
                <span className="mx-2 text-slate-300">/</span>
                <span className={index === cleanedSegments.length - 1 ? 'text-primary capitalize' : 'capitalize'}>
                  {segment.replace(/-/g, ' ')}
                </span>
              </React.Fragment>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={tCommon('search')} 
              className="h-9 pl-9 pr-4 rounded-full bg-slate-100 border-none text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all w-64"
            />
          </div>

          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-primary hover:bg-primary/5 rounded-full relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full border-2 border-white"></span>
          </Button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 pl-2 outline-none hover:opacity-80 transition-opacity">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-700">{displayName}</p>
                  <p className="text-xs text-slate-400">{tenantCode || 'Unknown Tenant'}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-100 to-pink-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                  <NextImage 
                    src={avatarUrl} 
                    alt={displayName} 
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                {t('profile')}
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setPreferenceOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                {t('preferences')}
              </DropdownMenuItem>
              
              {/* Language Quick Switch */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages className="mr-2 h-4 w-4" />
                  <span>{t('language')}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{currentLang.flag}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {LANGUAGES.map(lang => (
                      <DropdownMenuItem 
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                      >
                        <span className="mr-2">{lang.flag}</span>
                        {lang.name}
                        {lang.code === preferredLanguage && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-500 focus:text-red-500 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Preferences Dialog */}
      <Dialog open={preferenceOpen} onOpenChange={setPreferenceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('userPreferences')}</DialogTitle>
            <DialogDescription>
              {t('userPreferencesDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Language Setting */}
            <div className="space-y-2">
              <Label htmlFor="language" className="flex items-center gap-2">
                <Languages size={14} />
                {t('displayLanguage')}
              </Label>
              <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        {lang.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('displayLanguageHint')}
              </p>
            </div>

            {/* Default Module Setting */}
            <div className="space-y-2">
              <Label htmlFor="defaultModule" className="flex items-center gap-2">
                <Home size={14} />
                {t('defaultModule')}
              </Label>
              <Select value={defaultModule} onValueChange={setDefaultModule}>
                <SelectTrigger id="defaultModule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_MODULES.map(mod => (
                    <SelectItem key={mod.code} value={mod.code}>
                      {mod.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('defaultModuleHint')}
              </p>
            </div>

            {/* UI Mode Setting */}
            <div className="space-y-2">
              <Label htmlFor="uiMode" className="flex items-center gap-2">
                <Layout size={14} />
                {t('defaultUIMode')}
              </Label>
              <Select defaultValue="business">
                <SelectTrigger id="uiMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">{t('businessInterface')}</SelectItem>
                  <SelectItem value="management">{t('managementInterface')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('defaultUIModeHint')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreferenceOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSavePreferences}>
              {t('savePreferences')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
