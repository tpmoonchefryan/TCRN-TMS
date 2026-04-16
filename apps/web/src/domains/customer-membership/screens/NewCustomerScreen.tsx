// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowLeft, Building2, Lock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { toast } from 'sonner';

import { customerCreateDomainApi } from '@/domains/customer-membership/api/customer-create.api';
import { customerPiiPlatformApi } from '@/domains/customer-membership/api/customer-pii-platform.api';
import {
  companyCustomerCreateDefaults,
  companyCustomerCreateFormSchema,
  individualCustomerCreateDefaults,
  individualCustomerCreateFormSchema,
  mapCompanyCustomerCreatePayload,
  mapIndividualCustomerCreatePayload,
} from '@/domains/customer-membership/forms/customer-create-form';
import { useZodForm } from '@/lib/form';
import { getTranslatedApiErrorMessage } from '@/platform/http/error-message';
import { useTalentStore } from '@/platform/state/talent-store';
import {
  AsyncSubmitButton,
  Button,
  Card,
  FormSection,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/platform/ui';

type CustomerCreateType = 'individual' | 'company';

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-destructive text-xs">{message}</p>;
}

export function NewCustomerScreen() {
  const router = useRouter();
  const t = useTranslations('newCustomer');
  const tCommon = useTranslations('common');
  const te = useTranslations('errors');
  const { currentTalent } = useTalentStore();

  const [type, setType] = useState<CustomerCreateType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPiiPlatformEnabled, setIsPiiPlatformEnabled] = useState(false);

  const individualForm = useZodForm(individualCustomerCreateFormSchema, {
    defaultValues: individualCustomerCreateDefaults,
  });
  const companyForm = useZodForm(companyCustomerCreateFormSchema, {
    defaultValues: companyCustomerCreateDefaults,
  });

  const getErrorMessage = (error: unknown): string => {
    return getTranslatedApiErrorMessage(error, te, te('generic'));
  };

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

  const handleIndividualSubmit = individualForm.handleSubmit(async (values) => {
    if (!currentTalent) {
      toast.error(t('selectTalentFirst'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await customerCreateDomainApi.createIndividual(
        mapIndividualCustomerCreatePayload(values, currentTalent.id, {
          piiEnabled: isPiiPlatformEnabled,
        }),
      );

      if (!response.success || !response.data) {
        throw response.error || new Error(t('createCustomerFailed'));
      }

      toast.success(t('createSuccess'));
      router.push(`/customers/${response.data.id}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleCompanySubmit = companyForm.handleSubmit(async (values) => {
    if (!currentTalent) {
      toast.error(t('selectTalentFirst'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await customerCreateDomainApi.createCompany(
        mapCompanyCustomerCreatePayload(values, currentTalent.id, {
          piiEnabled: isPiiPlatformEnabled,
        }),
      );

      if (!response.success || !response.data) {
        throw response.error || new Error(t('createCompanyFailed'));
      }

      toast.success(t('createSuccess'));
      router.push(`/customers/${response.data.id}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  });

  if (!currentTalent) {
    return (
      <div className="text-muted-foreground flex h-64 flex-col items-center justify-center">
        <User className="mb-4 h-12 w-12 opacity-50" />
        <p>{t('selectTalentToCreate')}</p>
      </div>
    );
  }

  if (!type) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('selectType')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card
            className="group hover:border-primary cursor-pointer p-8 transition-all hover:shadow-md"
            onClick={() => setType('individual')}
          >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
              <User size={32} />
            </div>
            <h3 className="mb-2 text-xl font-semibold">{t('individualTitle')}</h3>
            <p className="mb-6 leading-relaxed text-slate-500">{t('individualDesc')}</p>
            <Button className="w-full" variant="secondary">
              {t('select')}
            </Button>
          </Card>

          <Card
            className="group hover:border-primary cursor-pointer p-8 transition-all hover:shadow-md"
            onClick={() => setType('company')}
          >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-110">
              <Building2 size={32} />
            </div>
            <h3 className="mb-2 text-xl font-semibold">{t('companyTitle')}</h3>
            <p className="mb-6 leading-relaxed text-slate-500">{t('companyDesc')}</p>
            <Button className="w-full" variant="secondary">
              {t('select')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
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

      {type === 'individual' ? (
        <form onSubmit={handleIndividualSubmit}>
          <Card className="space-y-6 p-6">
            <FormSection title={t('basicInfo')}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="individual-nickname">{t('nicknameLabel')} *</Label>
                  <Input
                    id="individual-nickname"
                    autoFocus
                    placeholder={t('nicknamePlaceholder')}
                    {...individualForm.register('nickname')}
                  />
                  <FieldError message={individualForm.formState.errors.nickname?.message} />
                </div>

                <div className="space-y-2">
                  <Label>{t('statusLabel')}</Label>
                  <Controller
                    control={individualForm.control}
                    name="statusCode"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">{t('statusNew')}</SelectItem>
                          <SelectItem value="ACTIVE">{t('statusActive')}</SelectItem>
                          <SelectItem value="VIP">{t('statusVip')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="individual-tags">{t('tagsLabel')}</Label>
                <Input
                  id="individual-tags"
                  placeholder={t('tagsPlaceholder')}
                  {...individualForm.register('tags')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="individual-notes">{t('notesLabel')}</Label>
                <Textarea
                  id="individual-notes"
                  placeholder={t('notesPlaceholder')}
                  rows={3}
                  {...individualForm.register('notes')}
                />
              </div>
            </FormSection>

            {isPiiPlatformEnabled ? (
              <FormSection
                title={t('piiSection')}
                icon={<Lock size={18} />}
                className="pt-4"
                titleClassName="text-blue-600"
                description={
                  <div className="rounded-md border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
                    {t('piiNotice')}
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="individual-given-name">{t('givenName')}</Label>
                    <Input id="individual-given-name" {...individualForm.register('givenName')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual-family-name">{t('familyName')}</Label>
                    <Input id="individual-family-name" {...individualForm.register('familyName')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual-phone">{t('phoneNumber')}</Label>
                    <Input
                      id="individual-phone"
                      placeholder={t('phonePlaceholder')}
                      {...individualForm.register('phoneNumber')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="individual-email">{t('emailLabel')}</Label>
                    <Input
                      id="individual-email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      {...individualForm.register('email')}
                    />
                    <FieldError message={individualForm.formState.errors.email?.message} />
                  </div>
                </div>
              </FormSection>
            ) : null}

            <div className="flex justify-end gap-3 border-t pt-6">
              <Button
                variant="ghost"
                type="button"
                onClick={() => router.push('/customers')}
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <AsyncSubmitButton type="submit" isLoading={isSubmitting}>
                {t('createCustomer')}
              </AsyncSubmitButton>
            </div>
          </Card>
        </form>
      ) : (
        <form onSubmit={handleCompanySubmit}>
          <Card className="space-y-6 p-6">
            <FormSection title={t('basicInfo')}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-nickname">{t('nicknameLabel')} *</Label>
                  <Input
                    id="company-nickname"
                    autoFocus
                    placeholder={t('nicknamePlaceholder')}
                    {...companyForm.register('nickname')}
                  />
                  <FieldError message={companyForm.formState.errors.nickname?.message} />
                </div>

                <div className="space-y-2">
                  <Label>{t('statusLabel')}</Label>
                  <Controller
                    control={companyForm.control}
                    name="statusCode"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">{t('statusNew')}</SelectItem>
                          <SelectItem value="ACTIVE">{t('statusActive')}</SelectItem>
                          <SelectItem value="VIP">{t('statusVip')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-tags">{t('tagsLabel')}</Label>
                <Input
                  id="company-tags"
                  placeholder={t('tagsPlaceholder')}
                  {...companyForm.register('tags')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-notes">{t('notesLabel')}</Label>
                <Textarea
                  id="company-notes"
                  placeholder={t('notesPlaceholder')}
                  rows={3}
                  {...companyForm.register('notes')}
                />
              </div>
            </FormSection>

            <FormSection title={t('companyDetails')} className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-legal-name">{t('legalName')} *</Label>
                  <Input
                    id="company-legal-name"
                    {...companyForm.register('companyLegalName')}
                  />
                  <FieldError message={companyForm.formState.errors.companyLegalName?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-short-name">{t('companyShortNameLabel')}</Label>
                  <Input
                    id="company-short-name"
                    placeholder={t('companyShortNamePlaceholder')}
                    {...companyForm.register('companyShortName')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-registration">{t('registrationNumber')}</Label>
                  <Input
                    id="company-registration"
                    {...companyForm.register('registrationNumber')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-website">{t('website')}</Label>
                  <Input
                    id="company-website"
                    placeholder={t('websitePlaceholder')}
                    {...companyForm.register('website')}
                  />
                  <FieldError message={companyForm.formState.errors.website?.message} />
                </div>
              </div>

              {isPiiPlatformEnabled ? (
                <FormSection
                  title={t('piiSection')}
                  icon={<Lock size={18} />}
                  className="pt-4"
                  titleClassName="text-blue-600"
                  description={
                    <div className="rounded-md border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
                      {t('piiNotice')}
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-contact-name">{t('contactNameLabel')}</Label>
                      <Input id="company-contact-name" {...companyForm.register('contactName')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-contact-phone">{t('contactPhoneLabel')}</Label>
                      <Input id="company-contact-phone" {...companyForm.register('contactPhone')} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="company-contact-email">{t('contactEmailLabel')}</Label>
                      <Input
                        id="company-contact-email"
                        type="email"
                        {...companyForm.register('contactEmail')}
                      />
                      <FieldError message={companyForm.formState.errors.contactEmail?.message} />
                    </div>
                  </div>
                </FormSection>
              ) : null}
            </FormSection>

            <div className="flex justify-end gap-3 border-t pt-6">
              <Button
                variant="ghost"
                type="button"
                onClick={() => router.push('/customers')}
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <AsyncSubmitButton type="submit" isLoading={isSubmitting}>
                {t('createCustomer')}
              </AsyncSubmitButton>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}
