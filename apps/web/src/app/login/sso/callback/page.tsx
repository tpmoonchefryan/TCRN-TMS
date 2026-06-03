import { Suspense } from 'react';

import { SsoCallbackScreen } from '@/domains/auth-identity/components/SsoCallbackScreen';

function SsoCallbackFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p role="status" className="text-sm font-medium text-slate-600">
          Completing SSO sign-in...
        </p>
      </section>
    </main>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense fallback={<SsoCallbackFallback />}>
      <SsoCallbackScreen />
    </Suspense>
  );
}
