import { PublicPresenceSurface } from '@/domains/public-presence';

export type PublicMarshmallowNoticeTone = 'success' | 'error' | 'info';

const toneClasses: Record<PublicMarshmallowNoticeTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
};

export function PublicMarshmallowNotice({
  tone,
  message,
}: Readonly<{
  tone: PublicMarshmallowNoticeTone;
  message: string;
}>) {
  return (
    <PublicPresenceSurface
      role={tone === 'error' ? 'alert' : 'status'}
      variant="inset"
      className={`px-4 py-3 text-sm font-medium ${toneClasses[tone]}`}
    >
      {message}
    </PublicPresenceSurface>
  );
}
