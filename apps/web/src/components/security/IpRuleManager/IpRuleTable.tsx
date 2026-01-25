// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { formatDistanceToNow } from 'date-fns';
import { Trash2, Shield, ShieldOff, Clock, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';

import { IpRule } from './index';

interface IpRuleTableProps {
  rules: IpRule[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

export function IpRuleTable({ rules, isLoading, onDelete }: IpRuleTableProps) {
  const t = useTranslations('security');

  const getRuleTypeBadge = (ruleType: string) => {
    if (ruleType === 'whitelist') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Shield className="h-3 w-3 mr-1" />
          {t('whitelist')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <ShieldOff className="h-3 w-3 mr-1" />
        {t('blacklist')}
      </Badge>
    );
  };

  const getScopeBadge = (scope: string) => {
    const variants: Record<string, string> = {
      global: 'bg-purple-50 text-purple-700 border-purple-200',
      admin: 'bg-blue-50 text-blue-700 border-blue-200',
      public: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      api: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    };
    return (
      <Badge variant="outline" className={variants[scope] || ''}>
        {scope}
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    if (source === 'auto') {
      return (
        <Badge variant="secondary" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          {t('auto')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        {t('manual')}
      </Badge>
    );
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return t('permanent');
    
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    
    if (expiryDate < now) {
      return (
        <span className="text-red-500">
          {t('expired')}
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Clock className="h-3 w-3" />
        {formatDistanceToNow(expiryDate, { addSuffix: true })}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('noIpRules')}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('type')}</TableHead>
            <TableHead>{t('ipPattern')}</TableHead>
            <TableHead>{t('scope')}</TableHead>
            <TableHead>{t('reason')}</TableHead>
            <TableHead>{t('source')}</TableHead>
            <TableHead>{t('expiry')}</TableHead>
            <TableHead className="text-right">{t('hits')}</TableHead>
            <TableHead className="w-[80px]">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id} className={!rule.isActive ? 'opacity-50' : ''}>
              <TableCell>{getRuleTypeBadge(rule.ruleType)}</TableCell>
              <TableCell>
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {rule.ipPattern}
                </code>
              </TableCell>
              <TableCell>{getScopeBadge(rule.scope)}</TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                  {rule.reason || '-'}
                </span>
              </TableCell>
              <TableCell>{getSourceBadge(rule.source)}</TableCell>
              <TableCell className="text-sm">
                {formatExpiry(rule.expiresAt)}
              </TableCell>
              <TableCell className="text-right">
                <span className="font-mono text-sm">{rule.hitCount}</span>
              </TableCell>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => onDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('delete')}</TooltipContent>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
