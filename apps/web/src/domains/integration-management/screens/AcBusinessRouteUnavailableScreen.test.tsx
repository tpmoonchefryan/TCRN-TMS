import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AcBusinessRouteUnavailableScreen } from '@/domains/integration-management/screens/AcBusinessRouteUnavailableScreen';

function expectNoOperationalCopy() {
  expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /new adapter/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /new webhook/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /test/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /replay/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/module is not enabled/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/dispatcher/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/svix/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/sso/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/captcha/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/external-ready/i)).not.toBeInTheDocument();
}

describe('AcBusinessRouteUnavailableScreen', () => {
  it('renders a constrained AC unavailable state for interface routes', () => {
    render(<AcBusinessRouteUnavailableScreen surface="interfaces" tenantId="tenant-ac" />);

    expect(
      screen.getByRole('heading', { name: 'Interface Management is not available in AC' })
    ).toBeInTheDocument();
    expect(screen.getByText('not_available_in_ac')).toBeInTheDocument();
    expect(screen.getByText(/AC is a platform-management scope/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Business adapters belong to an enabled business or UAT tenant/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Platform/DevOps Tools' })).toHaveAttribute(
      'href',
      '/ac/tenant-ac/platform-tools'
    );
    expectNoOperationalCopy();
  });

  it('renders a constrained AC unavailable state for webhook routes', () => {
    render(<AcBusinessRouteUnavailableScreen surface="webhooks" tenantId="tenant-ac" />);

    expect(
      screen.getByRole('heading', { name: 'Webhook Management is not available in AC' })
    ).toBeInTheDocument();
    expect(screen.getByText('not_available_in_ac')).toBeInTheDocument();
    expect(screen.getByText(/AC is a platform-management scope/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Business webhook endpoints belong to an enabled business or UAT tenant/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Platform/DevOps Tools' })).toHaveAttribute(
      'href',
      '/ac/tenant-ac/platform-tools'
    );
    expectNoOperationalCopy();
  });
});
