// SPDX-License-Identifier: Apache-2.0
// External Blocklist seed data - URL/Domain filtering for Marshmallow

import { PrismaClient } from '../../src/platform/prisma/client';

import { createLocalizedText, type LocalizedText } from '../../../shared/src/constants/locale';

interface ExternalBlocklistData {
  ownerType: string;
  ownerId: string | null;
  pattern: string;
  patternType: string;
  name: LocalizedText;
  description?: string;
  category: string;
  severity: string;
  action: string;
  replacement: string;
  inherit: boolean;
  sortOrder: number;
  isForceUse: boolean;
  isSystem: boolean;
}

export async function seedExternalBlocklistPatterns(prisma: PrismaClient) {
  console.log('  → Seeding external blocklist patterns...');

  const patterns: ExternalBlocklistData[] = [
    // ========================================
    // 系统强制规则 - 恶意网站 (isForceUse=true)
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: '*.malware-domain.com',
      patternType: 'domain',
      name: createLocalizedText({
        en: 'Known malware domain (example)',
        zh_HANS: '已知恶意软件域名（示例）',
        zh_HANT: '已知恶意软件域名（示例）',
        ja: '既知のマルウェアドメイン（例）',
        ko: 'Known malware domain (example)',
        fr: 'Known malware domain (example)',
      }),
      description: 'Example malware domain for testing',
      category: 'malware',
      severity: 'high',
      action: 'reject',
      replacement: '[链接已移除]',
      inherit: true,
      sortOrder: 10,
      isForceUse: true,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: '*.phishing-site.net',
      patternType: 'domain',
      name: createLocalizedText({
        en: 'Known phishing domain (example)',
        zh_HANS: '已知钓鱼网站（示例）',
        zh_HANT: '已知钓鱼网站（示例）',
        ja: '既知のフィッシングドメイン（例）',
        ko: 'Known phishing domain (example)',
        fr: 'Known phishing domain (example)',
      }),
      description: 'Example phishing domain for testing',
      category: 'phishing',
      severity: 'high',
      action: 'reject',
      replacement: '[链接已移除]',
      inherit: true,
      sortOrder: 11,
      isForceUse: true,
      isSystem: true,
    },

    // ========================================
    // 系统推荐规则 - 常见风险网站 (isForceUse=false)
    // ========================================
    
    // 短链接服务 - 可能用于隐藏恶意链接
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: 'bit.ly',
      patternType: 'domain',
      name: createLocalizedText({
        en: 'URL shortener - Bitly',
        zh_HANS: '短链接服务 - Bitly',
        zh_HANT: '短链接服务 - Bitly',
        ja: 'URL短縮サービス - Bitly',
        ko: 'URL shortener - Bitly',
        fr: 'URL shortener - Bitly',
      }),
      description: 'Short URL service that may hide malicious links',
      category: 'url_shortener',
      severity: 'medium',
      action: 'flag',
      replacement: '[短链接]',
      inherit: true,
      sortOrder: 100,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: 't.co',
      patternType: 'domain',
      name: createLocalizedText({
        en: 'URL shortener - Twitter',
        zh_HANS: '短链接服务 - Twitter',
        zh_HANT: '短链接服务 - Twitter',
        ja: 'URL短縮サービス - Twitter',
        ko: 'URL shortener - Twitter',
        fr: 'URL shortener - Twitter',
      }),
      description: 'Twitter short URL service',
      category: 'url_shortener',
      severity: 'low',
      action: 'flag',
      replacement: '[Twitter链接]',
      inherit: true,
      sortOrder: 101,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: 'tinyurl.com',
      patternType: 'domain',
      name: createLocalizedText({
        en: 'URL shortener - TinyURL',
        zh_HANS: '短链接服务 - TinyURL',
        zh_HANT: '短链接服务 - TinyURL',
        ja: 'URL短縮サービス - TinyURL',
        ko: 'URL shortener - TinyURL',
        fr: 'URL shortener - TinyURL',
      }),
      description: 'TinyURL short URL service',
      category: 'url_shortener',
      severity: 'medium',
      action: 'flag',
      replacement: '[短链接]',
      inherit: true,
      sortOrder: 102,
      isForceUse: false,
      isSystem: true,
    },

    // 竞品平台 - 用于示例
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: 'rival-platform.com',
      patternType: 'domain',
      name: createLocalizedText({
        en: 'Competitor platform (example)',
        zh_HANS: '竞品平台（示例）',
        zh_HANT: '竞品平台（示例）',
        ja: '競合プラットフォーム（例）',
        ko: 'Competitor platform (example)',
        fr: 'Competitor platform (example)',
      }),
      description: 'Example competitor platform domain',
      category: 'competitor',
      severity: 'low',
      action: 'flag',
      replacement: '[外部平台链接]',
      inherit: true,
      sortOrder: 200,
      isForceUse: false,
      isSystem: true,
    },

    // 成人内容
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: '.*\\.(xxx|porn|adult)$',
      patternType: 'url_regex',
      name: createLocalizedText({
        en: 'Adult content domains',
        zh_HANS: '成人内容域名',
        zh_HANT: '成人内容域名',
        ja: 'アダルトコンテンツドメイン',
        ko: 'Adult content domains',
        fr: 'Adult content domains',
      }),
      description: 'Domains with adult content TLDs',
      category: 'adult',
      severity: 'high',
      action: 'reject',
      replacement: '[链接已移除]',
      inherit: true,
      sortOrder: 300,
      isForceUse: false,
      isSystem: true,
    },

    // IP 地址直接访问 - 通常用于可疑目的
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: 'https?://\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}',
      patternType: 'url_regex',
      name: createLocalizedText({
        en: 'Direct IP address access',
        zh_HANS: 'IP地址直接访问',
        zh_HANT: 'IP地址直接访问',
        ja: 'IPアドレス直接アクセス',
        ko: 'Direct IP address access',
        fr: 'Direct IP address access',
      }),
      description: 'URLs using IP addresses instead of domains',
      category: 'suspicious',
      severity: 'medium',
      action: 'flag',
      replacement: '[可疑链接]',
      inherit: true,
      sortOrder: 400,
      isForceUse: false,
      isSystem: true,
    },

    // 文件下载链接
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: '.*\\.(exe|msi|bat|cmd|scr|pif)$',
      patternType: 'url_regex',
      name: createLocalizedText({
        en: 'Windows executable files',
        zh_HANS: 'Windows可执行文件',
        zh_HANT: 'Windows可执行文件',
        ja: 'Windows実行ファイル',
        ko: 'Windows executable files',
        fr: 'Windows executable files',
      }),
      description: 'Links to potentially dangerous Windows executables',
      category: 'executable',
      severity: 'high',
      action: 'reject',
      replacement: '[可执行文件链接已移除]',
      inherit: true,
      sortOrder: 500,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: '.*\\.(apk|ipa)$',
      patternType: 'url_regex',
      name: createLocalizedText({
        en: 'Mobile app packages',
        zh_HANS: '移动应用安装包',
        zh_HANT: '移动应用安装包',
        ja: 'モバイルアプリパッケージ',
        ko: 'Mobile app packages',
        fr: 'Mobile app packages',
      }),
      description: 'Links to mobile app installation packages',
      category: 'executable',
      severity: 'medium',
      action: 'flag',
      replacement: '[应用安装包链接]',
      inherit: true,
      sortOrder: 501,
      isForceUse: false,
      isSystem: true,
    },

    // 已知诈骗关键词
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: 'free.*gift|winner|congratulation.*prize',
      patternType: 'keyword',
      name: createLocalizedText({
        en: 'Scam keywords in URL',
        zh_HANS: 'URL中的诈骗关键词',
        zh_HANT: 'URL中的诈骗关键词',
        ja: 'URL内の詐欺キーワード',
        ko: 'Scam keywords in URL',
        fr: 'Scam keywords in URL',
      }),
      description: 'Common scam/prize keywords in URLs',
      category: 'scam',
      severity: 'high',
      action: 'reject',
      replacement: '[可疑链接已移除]',
      inherit: true,
      sortOrder: 600,
      isForceUse: false,
      isSystem: true,
    },
  ];

  // Upsert patterns
  let created = 0;
  let updated = 0;

  for (const pattern of patterns) {
    // Check if pattern exists
    const existing = await prisma.externalBlocklistPattern.findFirst({
      where: {
        ownerType: pattern.ownerType,
        ownerId: pattern.ownerId,
        pattern: pattern.pattern,
      },
    });

    if (existing) {
      await prisma.externalBlocklistPattern.update({
        where: { id: existing.id },
        data: {
          patternType: pattern.patternType,
          name: pattern.name,
          description: pattern.description,
          category: pattern.category,
          severity: pattern.severity,
          action: pattern.action,
          replacement: pattern.replacement,
          inherit: pattern.inherit,
          sortOrder: pattern.sortOrder,
          isForceUse: pattern.isForceUse,
          isSystem: pattern.isSystem,
        },
      });
      updated++;
    } else {
      await prisma.externalBlocklistPattern.create({
        data: {
          ownerType: pattern.ownerType,
          ownerId: pattern.ownerId,
          pattern: pattern.pattern,
          patternType: pattern.patternType,
          name: pattern.name,
          description: pattern.description,
          category: pattern.category,
          severity: pattern.severity,
          action: pattern.action,
          replacement: pattern.replacement,
          inherit: pattern.inherit,
          sortOrder: pattern.sortOrder,
          isForceUse: pattern.isForceUse,
          isSystem: pattern.isSystem,
        },
      });
      created++;
    }
  }

  console.log(`    ✓ External blocklist patterns: ${created} created, ${updated} updated`);
}
