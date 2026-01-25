// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
  Globe,
  Link2,
  Type,
  Shield,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Lock,
  Ban,
  Check,
  ArrowDownFromLine,
  Filter,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { PatternDialog } from './PatternDialog';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { externalBlocklistApi, type ExternalBlocklistPattern } from '@/lib/api/client';

interface ExternalBlocklistManagerProps {
  scopeType?: 'tenant' | 'subsidiary' | 'talent';
  scopeId?: string;
  // Legacy props for backward compatibility
  ownerType?: 'tenant' | 'talent';
  ownerId?: string;
  showInherited?: boolean;
  talentId?: string;
}

export function ExternalBlocklistManager({
  scopeType: propScopeType,
  scopeId: propScopeId,
  // Legacy props
  ownerType,
  ownerId,
  showInherited: _showInherited = true,
  talentId,
}: ExternalBlocklistManagerProps) {
  // Determine actual scope (prefer new props, fallback to legacy)
  const effectiveScopeType = propScopeType ?? ownerType ?? 'tenant';
  const effectiveScopeId = propScopeId ?? (ownerType === 'talent' ? talentId : ownerId);
  
  const t = useTranslations('externalBlocklist');
  const [patterns, setPatterns] = useState<ExternalBlocklistPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ExternalBlocklistPattern | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPattern, setDeletingPattern] = useState<ExternalBlocklistPattern | null>(null);
  const [showInherited, setShowInherited] = useState(true);
  const [showDisabled, setShowDisabled] = useState(false);

  const loadPatterns = useCallback(async () => {
    setLoading(true);
    try {
      // Use new API with scope parameters
      const result = await externalBlocklistApi.list({
        scopeType: effectiveScopeType,
        scopeId: effectiveScopeId,
        includeInherited: showInherited,
        includeDisabled: showDisabled,
      });
      setPatterns(result.data || []);
    } catch (error) {
      console.error('Failed to load patterns:', error);
      toast.error(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [effectiveScopeType, effectiveScopeId, showInherited, showDisabled, t]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  const handleCreate = () => {
    setEditingPattern(null);
    setDialogOpen(true);
  };

  const handleEdit = (pattern: ExternalBlocklistPattern) => {
    if (pattern.isInherited) {
      toast.error(t('cannotEditInherited'));
      return;
    }
    setEditingPattern(pattern);
    setDialogOpen(true);
  };

  const handleDelete = (pattern: ExternalBlocklistPattern) => {
    if (pattern.isInherited) {
      toast.error(t('cannotDeleteInherited'));
      return;
    }
    setDeletingPattern(pattern);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingPattern) return;
    try {
      await externalBlocklistApi.delete(deletingPattern.id);
      toast.success(t('deleteSuccess'));
      loadPatterns();
    } catch (error) {
      console.error('Failed to delete pattern:', error);
      toast.error(t('deleteError'));
    } finally {
      setDeleteDialogOpen(false);
      setDeletingPattern(null);
    }
  };

  const handleToggle = async (pattern: ExternalBlocklistPattern) => {
    if (pattern.isInherited) {
      toast.error(t('cannotToggleInherited'));
      return;
    }
    try {
      await externalBlocklistApi.update(pattern.id, {
        isActive: !pattern.isActive,
        version: pattern.version,
      });
      toast.success(pattern.isActive ? t('disabled') : t('enabled'));
      loadPatterns();
    } catch (error) {
      console.error('Failed to toggle pattern:', error);
      toast.error(t('toggleError'));
    }
  };

  const handleDisable = async (pattern: ExternalBlocklistPattern) => {
    try {
      await externalBlocklistApi.disable(pattern.id, {
        scopeType: effectiveScopeType,
        scopeId: effectiveScopeId,
      });
      toast.success(t('disabledHereSuccess'));
      loadPatterns();
    } catch (error) {
      console.error('Failed to disable pattern:', error);
      toast.error(t('disableError'));
    }
  };

  const handleEnable = async (pattern: ExternalBlocklistPattern) => {
    try {
      await externalBlocklistApi.enable(pattern.id, {
        scopeType: effectiveScopeType,
        scopeId: effectiveScopeId,
      });
      toast.success(t('enabledHereSuccess'));
      loadPatterns();
    } catch (error) {
      console.error('Failed to enable pattern:', error);
      toast.error(t('enableError'));
    }
  };

  const handleDialogClose = (saved: boolean) => {
    setDialogOpen(false);
    setEditingPattern(null);
    if (saved) {
      loadPatterns();
    }
  };

  const getPatternTypeIcon = (type: string) => {
    switch (type) {
      case 'domain':
        return <Globe size={14} className="text-blue-500" />;
      case 'url_regex':
        return <Link2 size={14} className="text-purple-500" />;
      case 'keyword':
        return <Type size={14} className="text-green-500" />;
      default:
        return <Shield size={14} />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'destructive' | 'secondary' | 'outline'> = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline',
    };
    return <Badge variant={variants[severity] || 'secondary'}>{t(`severity.${severity}`)}</Badge>;
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      reject: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      flag: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      replace: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[action] || ''}`}>
        {t(`action.${action}`)}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink size={20} />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Button onClick={handleCreate} size="sm">
            <Plus size={16} className="mr-1" />
            {t('addPattern')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters - show only for non-tenant scopes */}
        {effectiveScopeType !== 'tenant' && (
          <div className="flex items-center gap-6 mb-4 p-3 bg-muted/50 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Switch
                id="show-inherited-ext"
                checked={showInherited}
                onCheckedChange={setShowInherited}
              />
              <Label htmlFor="show-inherited-ext" className="text-sm">
                {t('showInheritedPatterns')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-disabled-ext"
                checked={showDisabled}
                onCheckedChange={setShowDisabled}
              />
              <Label htmlFor="show-disabled-ext" className="text-sm">
                {t('showDisabledPatterns')}
              </Label>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : patterns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield size={48} className="mx-auto mb-4 opacity-50" />
            <p>{t('noPatterns')}</p>
          </div>
        ) : (
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">{t('table.type')}</TableHead>
                  <TableHead>{t('table.pattern')}</TableHead>
                  <TableHead>{t('table.name')}</TableHead>
                  <TableHead>{t('table.category')}</TableHead>
                  <TableHead>{t('table.severity')}</TableHead>
                  <TableHead>{t('table.action')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead className="w-[150px]">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patterns.map((pattern) => (
                  <TableRow 
                    key={pattern.id} 
                    className={`${pattern.isInherited ? 'opacity-70' : ''} ${pattern.isDisabledHere ? 'opacity-50' : ''}`}
                  >
                    <TableCell>{getPatternTypeIcon(pattern.patternType)}</TableCell>
                    <TableCell className="font-mono text-sm max-w-[200px] truncate" title={pattern.pattern}>
                      {pattern.pattern}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{pattern.nameEn}</span>
                        {/* Inheritance indicators */}
                        {pattern.isInherited && (
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <ArrowDownFromLine size={12} className="text-blue-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                {t('inheritedFrom', { source: pattern.ownerType })}
                              </TooltipContent>
                            </Tooltip>
                            {pattern.isForceUse && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock size={12} className="text-orange-500" />
                                </TooltipTrigger>
                                <TooltipContent>{t('forceUse')}</TooltipContent>
                              </Tooltip>
                            )}
                            {pattern.isDisabledHere && (
                              <Badge variant="outline" className="text-xs">
                                {t('disabledHere')}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{pattern.category || '-'}</TableCell>
                    <TableCell>{getSeverityBadge(pattern.severity)}</TableCell>
                    <TableCell>{getActionBadge(pattern.action)}</TableCell>
                    <TableCell>
                      {pattern.isDisabledHere ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          {t('status.disabledHere')}
                        </Badge>
                      ) : (
                        <Badge variant={pattern.isActive ? 'default' : 'outline'}>
                          {pattern.isActive ? t('status.active') : t('status.inactive')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* Toggle active - only for non-inherited */}
                        {!pattern.isInherited && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggle(pattern)}
                                >
                                  {pattern.isActive ? (
                                    <ToggleRight size={16} className="text-green-500" />
                                  ) : (
                                    <ToggleLeft size={16} className="text-muted-foreground" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {pattern.isActive ? t('deactivate') : t('activate')}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(pattern)}
                                >
                                  <Pencil size={16} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('edit')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(pattern)}
                                >
                                  <Trash2 size={16} className="text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('delete')}</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        
                        {/* Disable/Enable inherited - only for inherited patterns that can be disabled */}
                        {pattern.isInherited && pattern.canDisable && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => pattern.isDisabledHere ? handleEnable(pattern) : handleDisable(pattern)}
                              >
                                {pattern.isDisabledHere ? (
                                  <Check size={16} className="text-green-500" />
                                ) : (
                                  <Ban size={16} className="text-orange-500" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {pattern.isDisabledHere ? t('enableHere') : t('disableHere')}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {/* Show lock icon for force-use inherited patterns */}
                        {pattern.isInherited && !pattern.canDisable && (
                          <span className="text-xs text-muted-foreground px-2">{t('inherited')}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        )}
      </CardContent>

      <PatternDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        pattern={editingPattern}
        ownerType={effectiveScopeType}
        ownerId={effectiveScopeId}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('confirmDeleteMessage', { pattern: deletingPattern?.pattern || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
