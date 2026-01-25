// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';

// Config type
interface MarshmallowConfig {
  talent: {
    displayName: string;
    avatarUrl: string | null;
  };
  title: string | null;
  terms: {
    en: string | null;
    zh: string | null;
    ja: string | null;
  };
}

// Fetch config from API
const getConfig = async (path: string): Promise<MarshmallowConfig | null> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/marshmallow/${path}/config`, {
      next: { revalidate: 300 }
    });
    
    if (!res.ok) return null;
    const response = await res.json();
    return response.data || response;
  } catch (error) {
    console.error('Error fetching marshmallow config:', error);
    return null;
  }
};

// Default terms content
const DEFAULT_TERMS = {
  en: `# Terms of Service

Welcome to our Marshmallow service. By using this service, you agree to the following terms:

## 1. Acceptable Use
- Be respectful and kind in your messages
- Do not send spam, harassment, or abusive content
- Do not share personal information of others

## 2. Content Moderation
- All messages are subject to moderation
- We reserve the right to reject or remove any content
- Repeated violations may result in being blocked

## 3. Privacy
- Your IP address may be logged for security purposes
- We do not share your information with third parties
- See our Privacy Policy for more details

## 4. Changes
We may update these terms at any time. Continued use constitutes acceptance.

*Last updated: January 2026*`,
  zh: `# 服务条款

欢迎使用我们的棉花糖服务。使用本服务即表示您同意以下条款：

## 1. 使用规范
- 请保持友善和尊重
- 不要发送垃圾信息、骚扰或攻击性内容
- 不要分享他人的个人信息

## 2. 内容审核
- 所有消息都需要经过审核
- 我们保留拒绝或删除任何内容的权利
- 多次违规可能导致被屏蔽

## 3. 隐私
- 出于安全目的，您的 IP 地址可能会被记录
- 我们不会与第三方分享您的信息
- 更多详情请参阅隐私政策

## 4. 变更
我们可能随时更新这些条款。继续使用即表示接受。

*最后更新：2026年1月*`,
  ja: `# 利用規約

マシュマロサービスへようこそ。このサービスを利用することで、以下の規約に同意したものとみなされます：

## 1. 利用ルール
- 礼儀正しく、親切にメッセージを送ってください
- スパム、ハラスメント、攻撃的なコンテンツを送らないでください
- 他人の個人情報を共有しないでください

## 2. コンテンツモデレーション
- すべてのメッセージはモデレーションの対象となります
- 当方はコンテンツを拒否または削除する権利を留保します
- 繰り返し違反した場合、ブロックされる可能性があります

## 3. プライバシー
- セキュリティ上の目的でIPアドレスが記録される場合があります
- お客様の情報を第三者と共有することはありません
- 詳細はプライバシーポリシーをご覧ください

## 4. 変更
これらの規約は随時更新される場合があります。継続利用は承諾とみなされます。

*最終更新：2026年1月*`
};

export default async function TermsPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  const t = await getTranslations('legal');
  const locale = await getLocale();
  
  const config = await getConfig(path);
  
  if (!config) {
    notFound();
  }

  // Get content for current locale, fallback to English, then default
  const localeKey = locale as 'en' | 'zh' | 'ja';
  const termsContent = config.terms?.[localeKey] || config.terms?.en || DEFAULT_TERMS[localeKey] || DEFAULT_TERMS.en;

  return (
    <div className="px-4 pt-8 pb-8 flex-1">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-slate-500 hover:text-slate-800">
          <Link href={`/m/${path}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">{t('termsOfService')}</h1>
        <p className="text-slate-500 text-sm mt-1">{config.talent.displayName}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="prose prose-slate prose-sm max-w-none">
          {/* Simple markdown-like rendering */}
          {termsContent.split('\n').map((line, i) => {
            if (line.startsWith('# ')) {
              return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
            }
            if (line.startsWith('- ')) {
              return <li key={i} className="ml-4">{line.slice(2)}</li>;
            }
            if (line.startsWith('*') && line.endsWith('*')) {
              return <p key={i} className="text-sm text-slate-400 italic mt-4">{line.slice(1, -1)}</p>;
            }
            if (line.trim() === '') {
              return <br key={i} />;
            }
            return <p key={i} className="my-2">{line}</p>;
          })}
        </div>
      </div>
    </div>
  );
}
