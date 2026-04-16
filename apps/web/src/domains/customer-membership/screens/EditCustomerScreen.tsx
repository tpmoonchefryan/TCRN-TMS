// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowLeft, Building2, Loader2, Plus, Trash2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { use, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { customerPiiPlatformApi } from '@/domains/customer-membership/api/customer-pii-platform.api';
import { getTranslatedApiErrorMessage } from '@/lib/api/error-utils';
import { systemDictionaryApi, type SystemDictionaryItemRecord } from '@/lib/api/modules/configuration';
import {
  AddressData,
  companyCustomerApi,
  customerApi,
  type CustomerCompanyDetailResponse,
  type CustomerDetailResponse,
} from '@/lib/api/modules/customer';
import { useTalentStore } from '@/platform/state/talent-store';
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
} from '@/platform/ui';

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

export function EditCustomerScreen({ params }: { params: Promise<{ id: string }> }) {
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
  const [isPiiPlatformEnabled, setIsPiiPlatformEnabled] = useState(false);
  const [replacePiiOnSave, setReplacePiiOnSave] = useState(false);
  const [customer, setCustomer] = useState<CustomerDetailResponse | null>(null);
  const [countries, setCountries] = useState<SystemDictionaryItemRecord[]>([]);

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
  const getErrorMessage = (error: unknown): string => {
    return getTranslatedApiErrorMessage(error, te, te('generic'));
  };

  // Load countries from dictionary
  const loadCountries = useCallback(async () => {
    try {
      const response = await systemDictionaryApi.get<SystemDictionaryItemRecord>('countries');
      if (response.success && response.data) {
        setCountries(response.data);
      }
    } catch (error) {
      console.error('Failed to load countries:', error);
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
          setIndividualForm({
            nickname: data.nickname || '',
            tags: (data.tags || []).join(', '),
            notes: data.notes || '',
            givenName: '',
            familyName: '',
            phoneNumber: '',
            email: '',
            addresses: [],
          });
          setReplacePiiOnSave(false);
        } else {
          const companyCustomer: CustomerCompanyDetailResponse = data;

          setCompanyForm({
            nickname: data.nickname || '',
            tags: (data.tags || []).join(', '),
            notes: data.notes || '',
            companyLegalName: companyCustomer.company.companyLegalName || '',
            companyShortName: companyCustomer.company.companyShortName || '',
            registrationNumber: companyCustomer.company.registrationNumber || '',
            website: companyCustomer.company.website || '',
            contactName: '',
            contactPhone: '',
            contactEmail: '',
          });
          setReplacePiiOnSave(false);
        }
      } else {
        throw new Error(response.error?.message || t('loadFailed'));
      }
    } catch (err: unknown) {
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

  useEffect(() => {
    if (!currentTalent) {
      setIsPiiPlatformEnabled(false);
      return;
    }

    let cancelled = false;

    const loadPiiCapability = async () => {
      try {
        if (!cancelled) {
          setIsPiiPlatformEnabled(await customerPiiPlatformApi.isEnabled(currentTalent.id));
        }
      } catch {
        if (!cancelled) {
          setIsPiiPlatformEnabled(false);
        }
      }
    };

    void loadPiiCapability();

    return () => {
      cancelled = true;
    };
  }, [currentTalent]);

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
          tags: individualForm.tags
            ? individualForm.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          notes: individualForm.notes || undefined,
          expectedVersion: customer.version,
        },
        talentId
      );

      if (response.success && response.data) {
        // Build addresses for PII update - filter out empty addresses
        const validAddresses: AddressData[] = individualForm.addresses
          .filter((addr) => addr.countryCode && addr.typeCode)
          .map((addr) => ({
            typeCode: addr.typeCode,
            countryCode: addr.countryCode,
            province: addr.province || undefined,
            city: addr.city || undefined,
            district: addr.district || undefined,
            street: addr.street || undefined,
            postalCode: addr.postalCode || undefined,
            isPrimary: addr.isPrimary,
          }));

        const trimmedGivenName = individualForm.givenName.trim();
        const trimmedFamilyName = individualForm.familyName.trim();
        const trimmedPhoneNumber = individualForm.phoneNumber.trim();
        const trimmedEmail = individualForm.email.trim();
        const shouldUpdatePii = isPiiPlatformEnabled && replacePiiOnSave;

        if (shouldUpdatePii) {
          await customerApi.updatePii(
            customerId,
            {
              givenName: trimmedGivenName,
              familyName: trimmedFamilyName,
              phoneNumbers: trimmedPhoneNumber
                ? [{ typeCode: 'mobile', number: trimmedPhoneNumber, isPrimary: true }]
                : [],
              emails: trimmedEmail
                ? [{ typeCode: 'personal', address: trimmedEmail, isPrimary: true }]
                : [],
              addresses: validAddresses,
            },
            response.data.version,
            talentId
          );
        }

        toast.success(t('updateSuccess'));
        router.push(`/customers/${customerId}`);
      } else {
        throw response.error || new Error(t('updateFailed'));
      }
    } catch (error: unknown) {
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
      const shouldUpdatePii = isPiiPlatformEnabled && replacePiiOnSave;
      const response = await companyCustomerApi.update(
        customerId,
        {
          nickname: companyForm.nickname.trim(),
          tags: companyForm.tags
            ? companyForm.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          notes: companyForm.notes || undefined,
          companyLegalName: companyForm.companyLegalName.trim(),
          companyShortName: companyForm.companyShortName || undefined,
          registrationNumber: companyForm.registrationNumber || undefined,
          website: companyForm.website || undefined,
          pii: shouldUpdatePii
            ? {
                contactName: companyForm.contactName.trim(),
                contactPhone: companyForm.contactPhone.trim(),
                contactEmail: companyForm.contactEmail.trim(),
              }
            : undefined,
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show message if no talent selected
  if (!currentTalent) {
    return (
      <div className="text-muted-foreground flex h-64 flex-col items-center justify-center">
        <User className="mb-4 h-12 w-12 opacity-50" />
        <p>{tNew('selectTalentFirst')}</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card className="space-y-6 p-6">
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
      <div className="text-muted-foreground flex h-64 flex-col items-center justify-center">
        <User className="mb-4 h-12 w-12 opacity-50" />
        <p>{t('notFound')}</p>
        <Button variant="link" onClick={() => router.push('/customers')}>
          {tCommon('back')}
        </Button>
      </div>
    );
  }

  const isIndividual = customer.profileType === 'individual';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/customers/${customerId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${isIndividual ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}
          >
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
        <Card className="space-y-6 p-6">
          <div className="space-y-4">
            <h3 className="border-b pb-2 text-lg font-medium">{tNew('basicInfo')}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tNew('nicknameLabel')} *</Label>
                <Input
                  placeholder={tNew('nicknamePlaceholder')}
                  autoFocus
                  value={isIndividual ? individualForm.nickname : companyForm.nickname}
                  onChange={(e) =>
                    isIndividual
                      ? setIndividualForm((f) => ({ ...f, nickname: e.target.value }))
                      : setCompanyForm((f) => ({ ...f, nickname: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{tNew('tagsLabel')}</Label>
                <Input
                  placeholder={tNew('tagsPlaceholder')}
                  value={isIndividual ? individualForm.tags : companyForm.tags}
                  onChange={(e) =>
                    isIndividual
                      ? setIndividualForm((f) => ({ ...f, tags: e.target.value }))
                      : setCompanyForm((f) => ({ ...f, tags: e.target.value }))
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
                onChange={(e) =>
                  isIndividual
                    ? setIndividualForm((f) => ({ ...f, notes: e.target.value }))
                    : setCompanyForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Individual-specific fields */}
          {isIndividual && isPiiPlatformEnabled && (
            <div className="space-y-4">
              <div className="space-y-3 border-b pb-3">
                <h3 className="text-lg font-medium">{tNew('piiSection')}</h3>
                <p className="text-muted-foreground text-sm">{t('piiPlatformNotice')}</p>
                <div className="flex items-start space-x-2 rounded-md border p-3">
                  <Checkbox
                    id="replace-pii-on-save"
                    checked={replacePiiOnSave}
                    onCheckedChange={(checked) => setReplacePiiOnSave(Boolean(checked))}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="replace-pii-on-save">{t('piiPlatformOverwrite')}</Label>
                    <p className="text-muted-foreground text-xs">{t('piiPlatformOverwriteHint')}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tNew('familyNameLabel')}</Label>
                  <Input
                    placeholder={tNew('familyNamePlaceholder')}
                    value={individualForm.familyName}
                    onChange={(e) =>
                      setIndividualForm((f) => ({ ...f, familyName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tNew('givenNameLabel')}</Label>
                  <Input
                    placeholder={tNew('givenNamePlaceholder')}
                    value={individualForm.givenName}
                    onChange={(e) =>
                      setIndividualForm((f) => ({ ...f, givenName: e.target.value }))
                    }
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
                    onChange={(e) =>
                      setIndividualForm((f) => ({ ...f, phoneNumber: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tNew('emailLabel')}</Label>
                  <Input
                    type="email"
                    placeholder={tNew('emailPlaceholder')}
                    value={individualForm.email}
                    onChange={(e) => setIndividualForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Address Section - Only for Individual customers */}
          {isIndividual && isPiiPlatformEnabled && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-medium">{t('addressInfo')}</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIndividualForm((f) => ({
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
                  <Plus className="mr-1 h-4 w-4" />
                  {t('addAddress')}
                </Button>
              </div>

              {individualForm.addresses.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">{t('addAddress')}</p>
              ) : (
                <div className="space-y-6">
                  {individualForm.addresses.map((address, index) => (
                    <div key={index} className="relative space-y-4 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm font-medium">
                          #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setIndividualForm((f) => ({
                              ...f,
                              addresses: f.addresses.filter((_, i) => i !== index),
                            }));
                          }}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          {t('removeAddress')}
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('addressType')}</Label>
                          <Select
                            value={address.typeCode}
                            onValueChange={(value) => {
                              setIndividualForm((f) => ({
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
                              setIndividualForm((f) => ({
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
                              setIndividualForm((f) => ({
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
                              setIndividualForm((f) => ({
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
                              setIndividualForm((f) => ({
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
                              setIndividualForm((f) => ({
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
                              setIndividualForm((f) => ({
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
                            setIndividualForm((f) => ({
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
              <h3 className="border-b pb-2 text-lg font-medium">{tNew('companyInfo')}</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tNew('companyLegalNameLabel')} *</Label>
                  <Input
                    placeholder={tNew('companyLegalNamePlaceholder')}
                    value={companyForm.companyLegalName}
                    onChange={(e) =>
                      setCompanyForm((f) => ({ ...f, companyLegalName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tNew('companyShortNameLabel')}</Label>
                  <Input
                    placeholder={tNew('companyShortNamePlaceholder')}
                    value={companyForm.companyShortName}
                    onChange={(e) =>
                      setCompanyForm((f) => ({ ...f, companyShortName: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tNew('registrationNumberLabel')}</Label>
                  <Input
                    placeholder={tNew('registrationNumberPlaceholder')}
                    value={companyForm.registrationNumber}
                    onChange={(e) =>
                      setCompanyForm((f) => ({ ...f, registrationNumber: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tNew('websiteLabel')}</Label>
                  <Input
                    type="url"
                    placeholder={tNew('websitePlaceholder')}
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm((f) => ({ ...f, website: e.target.value }))}
                  />
                </div>
              </div>

              {isPiiPlatformEnabled ? (
                <div className="space-y-4">
                  <div className="space-y-3 border-b pb-3 pt-2">
                    <h3 className="text-lg font-medium">{tNew('piiSection')}</h3>
                    <p className="text-muted-foreground text-sm">{t('piiPlatformNotice')}</p>
                    <div className="flex items-start space-x-2 rounded-md border p-3">
                      <Checkbox
                        id="replace-company-pii-on-save"
                        checked={replacePiiOnSave}
                        onCheckedChange={(checked) => setReplacePiiOnSave(Boolean(checked))}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="replace-company-pii-on-save">{t('piiPlatformOverwrite')}</Label>
                        <p className="text-muted-foreground text-xs">{t('piiPlatformOverwriteHint')}</p>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-muted-foreground text-sm font-medium">{tNew('contactInfo')}</h3>

                  <div className="space-y-2">
                    <Label>{tNew('contactNameLabel')}</Label>
                    <Input
                      placeholder={tNew('contactNamePlaceholder')}
                      value={companyForm.contactName}
                      onChange={(e) => setCompanyForm((f) => ({ ...f, contactName: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{tNew('contactPhoneLabel')}</Label>
                      <Input
                        type="tel"
                        placeholder={tNew('contactPhonePlaceholder')}
                        value={companyForm.contactPhone}
                        onChange={(e) =>
                          setCompanyForm((f) => ({ ...f, contactPhone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tNew('contactEmailLabel')}</Label>
                      <Input
                        type="email"
                        placeholder={tNew('contactEmailPlaceholder')}
                        value={companyForm.contactEmail}
                        onChange={(e) =>
                          setCompanyForm((f) => ({ ...f, contactEmail: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.push(`/customers/${customerId}`)}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={isIndividual ? handleIndividualSubmit : handleCompanySubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
