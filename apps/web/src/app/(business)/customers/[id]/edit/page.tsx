// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowLeft, Building2, Loader2, Plus, Trash2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
    Button,
    Card,
    Checkbox,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Skeleton,
    Textarea,
} from '@/components/ui';
import { AddressData, companyCustomerApi, customerApi, dictionaryApi } from '@/lib/api/client';
import { useTalentStore } from '@/stores/talent-store';

// Address type options (static, as per shared/types/customer/schema.ts)
const ADDRESS_TYPES = ['HOME', 'WORK', 'BILLING', 'SHIPPING', 'OTHER'] as const;

interface AddressFormData {
  typeCode: string;
  countryCode: string;
  province: string;
  city: string;
  district: string;
  street: string;
  postalCode: string;
  isPrimary: boolean;
}

interface CustomerData {
  id: string;
  profileType: 'individual' | 'company';
  nickname: string;
  tags: string[];
  notes?: string;
  version: number;
  // Individual PII
  pii?: {
    realName?: string;
    phone?: string;
    email?: string;
    addresses?: AddressFormData[];
  };
  // Company info
  companyInfo?: {
    companyLegalName?: string;
    companyShortName?: string;
    registrationNumber?: string;
    website?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
  };
}

interface IndividualFormData {
  nickname: string;
  tags: string;
  notes: string;
  givenName: string;
  familyName: string;
  phoneNumber: string;
  email: string;
  addresses: AddressFormData[];
}

interface CompanyFormData {
  nickname: string;
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

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params Promise (Next.js 15+ requirement)
  const { id: customerId } = use(params);
  
  const router = useRouter();
  const t = useTranslations('editCustomer');
  const tNew = useTranslations('newCustomer');
  const tCommon = useTranslations('common');
  const te = useTranslations('errors');
  const { currentTalent } = useTalentStore();
  const talentId = currentTalent?.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [countries, setCountries] = useState<Array<{ code: string; nameEn: string; nameZh?: string; nameJa?: string }>>([]);
  
  // Form states
  const [individualForm, setIndividualForm] = useState<IndividualFormData>({
    nickname: '',
    tags: '',
    notes: '',
    givenName: '',
    familyName: '',
    phoneNumber: '',
    email: '',
    addresses: [],
  });
  
  const [companyForm, setCompanyForm] = useState<CompanyFormData>({
    nickname: '',
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

  // Load countries from dictionary
  const loadCountries = useCallback(async () => {
    try {
      const response = await dictionaryApi.getByType('countries');
      if (response.success && response.data) {
        const data = response.data as any;
        setCountries(data.items || data || []);
      }
    } catch (err) {
      console.error('Failed to load countries:', err);
    }
  }, []);

  // Fetch customer data
  const fetchCustomer = useCallback(async () => {
    if (!customerId || customerId === 'undefined' || !talentId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await customerApi.get(customerId, talentId);
      if (response.success && response.data) {
        const data = response.data;
        setCustomer(data);
        
        if (data.profileType === 'individual') {
          // Parse real name into given name and family name
          const nameParts = (data.pii?.realName || '').split(' ');
          const familyName = nameParts.length > 1 ? nameParts[0] : '';
          const givenName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '';
          
          // Map addresses from API format to form format
          const addresses: AddressFormData[] = (data.pii?.addresses || []).map((addr: any) => ({
            typeCode: addr.typeCode || addr.type_code || 'HOME',
            countryCode: addr.countryCode || addr.country_code || '',
            province: addr.province || '',
            city: addr.city || '',
            district: addr.district || '',
            street: addr.street || '',
            postalCode: addr.postalCode || addr.postal_code || '',
            isPrimary: addr.isPrimary || addr.is_primary || false,
          }));
          
          setIndividualForm({
            nickname: data.nickname || '',
            tags: (data.tags || []).join(', '),
            notes: data.notes || '',
            givenName,
            familyName,
            phoneNumber: data.pii?.phone || '',
            email: data.pii?.email || '',
            addresses,
          });
        } else {
          setCompanyForm({
            nickname: data.nickname || '',
            tags: (data.tags || []).join(', '),
            notes: data.notes || '',
            companyLegalName: data.companyInfo?.companyLegalName || '',
            companyShortName: data.companyInfo?.companyShortName || '',
            registrationNumber: data.companyInfo?.registrationNumber || '',
            website: data.companyInfo?.website || '',
            contactName: data.companyInfo?.contactName || '',
            contactPhone: data.companyInfo?.contactPhone || '',
            contactEmail: data.companyInfo?.contactEmail || '',
          });
        }
      } else {
        throw new Error(response.error?.message || t('loadFailed'));
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err));
      router.push('/customers');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, talentId, t, te, router]);

  useEffect(() => {
    fetchCustomer();
    loadCountries();
  }, [fetchCustomer, loadCountries]);

  const handleIndividualSubmit = async () => {
    if (!customer || !talentId) return;
    
    if (!individualForm.nickname.trim()) {
      toast.error(te('VALIDATION_FIELD_REQUIRED'));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await customerApi.update(
        customerId,
        {
          nickname: individualForm.nickname.trim(),
          tags: individualForm.tags ? individualForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          notes: individualForm.notes || undefined,
          expectedVersion: customer.version,
        },
        talentId
      );
      
      if (response.success) {
        // Build addresses for PII update - filter out empty addresses
        const validAddresses: AddressData[] = individualForm.addresses
          .filter(addr => addr.countryCode && addr.typeCode)
          .map(addr => ({
            typeCode: addr.typeCode,
            countryCode: addr.countryCode,
            province: addr.province || undefined,
            city: addr.city || undefined,
            district: addr.district || undefined,
            street: addr.street || undefined,
            postalCode: addr.postalCode || undefined,
            isPrimary: addr.isPrimary,
          }));
        
        // Update PII including addresses
        await customerApi.updatePii(
          customerId,
          {
            givenName: individualForm.givenName || undefined,
            familyName: individualForm.familyName || undefined,
            addresses: validAddresses.length > 0 ? validAddresses : undefined,
          },
          customer.version,
          talentId
        );
        
        toast.success(t('updateSuccess'));
        router.push(`/customers/${customerId}`);
      } else {
        throw response.error || new Error(t('updateFailed'));
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompanySubmit = async () => {
    if (!customer || !talentId) return;
    
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
      const response = await companyCustomerApi.update(
        customerId,
        {
          nickname: companyForm.nickname.trim(),
          tags: companyForm.tags ? companyForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          notes: companyForm.notes || undefined,
          companyLegalName: companyForm.companyLegalName.trim(),
          companyShortName: companyForm.companyShortName || undefined,
          registrationNumber: companyForm.registrationNumber || undefined,
          website: companyForm.website || undefined,
          contactName: companyForm.contactName || undefined,
          contactPhone: companyForm.contactPhone || undefined,
          contactEmail: companyForm.contactEmail || undefined,
          version: customer.version,
        },
        talentId
      );
      
      if (response.success) {
        toast.success(t('updateSuccess'));
        router.push(`/customers/${customerId}`);
      } else {
        throw response.error || new Error(t('updateFailed'));
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
        <p>{tNew('selectTalentFirst')}</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card className="p-6 space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    );
  }

  // Customer not found
  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <User className="h-12 w-12 mb-4 opacity-50" />
        <p>{t('notFound')}</p>
        <Button variant="link" onClick={() => router.push('/customers')}>
          {tCommon('back')}
        </Button>
      </div>
    );
  }

  const isIndividual = customer.profileType === 'individual';

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/customers/${customerId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isIndividual ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
            {isIndividual ? <User size={20} /> : <Building2 size={20} />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground text-sm">
              {isIndividual ? t('editIndividual') : t('editCompany')} - {customer.nickname}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">{tNew('basicInfo')}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tNew('nicknameLabel')} *</Label>
                <Input 
                  placeholder={tNew('nicknamePlaceholder')} 
                  autoFocus 
                  value={isIndividual ? individualForm.nickname : companyForm.nickname}
                  onChange={(e) => isIndividual 
                    ? setIndividualForm(f => ({ ...f, nickname: e.target.value }))
                    : setCompanyForm(f => ({ ...f, nickname: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{tNew('tagsLabel')}</Label>
                <Input 
                  placeholder={tNew('tagsPlaceholder')} 
                  value={isIndividual ? individualForm.tags : companyForm.tags}
                  onChange={(e) => isIndividual
                    ? setIndividualForm(f => ({ ...f, tags: e.target.value }))
                    : setCompanyForm(f => ({ ...f, tags: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{tNew('notesLabel')}</Label>
              <Textarea 
                placeholder={tNew('notesPlaceholder')} 
                rows={3}
                value={isIndividual ? individualForm.notes : companyForm.notes}
                onChange={(e) => isIndividual
                  ? setIndividualForm(f => ({ ...f, notes: e.target.value }))
                  : setCompanyForm(f => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Individual-specific fields */}
          {isIndividual && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">{tNew('personalInfo')}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tNew('familyNameLabel')}</Label>
                  <Input 
                    placeholder={tNew('familyNamePlaceholder')}
                    value={individualForm.familyName}
                    onChange={(e) => setIndividualForm(f => ({ ...f, familyName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tNew('givenNameLabel')}</Label>
                  <Input 
                    placeholder={tNew('givenNamePlaceholder')}
                    value={individualForm.givenName}
                    onChange={(e) => setIndividualForm(f => ({ ...f, givenName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tNew('phoneLabel')}</Label>
                  <Input 
                    type="tel"
                    placeholder={tNew('phonePlaceholder')}
                    value={individualForm.phoneNumber}
                    onChange={(e) => setIndividualForm(f => ({ ...f, phoneNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tNew('emailLabel')}</Label>
                  <Input 
                    type="email"
                    placeholder={tNew('emailPlaceholder')}
                    value={individualForm.email}
                    onChange={(e) => setIndividualForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Address Section - Only for Individual customers */}
          {isIndividual && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-medium">{t('addressInfo')}</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIndividualForm(f => ({
                      ...f,
                      addresses: [
                        ...f.addresses,
                        {
                          typeCode: 'HOME',
                          countryCode: '',
                          province: '',
                          city: '',
                          district: '',
                          street: '',
                          postalCode: '',
                          isPrimary: f.addresses.length === 0, // First address is primary
                        },
                      ],
                    }));
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('addAddress')}
                </Button>
              </div>

              {individualForm.addresses.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  {t('addAddress')}
                </p>
              ) : (
                <div className="space-y-6">
                  {individualForm.addresses.map((address, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setIndividualForm(f => ({
                              ...f,
                              addresses: f.addresses.filter((_, i) => i !== index),
                            }));
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t('removeAddress')}
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('addressType')}</Label>
                          <Select
                            value={address.typeCode}
                            onValueChange={(value) => {
                              setIndividualForm(f => ({
                                ...f,
                                addresses: f.addresses.map((a, i) =>
                                  i === index ? { ...a, typeCode: value } : a
                                ),
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectAddressType')} />
                            </SelectTrigger>
                            <SelectContent>
                              {ADDRESS_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('country')}</Label>
                          <Select
                            value={address.countryCode}
                            onValueChange={(value) => {
                              setIndividualForm(f => ({
                                ...f,
                                addresses: f.addresses.map((a, i) =>
                                  i === index ? { ...a, countryCode: value } : a
                                ),
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectCountry')} />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.nameEn}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>{t('province')}</Label>
                          <Input
                            placeholder={t('provincePlaceholder')}
                            value={address.province}
                            onChange={(e) => {
                              setIndividualForm(f => ({
                                ...f,
                                addresses: f.addresses.map((a, i) =>
                                  i === index ? { ...a, province: e.target.value } : a
                                ),
                              }));
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('city')}</Label>
                          <Input
                            placeholder={t('cityPlaceholder')}
                            value={address.city}
                            onChange={(e) => {
                              setIndividualForm(f => ({
                                ...f,
                                addresses: f.addresses.map((a, i) =>
                                  i === index ? { ...a, city: e.target.value } : a
                                ),
                              }));
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('district')}</Label>
                          <Input
                            placeholder={t('districtPlaceholder')}
                            value={address.district}
                            onChange={(e) => {
                              setIndividualForm(f => ({
                                ...f,
                                addresses: f.addresses.map((a, i) =>
                                  i === index ? { ...a, district: e.target.value } : a
                                ),
                              }));
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('street')}</Label>
                          <Input
                            placeholder={t('streetPlaceholder')}
                            value={address.street}
                            onChange={(e) => {
                              setIndividualForm(f => ({
                                ...f,
                                addresses: f.addresses.map((a, i) =>
                                  i === index ? { ...a, street: e.target.value } : a
                                ),
                              }));
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('postalCode')}</Label>
                          <Input
                            placeholder={t('postalCodePlaceholder')}
                            value={address.postalCode}
                            onChange={(e) => {
                              setIndividualForm(f => ({
                                ...f,
                                addresses: f.addresses.map((a, i) =>
                                  i === index ? { ...a, postalCode: e.target.value } : a
                                ),
                              }));
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`primary-${index}`}
                          checked={address.isPrimary}
                          onCheckedChange={(checked) => {
                            setIndividualForm(f => ({
                              ...f,
                              addresses: f.addresses.map((a, i) => ({
                                ...a,
                                isPrimary: i === index ? !!checked : false,
                              })),
                            }));
                          }}
                        />
                        <Label htmlFor={`primary-${index}`} className="text-sm font-normal">
                          {t('isPrimaryAddress')}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Company-specific fields */}
          {!isIndividual && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">{tNew('companyInfo')}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tNew('companyLegalNameLabel')} *</Label>
                  <Input 
                    placeholder={tNew('companyLegalNamePlaceholder')}
                    value={companyForm.companyLegalName}
                    onChange={(e) => setCompanyForm(f => ({ ...f, companyLegalName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tNew('companyShortNameLabel')}</Label>
                  <Input 
                    placeholder={tNew('companyShortNamePlaceholder')}
                    value={companyForm.companyShortName}
                    onChange={(e) => setCompanyForm(f => ({ ...f, companyShortName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tNew('registrationNumberLabel')}</Label>
                  <Input 
                    placeholder={tNew('registrationNumberPlaceholder')}
                    value={companyForm.registrationNumber}
                    onChange={(e) => setCompanyForm(f => ({ ...f, registrationNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tNew('websiteLabel')}</Label>
                  <Input 
                    type="url"
                    placeholder={tNew('websitePlaceholder')}
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm(f => ({ ...f, website: e.target.value }))}
                  />
                </div>
              </div>

              <h3 className="text-lg font-medium border-b pb-2 mt-6">{tNew('contactInfo')}</h3>
              
              <div className="space-y-2">
                <Label>{tNew('contactNameLabel')}</Label>
                <Input 
                  placeholder={tNew('contactNamePlaceholder')}
                  value={companyForm.contactName}
                  onChange={(e) => setCompanyForm(f => ({ ...f, contactName: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tNew('contactPhoneLabel')}</Label>
                  <Input 
                    type="tel"
                    placeholder={tNew('contactPhonePlaceholder')}
                    value={companyForm.contactPhone}
                    onChange={(e) => setCompanyForm(f => ({ ...f, contactPhone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tNew('contactEmailLabel')}</Label>
                  <Input 
                    type="email"
                    placeholder={tNew('contactEmailPlaceholder')}
                    value={companyForm.contactEmail}
                    onChange={(e) => setCompanyForm(f => ({ ...f, contactEmail: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/customers/${customerId}`)}
          >
            {tCommon('cancel')}
          </Button>
          <Button 
            onClick={isIndividual ? handleIndividualSubmit : handleCompanySubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tCommon('saving')}
              </>
            ) : (
              tCommon('save')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
