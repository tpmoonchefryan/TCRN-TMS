// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Info, Plus, Search, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';

/**
 * AC Customers Page
 * 
 * Per PRD §7, AC tenant has "Customer Management" module but operates differently
 * from regular tenant Customer Management. AC's customers are platform-level entities
 * that may represent business partners, API consumers, or other platform stakeholders.
 * 
 * For now, this is a placeholder showing the structure. Full implementation would
 * require a dedicated AC Customer API endpoint.
 */
export default function AcCustomersPage() {
  const t = useTranslations('adminConsole.acCustomers');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddCustomer = () => {
    toast.info(t('comingSoon'), {
      description: t('underDevelopment'),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {t('title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('description')}
          </p>
        </div>
        <Button 
          className="bg-purple-600 hover:bg-purple-700"
          onClick={handleAddCustomer}
        >
          <Plus size={16} className="mr-2" />
          {t('createCustomer')}
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder={t('searchPlaceholder')} 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <Info size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">
            {t('infoTitle')}
          </p>
          <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">
            {t('infoDescription')}
          </p>
        </div>
      </div>

      <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} className="text-purple-600" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <Users size={48} className="mx-auto mb-4 text-slate-300" />
            <p>{t('noCustomers')}</p>
            <p className="text-sm text-slate-400 mt-2">
              {t('noCustomersDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
