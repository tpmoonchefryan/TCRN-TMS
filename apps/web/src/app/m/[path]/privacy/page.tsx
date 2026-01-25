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
  privacy: {
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

// Default privacy content
const DEFAULT_PRIVACY = {
  en: `# Privacy Policy

Your privacy is important to us. This policy explains how we handle your information.

## Information We Collect
- **Message Content**: The text you submit through the form
- **IP Address**: Recorded for security and spam prevention
- **Browser Fingerprint**: A hash used to identify repeat submissions

## How We Use Your Information
- To display your message to the talent (if approved)
- To prevent spam and abuse
- To improve our service

## Data Retention
- Messages are retained as long as the talent keeps them
- IP addresses are stored for 30 days
- Browser fingerprints are stored for 30 days

## Your Rights
- You can request deletion of your messages
- Contact the talent directly for such requests

## Security
- We use industry-standard security measures
- Data is encrypted in transit
- Access is restricted to authorized personnel

## Contact
For privacy concerns, please contact us through the main website.

*Last updated: January 2026*`,
  zh: `# 隐私政策

您的隐私对我们很重要。本政策说明我们如何处理您的信息。

## 我们收集的信息
- **消息内容**：您通过表单提交的文字
- **IP 地址**：为安全和防止垃圾信息而记录
- **浏览器指纹**：用于识别重复提交的哈希值

## 我们如何使用您的信息
- 向艺人展示您的消息（如果通过审核）
- 防止垃圾信息和滥用
- 改进我们的服务

## 数据保留
- 消息将保留至艺人删除为止
- IP 地址保存 30 天
- 浏览器指纹保存 30 天

## 您的权利
- 您可以请求删除您的消息
- 请直接联系艺人提出此类请求

## 安全
- 我们使用行业标准的安全措施
- 传输中的数据已加密
- 仅授权人员可访问

## 联系方式
如有隐私方面的问题，请通过主网站联系我们。

*最后更新：2026年1月*`,
  ja: `# プライバシーポリシー

お客様のプライバシーは当方にとって重要です。このポリシーでは、情報の取り扱いについて説明します。

## 収集する情報
- **メッセージ内容**：フォームから送信されたテキスト
- **IPアドレス**：セキュリティとスパム防止のために記録
- **ブラウザフィンガープリント**：重複送信を識別するためのハッシュ

## 情報の利用方法
- タレントにメッセージを表示する（承認された場合）
- スパムや悪用を防止する
- サービスを改善する

## データ保持
- メッセージはタレントが保持する限り保存されます
- IPアドレスは30日間保存されます
- ブラウザフィンガープリントは30日間保存されます

## お客様の権利
- メッセージの削除をリクエストできます
- そのようなリクエストはタレントに直接お問い合わせください

## セキュリティ
- 業界標準のセキュリティ対策を使用しています
- 転送中のデータは暗号化されています
- アクセスは許可された担当者に制限されています

## お問い合わせ
プライバシーに関するご質問は、メインウェブサイトからお問い合わせください。

*最終更新：2026年1月*`
};

export default async function PrivacyPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  const t = await getTranslations('legal');
  const locale = await getLocale();
  
  const config = await getConfig(path);
  
  if (!config) {
    notFound();
  }

  // Get content for current locale, fallback to English, then default
  const localeKey = locale as 'en' | 'zh' | 'ja';
  const privacyContent = config.privacy?.[localeKey] || config.privacy?.en || DEFAULT_PRIVACY[localeKey] || DEFAULT_PRIVACY.en;

  return (
    <div className="px-4 pt-8 pb-8 flex-1">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-slate-500 hover:text-slate-800">
          <Link href={`/m/${path}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">{t('privacyPolicy')}</h1>
        <p className="text-slate-500 text-sm mt-1">{config.talent.displayName}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="prose prose-slate prose-sm max-w-none">
          {/* Simple markdown-like rendering */}
          {privacyContent.split('\n').map((line, i) => {
            if (line.startsWith('# ')) {
              return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
            }
            if (line.startsWith('- ')) {
              // Handle bold text in list items
              const content = line.slice(2).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
              return <li key={i} className="ml-4" dangerouslySetInnerHTML={{ __html: content }} />;
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
