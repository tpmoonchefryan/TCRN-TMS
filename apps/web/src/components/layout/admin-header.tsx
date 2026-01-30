// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Bell, Check, Languages, LogOut, Menu, Settings, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { Button } from '@/components/ui/button';
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
import { setUserLocale } from '@/i18n/locale';
import { isStaging } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'zh', name: '简体中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('header');
  const tAdmin = useTranslations('adminHeader');
  const { user, logout, tenantCode } = useAuthStore();
  
  const [preferredLanguage, setPreferredLanguage] = useState(locale || 'en');
  
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
    await setUserLocale(langCode as 'en' | 'zh' | 'ja');
    router.refresh();
  };

  const displayName = user?.display_name || user?.username || 'AC Administrator';
  const email = user?.email || '';
  const avatarSeed = user?.username || 'admin';
  const currentLang = LANGUAGES.find(l => l.code === preferredLanguage) || LANGUAGES[0];

  return (
    <header 
      className="fixed right-0 left-0 md:left-64 h-16 bg-white/80 backdrop-blur-md border-b border-purple-100 z-30 px-6 flex items-center justify-between dark:bg-slate-950/80 dark:border-slate-800 transition-all"
      style={{ top: topOffset }}
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu size={20} />
        </Button>
        
        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center text-sm font-medium text-slate-500">
          <span className="text-purple-600 font-semibold">AC</span>
          {cleanedSegments.slice(1).map((segment, index) => (
            <React.Fragment key={`${segment}-${index}`}>
              <span className="mx-2 text-slate-300">/</span>
              <span className={index === cleanedSegments.length - 2 ? 'text-purple-600 capitalize' : 'capitalize'}>
                {segment.replace(/-/g, ' ')}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-full relative">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full border-2 border-white"></span>
        </Button>

        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 pl-2 outline-none hover:opacity-80 transition-opacity">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-700">{displayName}</p>
                <p className="text-xs text-purple-500 font-medium">{tenantCode || 'AC'}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-100 to-pink-100 flex items-center justify-center border-2 border-purple-200 shadow-sm overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}`} 
                  alt={displayName} 
                  className="w-full h-full object-cover" 
                />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{email}</p>
                <p className="text-xs leading-none text-purple-500 font-medium mt-1">{tAdmin('platformAdministrator')}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => router.push('/admin/profile')}>
              <User className="mr-2 h-4 w-4" />
              {t('profile')}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              {tAdmin('platformSettings')}
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
                        <Check className="ml-auto h-4 w-4 text-purple-600" />
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
  );
}
