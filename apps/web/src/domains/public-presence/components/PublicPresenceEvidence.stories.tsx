import type { Meta, StoryObj } from '@storybook/nextjs';
import { CalendarDays, Radio, Sparkles } from 'lucide-react';

import { PublicPresenceBadge } from '@/domains/public-presence/components/PublicPresenceBadge';
import { PublicPresenceHero } from '@/domains/public-presence/components/PublicPresenceHero';
import { PublicPresenceShell } from '@/domains/public-presence/components/PublicPresenceShell';
import { PublicPresenceSurface } from '@/domains/public-presence/components/PublicPresenceSurface';

function PublicPresenceEvidenceFixture() {
  return (
    <PublicPresenceShell
      aria-label="Public presence studio synthetic evidence target"
      data-testid="public-presence-evidence-target"
      decorationDensity="calm"
      width="lg"
    >
      <div className="space-y-6">
        <PublicPresenceHero
          actions={
            <>
              <a
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition duration-200 ease-out hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
                href="https://example.com/watch"
                style={{ color: '#ffffff' }}
              >
                Watch fixture stream
              </a>
              <a
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-rose-200 bg-white/80 px-4 text-sm font-semibold text-rose-700 transition duration-200 ease-out hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
                href="https://example.com/schedule"
              >
                View fixture schedule
              </a>
            </>
          }
          badge={
            <PublicPresenceBadge icon={<Sparkles />} tone="rose">
              Synthetic loaded state
            </PublicPresenceBadge>
          }
          description="A deterministic public presence surface for UI evidence. It uses synthetic copy, fixed time windows, and local Storybook rendering only."
          media={
            <div
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#fbcfe8_0,#fdf2f8_35%,#dbeafe_100%)]"
            >
              <div className="h-24 w-24 rounded-full border border-white/70 bg-white/60 shadow-[0_24px_60px_rgba(15,23,42,0.18)]" />
            </div>
          }
          meta={
            <>
              <PublicPresenceBadge icon={<CalendarDays />} tone="sky" variant="outline">
                Today 20:00 JST
              </PublicPresenceBadge>
              <PublicPresenceBadge icon={<Radio />} tone="emerald" variant="outline">
                Studio ready
              </PublicPresenceBadge>
            </>
          }
          title="Mira Solstice Fixture Hub"
          titleId="public-presence-evidence-title"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <PublicPresenceSurface as="section" interactive variant="panel">
            <h2 className="text-base font-semibold text-slate-950">Release Cue</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Draft, preview, and publish controls are represented with synthetic states only.
            </p>
          </PublicPresenceSurface>
          <PublicPresenceSurface as="section" interactive variant="ticket">
            <h2 className="text-base font-semibold text-slate-950">Fan Actions</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Links use non-production example URLs and fixed labels for repeatable testing.
            </p>
          </PublicPresenceSurface>
          <PublicPresenceSurface as="section" interactive variant="note">
            <h2 className="text-base font-semibold text-slate-950">Motion Policy</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Transitions are present and respect reduced-motion utility classes.
            </p>
          </PublicPresenceSurface>
        </div>
      </div>
    </PublicPresenceShell>
  );
}

const meta = {
  component: PublicPresenceEvidenceFixture,
  parameters: {
    layout: 'fullscreen',
  },
  title: 'Domains/Public Presence/PublicPresenceEvidence',
} satisfies Meta<typeof PublicPresenceEvidenceFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StudioHomeReady: Story = {};
