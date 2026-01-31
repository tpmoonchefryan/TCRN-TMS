/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowLeft, Building2, Loader2, Lock, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button, Card, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@/components/ui';
import { companyCustomerApi, customerApi } from '@/lib/api/client';
import { useTalentStore } from '@/stores/talent-store';

interface IndividualFormData {
  nickname: string;
  statusCode: string;
  tags: string;
  notes: string;
  givenName: string;
  familyName: string;
  phoneNumber: string;
  email: string;
}

interface CompanyFormData {
  nickname: string;
  statusCode: string;
  tags: string;
  notes: string;
  companyLegalName: string;
  companyShortName: string;
  registrationNumber: string;
  website: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const t = useTranslations('newCustomer');
  const tCommon = useTranslations('common');
  const te = useTranslations('errors');
  const { currentTalent } = useTalentStore();

  // Helper to get translated error message from API error
  const getErrorMessage = (error: any): string => {
    const errorCode = error?.code;
    if (errorCode && typeof errorCode === 'string') {
      try {
        const translated = te(errorCode as any);
        if (translated && translated !== errorCode && !translated.startsWith('MISSING_MESSAGE')) {
          return translated;
        }
      } catch {
        // Fall through
      }
    }
    return error?.message || te('generic');
  };
  
  const [type, setType] = useState<'individual' | 'company' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Individual form state
  const [individualForm, setIndividualForm] = useState<IndividualFormData>({
    nickname: '',
    statusCode: 'NEW',
    tags: '',
    notes: '',
    givenName: '',
    familyName: '',
    phoneNumber: '',
    email: '',
  });
  
  // Company form state
  const [companyForm, setCompanyForm] = useState<CompanyFormData>({
    nickname: '',
    statusCode: 'NEW',
    tags: '',
    notes: '',
    companyLegalName: '',
    companyShortName: '',
    registrationNumber: '',
    website: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  });

  const handleIndividualSubmit = async () => {
    if (!currentTalent) {
      toast.error(t('selectTalentFirst'));
      return;
    }
    
    if (!individualForm.nickname.trim()) {
      toast.error(te('VALIDATION_FIELD_REQUIRED'));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Construct full name from given name and family name
      const fullName = [individualForm.familyName, individualForm.givenName]
        .filter(Boolean)
        .join(' ') || undefined;
      
      const response = await customerApi.create({
        talentId: currentTalent.id,
        profileStoreId: '', // Will be resolved by backend from talent
        profileType: 'individual',
        nickname: individualForm.nickname.trim(),
        primaryLanguage: 'en',
        tags: individualForm.tags ? individualForm.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        notes: individualForm.notes || undefined,
        pii: {
          realName: fullName,
          phone: individualForm.phoneNumber || undefined,
          email: individualForm.email || undefined,
        },
      });
      
      if (response.success && response.data) {
        toast.success(t('createSuccess'));
        router.push(`/customers/${response.data.id}`);
      } else {
        throw response.error || new Error('Failed to create customer');
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompanySubmit = async () => {
    if (!currentTalent) {
      toast.error(t('selectTalentFirst'));
      return;
    }
    
    if (!companyForm.nickname.trim()) {
      toast.error(te('VALIDATION_FIELD_REQUIRED'));
      return;
    }
    
    if (!companyForm.companyLegalName.trim()) {
      toast.error(te('VALIDATION_FIELD_REQUIRED'));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await companyCustomerApi.create({
        talentId: currentTalent.id,
        nickname: companyForm.nickname.trim(),
        primaryLanguage: 'en',
        statusCode: companyForm.statusCode || undefined,
        tags: companyForm.tags ? companyForm.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        notes: companyForm.notes || undefined,
        companyLegalName: companyForm.companyLegalName.trim(),
        companyShortName: companyForm.companyShortName || undefined,
        registrationNumber: companyForm.registrationNumber || undefined,
        website: companyForm.website || undefined,
        contactName: companyForm.contactName || undefined,
        contactPhone: companyForm.contactPhone || undefined,
        contactEmail: companyForm.contactEmail || undefined,
      }, currentTalent.id);
      
      if (response.success && response.data) {
        toast.success(t('createSuccess'));
        router.push(`/customers/${response.data.id}`);
      } else {
        throw response.error || new Error('Failed to create company');
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show message if no talent selected
  if (!currentTalent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <User className="h-12 w-12 mb-4 opacity-50" />
        <p>Please select a talent to create a customer</p>
      </div>
    );
  }

  if (!type) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-muted-foreground">{t('selectType')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="p-8 hover:border-primary cursor-pointer transition-all hover:shadow-md group"
            onClick={() => setType('individual')}
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <User size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('individualTitle')}</h3>
            <p className="text-slate-500 mb-6 leading-relaxed">
              {t('individualDesc')}
            </p>
            <Button className="w-full" variant="secondary">{t('select')}</Button>
          </Card>

          <Card 
            className="p-8 hover:border-primary cursor-pointer transition-all hover:shadow-md group"
            onClick={() => setType('company')}
          >
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Building2 size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('companyTitle')}</h3>
            <p className="text-slate-500 mb-6 leading-relaxed">
              {t('companyDesc')}
            </p>
            <Button className="w-full" variant="secondary">{t('select')}</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => setType(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {type === 'individual' ? t('newIndividualProfile') : t('newCompanyProfile')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('createRecord')}</p>
        </div>
      </div>

      <div className="space-y-8">
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">{t('basicInfo')}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('nicknameLabel')} *</Label>
                <Input 
                  placeholder={t('nicknamePlaceholder')} 
                  autoFocus 
                  value={type === 'individual' ? individualForm.nickname : companyForm.nickname}
                  onChange={(e) => type === 'individual' 
                    ? setIndividualForm(f => ({ ...f, nickname: e.target.value }))
                    : setCompanyForm(f => ({ ...f, nickname: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('statusLabel')}</Label>
                <Select 
                  value={type === 'individual' ? individualForm.statusCode : companyForm.statusCode}
                  onValueChange={(value) => type === 'individual'
                    ? setIndividualForm(f => ({ ...f, statusCode: value }))
                    : setCompanyForm(f => ({ ...f, statusCode: value }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">{t('statusNew')}</SelectItem>
                    <SelectItem value="ACTIVE">{t('statusActive')}</SelectItem>
                    <SelectItem value="VIP">{t('statusVip')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('tagsLabel')}</Label>
              <Input 
                placeholder={t('tagsPlaceholder')} 
                value={type === 'individual' ? individualForm.tags : companyForm.tags}
                onChange={(e) => type === 'individual'
                  ? setIndividualForm(f => ({ ...f, tags: e.target.value }))
                  : setCompanyForm(f => ({ ...f, tags: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Internal notes about this customer..."
                rows={3}
                value={type === 'individual' ? individualForm.notes : companyForm.notes}
                onChange={(e) => type === 'individual'
                  ? setIndividualForm(f => ({ ...f, notes: e.target.value }))
                  : setCompanyForm(f => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>

          {type === 'individual' && (
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-medium border-b pb-2 flex items-center gap-2 text-blue-600">
                <Lock size={18} />
                {t('piiSection')}
              </h3>
              <div className="bg-blue-50 border border-blue-100 rounded-md p-4 text-xs text-blue-700 mb-4">
                {t('piiNotice')}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('givenName')}</Label>
                  <Input 
                    value={individualForm.givenName}
                    onChange={(e) => setIndividualForm(f => ({ ...f, givenName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('familyName')}</Label>
                  <Input 
                    value={individualForm.familyName}
                    onChange={(e) => setIndividualForm(f => ({ ...f, familyName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('phoneNumber')}</Label>
                  <Input 
                    placeholder={t('phonePlaceholder')} 
                    value={individualForm.phoneNumber}
                    onChange={(e) => setIndividualForm(f => ({ ...f, phoneNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('emailLabel')}</Label>
                  <Input 
                    placeholder={t('emailPlaceholder')} 
                    type="email"
                    value={individualForm.email}
                    onChange={(e) => setIndividualForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'company' && (
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-medium border-b pb-2">{t('companyDetails')}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('legalName')} *</Label>
                  <Input 
                    value={companyForm.companyLegalName}
                    onChange={(e) => setCompanyForm(f => ({ ...f, companyLegalName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Short Name</Label>
                  <Input 
                    value={companyForm.companyShortName}
                    onChange={(e) => setCompanyForm(f => ({ ...f, companyShortName: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('registrationNumber')}</Label>
                  <Input 
                    value={companyForm.registrationNumber}
                    onChange={(e) => setCompanyForm(f => ({ ...f, registrationNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('website')}</Label>
                  <Input 
                    placeholder={t('websitePlaceholder')} 
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm(f => ({ ...f, website: e.target.value }))}
                  />
                </div>
              </div>

              <h4 className="text-sm font-medium text-muted-foreground pt-4">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input 
                    value={companyForm.contactName}
                    onChange={(e) => setCompanyForm(f => ({ ...f, contactName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input 
                    value={companyForm.contactPhone}
                    onChange={(e) => setCompanyForm(f => ({ ...f, contactPhone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Contact Email</Label>
                  <Input 
                    type="email"
                    value={companyForm.contactEmail}
                    onChange={(e) => setCompanyForm(f => ({ ...f, contactEmail: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t flex justify-end gap-3">
            <Button variant="ghost" onClick={() => router.push('/customers')} disabled={isSubmitting}>
              {tCommon('cancel')}
            </Button>
            <Button 
              onClick={type === 'individual' ? handleIndividualSubmit : handleCompanySubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('createCustomer')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
