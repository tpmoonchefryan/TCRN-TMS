import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TalentBusinessAccessGate } from '@/domains/talent-workspace/components/TalentBusinessAccessGate';
import { ApiRequestError } from '@/platform/http/api';

const mockRequest = vi.fn();
const mockReadTalentDetail = vi.fn();

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => ({
    currentLocale: 'en',
  }),
}));

vi.mock('@/domains/config-dictionary-settings/api/settings.api', () => ({
  readTalentDetail: (...args: unknown[]) => mockReadTalentDetail(...args),
}));

describe('TalentBusinessAccessGate', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockReadTalentDetail.mockReset();
  });

  it('renders children when the talent is published', async () => {
    mockReadTalentDetail.mockResolvedValue({
      id: 'talent-1',
      lifecycleStatus: 'published',
    });

    render(
      <TalentBusinessAccessGate tenantId="tenant-1" talentId="talent-1">
        <div>Published workspace content</div>
      </TalentBusinessAccessGate>,
    );

    expect(screen.getByText('Checking talent availability')).toBeInTheDocument();

    expect(await screen.findByText('Published workspace content')).toBeInTheDocument();
    expect(mockReadTalentDetail).toHaveBeenCalledWith(mockRequest, 'talent-1');
  });

  it('redirects draft talents back to organization structure with a denied state', async () => {
    mockReadTalentDetail.mockResolvedValue({
      id: 'talent-1',
      lifecycleStatus: 'draft',
    });

    render(
      <TalentBusinessAccessGate tenantId="tenant-1" talentId="talent-1">
        <div>Draft workspace content</div>
      </TalentBusinessAccessGate>,
    );

    expect(await screen.findByText('Talent not published')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Draft talents stay in organization structure until they are published. Business pages remain unavailable.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Draft workspace content')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open organization structure' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/organization-structure',
    );
  });

  it('renders a disabled-state explanation and keeps the organization structure escape hatch', async () => {
    mockReadTalentDetail.mockResolvedValue({
      id: 'talent-1',
      lifecycleStatus: 'disabled',
    });

    render(
      <TalentBusinessAccessGate tenantId="tenant-1" talentId="talent-1">
        <div>Disabled workspace content</div>
      </TalentBusinessAccessGate>,
    );

    expect(await screen.findByText('Talent disabled')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Disabled talents stay out of business pages until someone re-enables them in organization structure.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Disabled workspace content')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open organization structure' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/organization-structure',
    );
  });

  it('renders an error state when lifecycle verification fails', async () => {
    mockReadTalentDetail.mockRejectedValue(
      new ApiRequestError('Talent detail lookup failed.', 'TALENT_LOOKUP_FAILED', 500),
    );

    render(
      <TalentBusinessAccessGate tenantId="tenant-1" talentId="talent-1">
        <div>Hidden workspace content</div>
      </TalentBusinessAccessGate>,
    );

    expect(await screen.findByText('Talent unavailable')).toBeInTheDocument();
    expect(screen.getByText('Talent detail lookup failed.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Hidden workspace content')).not.toBeInTheDocument();
    });
  });
});
