// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Plus, RefreshCw, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { securityApi } from '@/lib/api/client';

import { IpChecker } from './IpChecker';
import { IpRuleForm } from './IpRuleForm';
import { IpRuleTable } from './IpRuleTable';

export interface IpRule {
  id: string;
  ruleType: 'whitelist' | 'blacklist';
  ipPattern: string;
  scope: string;
  reason: string | null;
  source: 'manual' | 'auto';
  expiresAt: string | null;
  hitCount: number;
  lastHitAt: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
}

export function IpRuleManager() {
  const t = useTranslations('security');
  const [rules, setRules] = useState<IpRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'whitelist' | 'blacklist'>('all');

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await securityApi.getIpRules();
      if (response.success && response.data) {
        const items = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).items || [];
        setRules(items.map((item: any) => ({
          id: item.id,
          ruleType: item.rule_type || item.ruleType || 'blacklist',
          ipPattern: item.ip_pattern || item.ipPattern || '',
          scope: item.scope || 'global',
          reason: item.reason || null,
          source: item.source || 'manual',
          expiresAt: item.expires_at || item.expiresAt || null,
          hitCount: item.hit_count || item.hitCount || 0,
          lastHitAt: item.last_hit_at || item.lastHitAt || null,
          isActive: item.is_active ?? item.isActive ?? true,
          createdAt: item.created_at || item.createdAt || '',
          createdBy: item.created_by || item.createdBy || null,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch IP rules:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleCreate = async (data: { ruleType: string; ipPattern: string; scope: string; reason?: string }) => {
    try {
      await securityApi.createIpRule(data);
      setShowForm(false);
      fetchRules();
    } catch (error) {
      console.error('Failed to create IP rule:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteIpRule'))) return;
    
    try {
      await securityApi.deleteIpRule(id);
      fetchRules();
    } catch (error) {
      console.error('Failed to delete IP rule:', error);
    }
  };

  // Filter rules based on active tab
  const filteredRules = rules.filter((rule) => {
    if (activeTab === 'all') return true;
    return rule.ruleType === activeTab;
  });

  const whitelistCount = rules.filter((r) => r.ruleType === 'whitelist').length;
  const blacklistCount = rules.filter((r) => r.ruleType === 'blacklist').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-blue-500" />
              <div>
                <CardTitle>{t('ipRuleManager')}</CardTitle>
                <CardDescription>{t('ipRuleDescription')}</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchRules} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addIpRule')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                {t('all')} ({rules.length})
              </TabsTrigger>
              <TabsTrigger value="whitelist">
                {t('whitelist')} ({whitelistCount})
              </TabsTrigger>
              <TabsTrigger value="blacklist">
                {t('blacklist')} ({blacklistCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <IpRuleTable
                rules={filteredRules}
                isLoading={isLoading}
                onDelete={handleDelete}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* IP Checker */}
      <IpChecker />

      {/* Create Form Dialog */}
      {showForm && (
        <IpRuleForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
