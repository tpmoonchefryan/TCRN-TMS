// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// External Blocklist seed data - URL/Domain filtering for Marshmallow

import { PrismaClient } from '@prisma/client';

interface ExternalBlocklistData {
  ownerType: string;
  ownerId: string | null;
  pattern: string;
  patternType: string;
  nameEn: string;
  nameZh: string;
  nameJa?: string;
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
      nameEn: 'Known malware domain (example)',
      nameZh: '已知恶意软件域名（示例）',
      nameJa: '既知のマルウェアドメイン（例）',
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
      nameEn: 'Known phishing domain (example)',
      nameZh: '已知钓鱼网站（示例）',
      nameJa: '既知のフィッシングドメイン（例）',
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
      nameEn: 'URL shortener - Bitly',
      nameZh: '短链接服务 - Bitly',
      nameJa: 'URL短縮サービス - Bitly',
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
      nameEn: 'URL shortener - Twitter',
      nameZh: '短链接服务 - Twitter',
      nameJa: 'URL短縮サービス - Twitter',
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
      nameEn: 'URL shortener - TinyURL',
      nameZh: '短链接服务 - TinyURL',
      nameJa: 'URL短縮サービス - TinyURL',
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
      nameEn: 'Competitor platform (example)',
      nameZh: '竞品平台（示例）',
      nameJa: '競合プラットフォーム（例）',
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
      nameEn: 'Adult content domains',
      nameZh: '成人内容域名',
      nameJa: 'アダルトコンテンツドメイン',
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
      nameEn: 'Direct IP address access',
      nameZh: 'IP地址直接访问',
      nameJa: 'IPアドレス直接アクセス',
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
      nameEn: 'Windows executable files',
      nameZh: 'Windows可执行文件',
      nameJa: 'Windows実行ファイル',
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
      nameEn: 'Mobile app packages',
      nameZh: '移动应用安装包',
      nameJa: 'モバイルアプリパッケージ',
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
      nameEn: 'Scam keywords in URL',
      nameZh: 'URL中的诈骗关键词',
      nameJa: 'URL内の詐欺キーワード',
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
          nameEn: pattern.nameEn,
          nameZh: pattern.nameZh,
          nameJa: pattern.nameJa,
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
          nameEn: pattern.nameEn,
          nameZh: pattern.nameZh,
          nameJa: pattern.nameJa,
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
