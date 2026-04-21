import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomerCreateScreen } from '@/domains/customer-management/screens/CustomerCreateScreen';

const replace = vi.fn();
const mockRequest = vi.fn();
const createIndividualCustomer = vi.fn();
const createCompanyCustomer = vi.fn();
const createCustomerMembership = vi.fn();
const listCustomerMembershipTree = vi.fn();
const listCustomerSocialPlatforms = vi.fn();
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
  selectedLocale: undefined as undefined | 'en' | 'zh_HANS' | 'zh_HANT' | 'ja' | 'ko' | 'fr',
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace,
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
  }),
}));

vi.mock('@/domains/customer-management/api/customer.api', () => ({
  createIndividualCustomer: (...args: unknown[]) => createIndividualCustomer(...args),
  createCompanyCustomer: (...args: unknown[]) => createCompanyCustomer(...args),
  createCustomerMembership: (...args: unknown[]) => createCustomerMembership(...args),
  listCustomerMembershipTree: (...args: unknown[]) => listCustomerMembershipTree(...args),
  listCustomerSocialPlatforms: (...args: unknown[]) => listCustomerSocialPlatforms(...args),
}));

describe('CustomerCreateScreen', () => {
  beforeEach(() => {
    localeState.currentLocale = 'en';
    localeState.selectedLocale = undefined;
    replace.mockReset();
    mockRequest.mockReset();
    createIndividualCustomer.mockReset();
    createCompanyCustomer.mockReset();
    createCustomerMembership.mockReset();
    listCustomerMembershipTree.mockReset();
    listCustomerSocialPlatforms.mockReset();

    createCompanyCustomer.mockResolvedValue({
      id: 'company-customer-1',
      nickname: 'Acme',
      profileType: 'company',
      createdAt: '2026-04-19T10:00:00.000Z',
    });
    createIndividualCustomer.mockResolvedValue({
      id: 'customer-1',
      nickname: 'Aki',
      profileType: 'individual',
      createdAt: '2026-04-19T10:00:00.000Z',
    });
    createCustomerMembership.mockResolvedValue({
      id: 'membership-1',
    });
    listCustomerSocialPlatforms.mockResolvedValue([
      {
        id: 'platform-1',
        code: 'YOUTUBE',
        name: 'YouTube',
        nameEn: 'YouTube',
        nameZh: 'YouTube',
        nameJa: 'YouTube',
        isActive: true,
      },
    ]);
    listCustomerMembershipTree.mockResolvedValue([
      {
        id: 'class-1',
        code: 'FANCLUB',
        name: 'Fanclub',
        nameEn: 'Fanclub',
        nameZh: '粉丝俱乐部',
        nameJa: 'ファンクラブ',
        isActive: true,
        types: [
          {
            id: 'type-1',
            code: 'PAID',
            name: 'Paid',
            nameEn: 'Paid',
            nameZh: '付费',
            nameJa: '有料',
            classId: 'class-1',
            externalControl: false,
            defaultRenewalDays: 30,
            isActive: true,
            levels: [
              {
                id: 'level-1',
                code: 'GOLD',
                name: 'Gold',
                nameEn: 'Gold',
                nameZh: '黄金',
                nameJa: 'ゴールド',
                typeId: 'type-1',
                rank: 1,
                color: '#f59e0b',
                badgeUrl: null,
                isActive: true,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('creates the customer and optional first membership in one pass', async () => {
    render(<CustomerCreateScreen tenantId="tenant-1" talentId="talent-1" />);

    fireEvent.change(screen.getByLabelText('Customer name'), {
      target: { value: 'Aki' },
    });

    fireEvent.click(screen.getByLabelText('Add membership now'));

    await waitFor(() => {
      expect(listCustomerSocialPlatforms).toHaveBeenCalledWith(mockRequest);
      expect(listCustomerMembershipTree).toHaveBeenCalledWith(mockRequest, 'talent-1');
    });

    fireEvent.change(screen.getByLabelText('Platform'), {
      target: { value: 'YOUTUBE' },
    });
    fireEvent.change(screen.getByLabelText('Membership class'), {
      target: { value: 'FANCLUB' },
    });
    fireEvent.change(screen.getByLabelText('Membership type'), {
      target: { value: 'PAID' },
    });
    fireEvent.change(screen.getByLabelText('Membership level'), {
      target: { value: 'GOLD' },
    });
    fireEvent.change(screen.getByLabelText('Valid from'), {
      target: { value: '2026-04-19' },
    });
    fireEvent.click(screen.getByLabelText('Enable auto-renew'));
    fireEvent.change(screen.getByLabelText('Membership note'), {
      target: { value: 'Launch supporter tier' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create customer' }));

    await waitFor(() => {
      expect(createIndividualCustomer).toHaveBeenCalledWith(mockRequest, 'talent-1', {
        nickname: 'Aki',
        primaryLanguage: 'zh_HANS',
        notes: undefined,
      });
    });

    expect(createCustomerMembership).toHaveBeenCalledWith(mockRequest, 'talent-1', 'customer-1', {
      platformCode: 'YOUTUBE',
      membershipLevelCode: 'GOLD',
      validFrom: '2026-04-19',
      validTo: undefined,
      autoRenew: true,
      note: 'Launch supporter tier',
    });

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/tenant/tenant-1/talent/talent-1/customers?created=Aki');
    });
  });

  it('falls back to zh_HANS copy when the runtime locale family is zh and no selected locale is pinned', async () => {
    localeState.currentLocale = 'zh';

    render(<CustomerCreateScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: '添加客户' })).toBeInTheDocument();
    expect(screen.getByText('会员信息')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建客户' })).toBeInTheDocument();
  });

  it('renders exact zh_HANT copy when a traditional-Chinese locale is selected', async () => {
    localeState.currentLocale = 'zh';
    localeState.selectedLocale = 'zh_HANT';

    render(<CustomerCreateScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: '新增客戶' })).toBeInTheDocument();
    expect(screen.getByText('會員資訊')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '建立客戶' })).toBeInTheDocument();
  });

  it('renders exact ko copy when Korean is selected', async () => {
    localeState.currentLocale = 'en';
    localeState.selectedLocale = 'ko';

    render(<CustomerCreateScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: '고객 추가' })).toBeInTheDocument();
    expect(screen.getByText('멤버십 정보')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '고객 생성' })).toBeInTheDocument();
  });
});
