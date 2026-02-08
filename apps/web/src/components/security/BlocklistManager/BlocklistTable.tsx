// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    AlertCircle,
    AlertTriangle,
    ArrowDownFromLine,
    Ban,
    Check,
    Edit2,
    Info,
    Lock,
    Power,
    PowerOff,
    Shield,
    Trash2,
} from 'lucide-react';
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

import { BlocklistEntry } from './index';


interface BlocklistTableProps {
  entries: BlocklistEntry[];
  isLoading: boolean;
  scopeType?: 'tenant' | 'subsidiary' | 'talent';
  scopeId?: string;
  onEdit: (entry: BlocklistEntry) => void;
  onDelete: (id: string) => void;
  onToggleActive: (entry: BlocklistEntry) => void;
  onDisable?: (entry: BlocklistEntry) => void;
  onEnable?: (entry: BlocklistEntry) => void;
}

export function BlocklistTable({
  entries,
  isLoading,
  scopeType: _scopeType = 'tenant',
  scopeId: _scopeId,
  onEdit,
  onDelete,
  onToggleActive,
  onDisable,
  onEnable,
}: BlocklistTableProps) {
  const t = useTranslations('security');

  // Render inheritance indicator
  const renderInheritanceIndicator = (entry: BlocklistEntry) => {
    if (!entry.isInherited) return null;
    
    return (
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <ArrowDownFromLine className="h-3.5 w-3.5 text-blue-500" />
          </TooltipTrigger>
          <TooltipContent>
            {t('inheritedFrom', { source: entry.ownerType })}
          </TooltipContent>
        </Tooltip>
        {entry.isForceUse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Lock className="h-3.5 w-3.5 text-orange-500" />
            </TooltipTrigger>
            <TooltipContent>{t('forceUse')}</TooltipContent>
          </Tooltip>
        )}
        {entry.isSystem && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Shield className="h-3.5 w-3.5 text-purple-500" />
            </TooltipTrigger>
            <TooltipContent>{t('systemPreset')}</TooltipContent>
          </Tooltip>
        )}
        {entry.isDisabledHere && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {t('disabledHere')}
          </Badge>
        )}
      </div>
    );
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        // Use white icon for better contrast on red destructive badge
        return <AlertTriangle className="h-4 w-4 text-white" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-900" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };


  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'destructive' | 'warning' | 'secondary'> = {
      high: 'destructive',
      medium: 'warning',
      low: 'secondary',
    };
    return (
      <Badge variant={variants[severity] || 'secondary'}>
        {getSeverityIcon(severity)}
        <span className="ml-1">{t(`severity.${severity}`)}</span>
      </Badge>
    );
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'destructive' | 'warning' | 'outline'> = {
      reject: 'destructive',
      flag: 'warning',
      replace: 'outline',
    };
    return (
      <Badge variant={variants[action] || 'outline'}>
        {t(`action.${action}`)}
      </Badge>
    );
  };

  const getPatternTypeBadge = (patternType: string) => {
    return (
      <Badge variant="outline" className="font-mono text-xs">
        {patternType}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('noBlocklistEntries')}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">{t('status')}</TableHead>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('pattern')}</TableHead>
            <TableHead>{t('type')}</TableHead>
            <TableHead>{t('severityLabel')}</TableHead>
            <TableHead>{t('actionLabel')}</TableHead>
            <TableHead>{t('scope')}</TableHead>
            <TableHead className="text-right">{t('matches')}</TableHead>
            <TableHead className="w-[150px]">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow 
              key={entry.id} 
              className={`${!entry.isActive || entry.isDisabledHere ? 'opacity-50' : ''}`}
            >
              <TableCell>
                {/* Status: only show toggle for non-inherited entries */}
                {!entry.isInherited ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onToggleActive(entry)}
                      >
                        {entry.isActive ? (
                          <Power className="h-4 w-4 text-green-500" />
                        ) : (
                          <PowerOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {entry.isActive ? t('clickToDeactivate') : t('clickToActivate')}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="h-8 w-8 flex items-center justify-center">
                    {entry.isDisabledHere ? (
                      <Ban className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Power className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div>
                    <div className="font-medium">{entry.nameEn}</div>
                    {entry.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {entry.description}
                      </div>
                    )}
                  </div>
                  {renderInheritanceIndicator(entry)}
                </div>
              </TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {entry.pattern.length > 30 
                    ? `${entry.pattern.substring(0, 30)}...` 
                    : entry.pattern}
                </code>
              </TableCell>
              <TableCell>{getPatternTypeBadge(entry.patternType)}</TableCell>
              <TableCell>{getSeverityBadge(entry.severity)}</TableCell>
              <TableCell>{getActionBadge(entry.action)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {entry.scope.slice(0, 2).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                  {entry.scope.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{entry.scope.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-mono text-sm">{entry.matchCount}</span>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {/* Edit - only for non-inherited entries */}
                  {!entry.isInherited && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onEdit(entry)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('edit')}</TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* Disable/Enable - only for inherited entries that can be disabled */}
                  {entry.isInherited && entry.canDisable && onDisable && onEnable && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => entry.isDisabledHere ? onEnable(entry) : onDisable(entry)}
                        >
                          {entry.isDisabledHere ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Ban className="h-4 w-4 text-orange-500" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {entry.isDisabledHere ? t('enableHere') : t('disableHere')}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* Delete - only for non-inherited entries */}
                  {!entry.isInherited && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => onDelete(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('delete')}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
