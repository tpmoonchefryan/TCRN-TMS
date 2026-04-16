// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTalentStore } from '@/stores/talent-store';

const mockPush = vi.hoisted(() => vi.fn());
const mockCreateIndividual = vi.hoisted(() => vi.fn());
const mockCreateCompany = vi.hoisted(() => vi.fn());
const mockResolveEffectiveAdapter = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('@/domains/customer-membership/api/customer-create.api', () => ({
  customerCreateDomainApi: {
    createIndividual: (...args: unknown[]) => mockCreateIndividual(...args),
    createCompany: (...args: unknown[]) => mockCreateCompany(...args),
  },
}));

vi.mock('@/lib/api/modules/integration', () => ({
  integrationApi: {
    resolveEffectiveAdapter: (...args: unknown[]) => mockResolveEffectiveAdapter(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { NewCustomerScreen } from '@/domains/customer-membership/screens/NewCustomerScreen';

const initialTalentState = useTalentStore.getState();

const mockTalent = {
  id: 'talent-123',
  code: 'TALENT_123',
  displayName: 'Test Talent',
  path: 'test-talent',
  lifecycleStatus: 'published' as const,
  publishedAt: '2026-04-11T00:00:00.000Z',
};

describe('NewCustomerScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockResolveEffectiveAdapter.mockResolvedValue({
      success: true,
      data: { id: 'adapter-1' },
    });
    act(() => {
      useTalentStore.setState(initialTalentState, true);
      useTalentStore.getState().setAccessibleTalents([mockTalent]);
      useTalentStore.getState().setCurrentTalent(mockTalent);
    });
  });

  afterEach(() => {
    localStorage.clear();
    act(() => {
      useTalentStore.setState(initialTalentState, true);
    });
  });

  it('creates an individual customer through the domain screen mapping', async () => {
    mockCreateIndividual.mockResolvedValue({
      success: true,
      data: {
        id: 'customer-individual-1',
      },
    });

    render(<NewCustomerScreen />);

    fireEvent.click(screen.getByText('individualTitle'));
    await screen.findByLabelText('givenName');
    fireEvent.change(screen.getByLabelText('nicknameLabel *'), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByLabelText('givenName'), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByLabelText('familyName'), {
      target: { value: 'Liddell' },
    });
    fireEvent.change(screen.getByLabelText('phoneNumber'), {
      target: { value: '13800138000' },
    });
    fireEvent.change(screen.getByLabelText('emailLabel'), {
      target: { value: 'alice@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'createCustomer' }));

    await waitFor(() => {
      expect(mockCreateIndividual).toHaveBeenCalledWith({
        talentId: 'talent-123',
        nickname: 'Alice',
        primaryLanguage: 'en',
        statusCode: 'NEW',
        tags: undefined,
        notes: undefined,
        pii: {
          givenName: 'Alice',
          familyName: 'Liddell',
          phoneNumbers: [{ typeCode: 'mobile', number: '13800138000', isPrimary: true }],
          emails: [{ typeCode: 'personal', address: 'alice@example.com', isPrimary: true }],
        },
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('createSuccess');
    expect(mockPush).toHaveBeenCalledWith('/customers/customer-individual-1');
  });

  it('hides the pii section and omits pii payload when no effective pii platform adapter exists', async () => {
    mockResolveEffectiveAdapter.mockResolvedValue({
      success: true,
      data: null,
    });
    mockCreateIndividual.mockResolvedValue({
      success: true,
      data: {
        id: 'customer-individual-2',
      },
    });

    render(<NewCustomerScreen />);

    fireEvent.click(screen.getByText('individualTitle'));
    await waitFor(() => {
      expect(screen.queryByLabelText('givenName')).not.toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('nicknameLabel *'), {
      target: { value: 'No Pii User' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'createCustomer' }));

    await waitFor(() => {
      expect(mockCreateIndividual).toHaveBeenCalledWith({
        talentId: 'talent-123',
        nickname: 'No Pii User',
        primaryLanguage: 'en',
        statusCode: 'NEW',
        tags: undefined,
        notes: undefined,
        pii: undefined,
      });
    });
  });

  it('creates a company customer through the domain screen mapping', async () => {
    mockCreateCompany.mockResolvedValue({
      success: true,
      data: {
        id: 'customer-company-1',
      },
    });

    render(<NewCustomerScreen />);

    fireEvent.click(screen.getByText('companyTitle'));
    fireEvent.change(screen.getByLabelText('nicknameLabel *'), {
      target: { value: 'ACME' },
    });
    fireEvent.change(screen.getByLabelText('legalName *'), {
      target: { value: 'ACME Holdings Ltd' },
    });
    fireEvent.change(screen.getByLabelText('website'), {
      target: { value: 'https://acme.example.com' },
    });
    fireEvent.change(await screen.findByLabelText('contactEmailLabel'), {
      target: { value: 'ops@acme.example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'createCustomer' }));

    await waitFor(() => {
      expect(mockCreateCompany).toHaveBeenCalledWith({
        talentId: 'talent-123',
        nickname: 'ACME',
        primaryLanguage: 'en',
        statusCode: 'NEW',
        tags: undefined,
        notes: undefined,
        companyLegalName: 'ACME Holdings Ltd',
        companyShortName: undefined,
        registrationNumber: undefined,
        website: 'https://acme.example.com',
        pii: {
          contactName: undefined,
          contactPhone: undefined,
          contactEmail: 'ops@acme.example.com',
        },
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('createSuccess');
    expect(mockPush).toHaveBeenCalledWith('/customers/customer-company-1');
  });

  it('hides company pii inputs and omits company pii payload when no effective pii platform adapter exists', async () => {
    mockResolveEffectiveAdapter.mockResolvedValue({
      success: true,
      data: null,
    });
    mockCreateCompany.mockResolvedValue({
      success: true,
      data: {
        id: 'customer-company-2',
      },
    });

    render(<NewCustomerScreen />);

    fireEvent.click(screen.getByText('companyTitle'));
    await waitFor(() => {
      expect(screen.queryByLabelText('contactEmailLabel')).not.toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('nicknameLabel *'), {
      target: { value: 'No Pii Corp' },
    });
    fireEvent.change(screen.getByLabelText('legalName *'), {
      target: { value: 'No Pii Corp Ltd' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'createCustomer' }));

    await waitFor(() => {
      expect(mockCreateCompany).toHaveBeenCalledWith({
        talentId: 'talent-123',
        nickname: 'No Pii Corp',
        primaryLanguage: 'en',
        statusCode: 'NEW',
        tags: undefined,
        notes: undefined,
        companyLegalName: 'No Pii Corp Ltd',
        companyShortName: undefined,
        registrationNumber: undefined,
        website: undefined,
        pii: undefined,
      });
    });
  });
});
