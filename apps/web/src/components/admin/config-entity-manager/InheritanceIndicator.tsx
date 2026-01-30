// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InheritanceIndicatorProps {
  isInherited: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  isDisabledHere: boolean;
  canDisable: boolean;
  ownerType: string;
  ownerName?: string | null;
  locale?: 'en' | 'zh' | 'ja';
}

const translations = {
  en: {
    inherited: 'Inherited',
    forceUse: 'Required',
    system: 'System',
    disabled: 'Disabled',
    canDisable: 'Can be disabled',
    tenant: 'Tenant',
    subsidiary: 'Subsidiary',
    talent: 'Talent',
    inheritedFrom: 'Inherited from',
    ownConfig: 'Own configuration',
  },
  zh: {
    inherited: '继承',
    forceUse: '强制使用',
    system: '系统',
    disabled: '已禁用',
    canDisable: '可禁用',
    tenant: '租户',
    subsidiary: '分级目录',
    talent: '艺人',
    inheritedFrom: '继承自',
    ownConfig: '自有配置',
  },
  ja: {
    inherited: '継承',
    forceUse: '必須',
    system: 'システム',
    disabled: '無効',
    canDisable: '無効化可能',
    tenant: 'テナント',
    subsidiary: '子会社',
    talent: 'タレント',
    inheritedFrom: '継承元',
    ownConfig: '自己設定',
  },
};

export function InheritanceIndicator({
  isInherited,
  isForceUse,
  isSystem,
  isDisabledHere,
  canDisable: _canDisable,
  ownerType,
  ownerName,
  locale = 'en',
}: InheritanceIndicatorProps) {
  const t = translations[locale];
  const ownerTypeLabel = t[ownerType as keyof typeof t] || ownerType;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        {isSystem && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs">
                {t.system}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>System preset configuration</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isForceUse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="text-xs">
                {t.forceUse}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>This configuration is required and cannot be disabled</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isInherited && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                {t.inherited}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t.inheritedFrom}: {ownerTypeLabel}
                {ownerName && ` (${ownerName})`}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {isDisabledHere && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs text-muted-foreground">
                {t.disabled}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>This inherited configuration is disabled at current scope</p>
            </TooltipContent>
          </Tooltip>
        )}

        {!isInherited && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="default" className="text-xs bg-blue-500">
                {ownerTypeLabel}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t.ownConfig}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
