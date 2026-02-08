// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    AlertTriangle,
    Globe,
    Loader2,
    Plus,
    Search,
    Shield,
    Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { configEntityApi, externalBlocklistApi, securityApi } from '@/lib/api/client';

import type { ScopeType } from './constants';

// Security entry types
const SECURITY_TYPES = [
  { 
    code: 'blocklist', 
    name: 'Content Blocklist', 
    nameZh: '内容屏蔽词', 
    icon: '🛡️',
    description: 'Block specific words or patterns in Marshmallow content',
    tenantOnly: false,
  },
  { 
    code: 'external-blocklist', 
    name: 'External Blocklist', 
    nameZh: 'URL/域名屏蔽', 
    icon: '🌐',
    description: 'Block external URLs and domains',
    tenantOnly: false,
  },
  { 
    code: 'ip-rules', 
    name: 'IP Rules', 
    nameZh: 'IP 访问规则', 
    icon: '🔒',
    description: 'Whitelist or blacklist IP addresses',
    tenantOnly: true,
  },
] as const;

type SecurityTypeCode = typeof SECURITY_TYPES[number]['code'];

// Types
interface BlocklistEntry {
  id: string;
  pattern: string;
  patternType: 'keyword' | 'regex' | 'wildcard';
  action: 'block' | 'warn' | 'flag';
  severity: string;
  isActive: boolean;
  inheritedFrom?: string;
}

interface ExternalBlocklistEntry {
  id: string;
  pattern: string;
  patternType: 'domain' | 'url_regex' | 'keyword';
  action: 'block' | 'warn';
  isActive: boolean;
  inheritedFrom?: string;
}

interface IpRule {
  id: string;
  ipPattern: string;
  ruleType: 'allow' | 'deny';
  scope: string;
  reason: string;
  isActive: boolean;
}

interface SecurityPanelProps {
  scopeType: ScopeType;
  scopeId: string;
  canEdit?: boolean;
}

export function SecurityPanel({
  scopeType,
  scopeId,
  canEdit = true,
}: SecurityPanelProps) {
  const t = useTranslations('security');
  const tc = useTranslations('common');

  // State
  const [activeSecurityType, setActiveSecurityType] = useState<SecurityTypeCode>('blocklist');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data state
  const [blocklistEntries, setBlocklistEntries] = useState<BlocklistEntry[]>([]);
  const [externalEntries, setExternalEntries] = useState<ExternalBlocklistEntry[]>([]);
  const [ipRules, setIpRules] = useState<IpRule[]>([]);

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState<Record<string, string>>({});

  // Fetch blocklist entries (Config Entity)
  const fetchBlocklist = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await configEntityApi.list('blocklist-entry', {
        scopeType,
        scopeId,
        includeInherited: true,
      });
      if (response.success && response.data) {
        setBlocklistEntries(response.data.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          pattern: (item.code as string) || '',
          patternType: (item.patternType as 'keyword') || 'keyword',
          action: (item.action as 'block') || 'block',
          severity: (item.severity as string) || 'medium',
          isActive: (item.isActive as boolean) ?? true,
          inheritedFrom: item.inheritedFrom as string | undefined,
        })));
      }
    } catch {
      // Keep empty
    } finally {
      setIsLoading(false);
    }
  }, [scopeType, scopeId]);

  // Fetch external blocklist
  const fetchExternalBlocklist = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await externalBlocklistApi.list({
        scopeType: scopeType as 'tenant' | 'subsidiary' | 'talent',
        scopeId,
        includeInherited: true,
      });
      if (response.success && response.data) {
        setExternalEntries(response.data.map((item) => ({
          id: item.id,
          pattern: item.pattern || '',
          patternType: item.patternType || 'domain',
          action: (item.action as 'block' | 'warn') || 'block',
          isActive: item.isActive ?? true,
          inheritedFrom: item.isInherited ? 'Inherited' : undefined,
        })));
      }
    } catch {
      // Keep empty
    } finally {
      setIsLoading(false);
    }
  }, [scopeType, scopeId]);

  // Fetch IP rules (tenant only)
  const fetchIpRules = useCallback(async () => {
    if (scopeType !== 'tenant') return;
    setIsLoading(true);
    try {
      const response = await securityApi.getIpRules();
      if (response.success && response.data) {
        setIpRules(response.data.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          ipPattern: (item.ipPattern as string) || '',
          ruleType: (item.ruleType as 'allow' | 'deny') || 'allow',
          scope: (item.scope as string) || 'global',
          reason: (item.reason as string) || '',
          isActive: (item.isActive as boolean) ?? true,
        })));
      }
    } catch {
      // Keep empty
    } finally {
      setIsLoading(false);
    }
  }, [scopeType]);

  // Fetch data based on active type
  useEffect(() => {
    if (activeSecurityType === 'blocklist') {
      fetchBlocklist();
    } else if (activeSecurityType === 'external-blocklist') {
      fetchExternalBlocklist();
    } else if (activeSecurityType === 'ip-rules') {
      fetchIpRules();
    }
  }, [activeSecurityType, fetchBlocklist, fetchExternalBlocklist, fetchIpRules]);

  // Add entry handler
  const handleAddEntry = async () => {
    try {
      if (activeSecurityType === 'blocklist') {
        await configEntityApi.create('blocklist-entry', {
          code: newEntry.pattern,
          nameEn: newEntry.pattern,
          nameZh: newEntry.pattern,
          ownerType: scopeType,
          ownerId: scopeId,
        });
        fetchBlocklist();
      } else if (activeSecurityType === 'external-blocklist') {
        await externalBlocklistApi.create({
          ownerType: scopeType as 'tenant' | 'subsidiary' | 'talent',
          ownerId: scopeId,
          pattern: newEntry.pattern,
          patternType: (newEntry.patternType as 'domain' | 'url_regex' | 'keyword') || 'domain',
          nameEn: newEntry.pattern,
          action: (newEntry.action as 'reject' | 'flag') || 'reject',
        });
        fetchExternalBlocklist();
      } else if (activeSecurityType === 'ip-rules') {
        await securityApi.createIpRule({
          ipPattern: newEntry.ip,
          ruleType: newEntry.type || 'allow',
          scope: 'global',
          reason: newEntry.description,
        });
        fetchIpRules();
      }
      toast.success(tc('success'));
      setShowAddDialog(false);
      setNewEntry({});
    } catch {
      toast.error(tc('error'));
    }
  };

  // Delete entry handler
  const handleDeleteEntry = async (id: string) => {
    try {
      if (activeSecurityType === 'blocklist') {
        await configEntityApi.deactivate('blocklist-entry', id, 1);
        fetchBlocklist();
      } else if (activeSecurityType === 'external-blocklist') {
        await externalBlocklistApi.delete(id);
        fetchExternalBlocklist();
      } else if (activeSecurityType === 'ip-rules') {
        await securityApi.deleteIpRule(id);
        fetchIpRules();
      }
      toast.success(tc('deleted'));
    } catch {
      toast.error(tc('error'));
    }
  };

  // Filter entries based on search
  const filteredBlocklist = useMemo(() => {
    if (!searchQuery) return blocklistEntries;
    const search = searchQuery.toLowerCase();
    return blocklistEntries.filter(e => e.pattern.toLowerCase().includes(search));
  }, [blocklistEntries, searchQuery]);

  const filteredExternal = useMemo(() => {
    if (!searchQuery) return externalEntries;
    const search = searchQuery.toLowerCase();
    return externalEntries.filter(e => e.pattern.toLowerCase().includes(search));
  }, [externalEntries, searchQuery]);

  const filteredIpRules = useMemo(() => {
    if (!searchQuery) return ipRules;
    const search = searchQuery.toLowerCase();
    return ipRules.filter(e => 
      e.ipPattern.toLowerCase().includes(search) || 
      e.reason.toLowerCase().includes(search)
    );
  }, [ipRules, searchQuery]);

  const selectedTypeInfo = SECURITY_TYPES.find(t => t.code === activeSecurityType);

  // Filter available types based on scope
  const availableTypes = SECURITY_TYPES.filter(t => 
    !t.tenantOnly || scopeType === 'tenant'
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeSecurityType} onValueChange={(v) => setActiveSecurityType(v as SecurityTypeCode)}>
          <TabsList className="mb-4">
            {availableTypes.map(type => (
              <TabsTrigger key={type.code} value={type.code} className="gap-2">
                <span>{type.icon}</span>
                {type.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Search and Add */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {canEdit && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus size={16} className="mr-2" />
                {t('addEntry')}
              </Button>
            )}
          </div>

          {/* Blocklist Tab */}
          <TabsContent value="blocklist">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredBlocklist.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>{t('noEntries')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('pattern')}</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('action')}</TableHead>
                      <TableHead>{tc('source')}</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBlocklist.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono">{entry.pattern}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.patternType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={entry.action === 'block' ? 'destructive' : 'secondary'}
                          >
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.inheritedFrom ? (
                            <Badge variant="secondary">{tc('inherited')}</Badge>
                          ) : (
                            <Badge>{tc('local')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!entry.inheritedFrom && canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>

          {/* External Blocklist Tab */}
          <TabsContent value="external-blocklist">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredExternal.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>{t('noEntries')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('pattern')}</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('action')}</TableHead>
                      <TableHead>{tc('source')}</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExternal.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono">{entry.pattern}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.patternType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={entry.action === 'block' ? 'destructive' : 'secondary'}
                          >
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.inheritedFrom ? (
                            <Badge variant="secondary">{tc('inherited')}</Badge>
                          ) : (
                            <Badge>{tc('local')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!entry.inheritedFrom && canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>

          {/* IP Rules Tab (Tenant only) */}
          <TabsContent value="ip-rules">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredIpRules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>{t('noIpRules')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('ipAddress')}</TableHead>
                      <TableHead>{t('ruleType')}</TableHead>
                      <TableHead>{t('description')}</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIpRules.map(rule => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-mono">{rule.ipPattern}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={rule.ruleType === 'deny' ? 'destructive' : 'default'}
                          >
                            {rule.ruleType}
                          </Badge>
                        </TableCell>
                        <TableCell>{rule.reason}</TableCell>
                        <TableCell>
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => handleDeleteEntry(rule.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Add Entry Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addEntry')}</DialogTitle>
              <DialogDescription>
                {selectedTypeInfo?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {activeSecurityType === 'ip-rules' ? (
                <>
                  <div className="space-y-2">
                    <Label>{t('ipAddress')} *</Label>
                    <Input
                      value={newEntry.ip || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, ip: e.target.value })}
                      placeholder="192.168.1.1 or 10.0.0.0/8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('ruleType')}</Label>
                    <Select
                      value={newEntry.type || 'allow'}
                      onValueChange={(v) => setNewEntry({ ...newEntry, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allow">{t('whitelist')}</SelectItem>
                        <SelectItem value="deny">{t('blacklist')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('description')}</Label>
                    <Input
                      value={newEntry.description || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{t('pattern')} *</Label>
                    <Input
                      value={newEntry.pattern || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, pattern: e.target.value })}
                      placeholder={activeSecurityType === 'external-blocklist' ? 'example.com' : 'blocked_word'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('patternType')}</Label>
                    <Select
                      value={newEntry.patternType || (activeSecurityType === 'external-blocklist' ? 'domain' : 'keyword')}
                      onValueChange={(v) => setNewEntry({ ...newEntry, patternType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSecurityType === 'external-blocklist' ? (
                          <>
                            <SelectItem value="domain">{t('domain')}</SelectItem>
                            <SelectItem value="url_regex">{t('urlRegex')}</SelectItem>
                            <SelectItem value="keyword">{t('keyword')}</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="keyword">{t('keyword')}</SelectItem>
                            <SelectItem value="regex">{t('regex')}</SelectItem>
                            <SelectItem value="wildcard">{t('wildcard')}</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('action')}</Label>
                    <Select
                      value={newEntry.action || 'block'}
                      onValueChange={(v) => setNewEntry({ ...newEntry, action: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">{t('block')}</SelectItem>
                        <SelectItem value="warn">{t('warn')}</SelectItem>
                        {activeSecurityType === 'blocklist' && (
                          <SelectItem value="flag">{t('flag')}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleAddEntry}>{tc('add')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
