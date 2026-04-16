// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import { fetchPublicMarshmallowConfig } from '@/lib/api/modules/public-marshmallow-fetch';
import { Button } from '@/platform/ui';

export async function PublicMarshmallowPrivacyScreen({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const t = await getTranslations('legal');
  const locale = await getLocale();

  const config = await fetchPublicMarshmallowConfig(path, { revalidate: 300 });

  if (!config) {
    notFound();
  }

  const localeKey = locale as 'en' | 'zh' | 'ja';
  const defaultPrivacyContent = t.raw('defaultPrivacyMarkdown') as string;
  const privacyContent = config.privacy?.[localeKey] || config.privacy?.en || defaultPrivacyContent;

  return (
    <div className="flex-1 px-4 pb-8 pt-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 mb-4 text-slate-500 hover:text-slate-800"
        >
          <Link href={`/m/${path}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">{t('privacyPolicy')}</h1>
        <p className="mt-1 text-sm text-slate-500">{config.talent.displayName}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="prose prose-slate prose-sm max-w-none">
          {/* Simple markdown-like rendering */}
          {privacyContent.split('\n').map((line, i) => {
            if (line.startsWith('# ')) {
              return (
                <h1 key={i} className="mb-2 mt-4 text-xl font-bold">
                  {line.slice(2)}
                </h1>
              );
            }
            if (line.startsWith('## ')) {
              return (
                <h2 key={i} className="mb-2 mt-4 text-lg font-semibold">
                  {line.slice(3)}
                </h2>
              );
            }
            if (line.startsWith('- ')) {
              // Handle bold text in list items
              const content = line.slice(2).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
              return <li key={i} className="ml-4" dangerouslySetInnerHTML={{ __html: content }} />;
            }
            if (line.startsWith('*') && line.endsWith('*')) {
              return (
                <p key={i} className="mt-4 text-sm italic text-slate-400">
                  {line.slice(1, -1)}
                </p>
              );
            }
            if (line.trim() === '') {
              return <br key={i} />;
            }
            return (
              <p key={i} className="my-2">
                {line}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
