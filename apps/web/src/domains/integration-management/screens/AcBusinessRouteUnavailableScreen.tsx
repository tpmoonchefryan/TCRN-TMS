import Link from 'next/link';

type AcBusinessRouteUnavailableSurface = 'interfaces' | 'webhooks';

type AcBusinessRouteUnavailableScreenProps = {
  surface: AcBusinessRouteUnavailableSurface;
  tenantId: string;
};

const surfaceCopy: Record<
  AcBusinessRouteUnavailableSurface,
  {
    eyebrow: string;
    heading: string;
    businessSurface: string;
  }
> = {
  interfaces: {
    eyebrow: 'AC / Interfaces',
    heading: 'Interface Management is not available in AC',
    businessSurface: 'Business adapters belong to an enabled business or UAT tenant.',
  },
  webhooks: {
    eyebrow: 'AC / Webhooks',
    heading: 'Webhook Management is not available in AC',
    businessSurface: 'Business webhook endpoints belong to an enabled business or UAT tenant.',
  },
};

export function AcBusinessRouteUnavailableScreen({
  surface,
  tenantId,
}: AcBusinessRouteUnavailableScreenProps) {
  const copy = surfaceCopy[surface];

  return (
    <section
      aria-labelledby="ac-business-route-unavailable-heading"
      className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-4xl items-center px-4 py-8 sm:px-6 lg:px-8"
      data-state="not_available_in_ac"
      data-surface={surface}
    >
      <div className="w-full rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
              {copy.eyebrow}
            </p>
            <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              not_available_in_ac
            </div>
            <div className="space-y-3">
              <h1
                id="ac-business-route-unavailable-heading"
                className="text-2xl font-semibold text-slate-950 sm:text-3xl"
              >
                {copy.heading}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                AC is a platform-management scope. {copy.businessSurface} AC manages
                platform and developer-tool readiness in Platform/DevOps Tools; this page
                does not host business adapter or webhook records.
              </p>
            </div>
          </div>

          <Link
            className="inline-flex items-center justify-center rounded-lg border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
            href={`/ac/${tenantId}/platform-tools`}
          >
            Go to Platform/DevOps Tools
          </Link>
        </div>
      </div>
    </section>
  );
}
