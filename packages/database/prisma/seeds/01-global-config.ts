// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Global configuration seed data

import { PrismaClient } from '@prisma/client';

export async function seedGlobalConfig(prisma: PrismaClient) {
  console.log('  → Seeding global configuration...');

  const configs = [
    {
      key: 'system.version',
      value: { version: '0.1.0', buildDate: new Date().toISOString() },
      description: 'System version information',
    },
    {
      key: 'system.maintenance',
      value: { enabled: false, message: null, allowedIps: [] },
      description: 'Maintenance mode configuration',
    },
    {
      key: 'system.baseDomain',
      value: { domain: 'tcrn.app' },
      description: 'Base domain for system subdomains (e.g., {talentCode}.m.{domain})',
    },
    {
      key: 'security.password_policy',
      value: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: true,
        maxAgeDays: 90,
        historyCount: 5,
      },
      description: 'Password policy settings',
    },
    {
      key: 'security.session',
      value: {
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '12h',
        maxConcurrentSessions: 5,
      },
      description: 'Session configuration',
    },
    {
      key: 'security.rate_limit',
      value: {
        global: { points: 100, duration: 60 },
        login: { points: 5, duration: 300 },
        api: { points: 200, duration: 60 },
      },
      description: 'Rate limiting configuration',
    },
    {
      key: 'feature_flags',
      value: {
        pii_encryption: true,
        totp_2fa: true,
        external_homepage: true,
        marshmallow: true,
        report_export: true,
        bulk_import: true,
      },
      description: 'Feature flags',
    },
    {
      key: 'dictionaries.profile_types',
      value: [
        { code: 'individual', nameEn: 'Individual', nameZh: '个人', nameJa: '個人' },
        { code: 'company', nameEn: 'Company', nameZh: '企业', nameJa: '法人' },
      ],
      description: 'Profile type dictionary',
    },
    {
      key: 'dictionaries.genders',
      value: [
        { code: 'male', nameEn: 'Male', nameZh: '男', nameJa: '男性' },
        { code: 'female', nameEn: 'Female', nameZh: '女', nameJa: '女性' },
        { code: 'other', nameEn: 'Other', nameZh: '其他', nameJa: 'その他' },
        { code: 'prefer_not_to_say', nameEn: 'Prefer not to say', nameZh: '不愿透露', nameJa: '回答しない' },
      ],
      description: 'Gender dictionary',
    },
    {
      key: 'dictionaries.languages',
      value: [
        { code: 'en', nameEn: 'English', nameZh: '英语', nameJa: '英語' },
        { code: 'zh', nameEn: 'Chinese', nameZh: '中文', nameJa: '中国語' },
        { code: 'ja', nameEn: 'Japanese', nameZh: '日语', nameJa: '日本語' },
        { code: 'ko', nameEn: 'Korean', nameZh: '韩语', nameJa: '韓国語' },
        { code: 'es', nameEn: 'Spanish', nameZh: '西班牙语', nameJa: 'スペイン語' },
        { code: 'fr', nameEn: 'French', nameZh: '法语', nameJa: 'フランス語' },
        { code: 'de', nameEn: 'German', nameZh: '德语', nameJa: 'ドイツ語' },
        { code: 'pt', nameEn: 'Portuguese', nameZh: '葡萄牙语', nameJa: 'ポルトガル語' },
        { code: 'ru', nameEn: 'Russian', nameZh: '俄语', nameJa: 'ロシア語' },
        { code: 'th', nameEn: 'Thai', nameZh: '泰语', nameJa: 'タイ語' },
        { code: 'vi', nameEn: 'Vietnamese', nameZh: '越南语', nameJa: 'ベトナム語' },
        { code: 'id', nameEn: 'Indonesian', nameZh: '印尼语', nameJa: 'インドネシア語' },
      ],
      description: 'Language dictionary',
    },
    {
      key: 'dictionaries.timezones',
      value: [
        { code: 'Asia/Tokyo', nameEn: 'Tokyo (JST)', offset: '+09:00' },
        { code: 'Asia/Shanghai', nameEn: 'Shanghai (CST)', offset: '+08:00' },
        { code: 'Asia/Hong_Kong', nameEn: 'Hong Kong (HKT)', offset: '+08:00' },
        { code: 'Asia/Taipei', nameEn: 'Taipei (CST)', offset: '+08:00' },
        { code: 'Asia/Seoul', nameEn: 'Seoul (KST)', offset: '+09:00' },
        { code: 'Asia/Singapore', nameEn: 'Singapore (SGT)', offset: '+08:00' },
        { code: 'America/Los_Angeles', nameEn: 'Los Angeles (PST)', offset: '-08:00' },
        { code: 'America/New_York', nameEn: 'New York (EST)', offset: '-05:00' },
        { code: 'Europe/London', nameEn: 'London (GMT)', offset: '+00:00' },
        { code: 'Europe/Paris', nameEn: 'Paris (CET)', offset: '+01:00' },
        { code: 'Australia/Sydney', nameEn: 'Sydney (AEST)', offset: '+10:00' },
        { code: 'UTC', nameEn: 'UTC', offset: '+00:00' },
      ],
      description: 'Timezone dictionary',
    },
    {
      key: 'dictionaries.countries',
      value: [
        { code: 'JP', nameEn: 'Japan', nameZh: '日本', nameJa: '日本' },
        { code: 'CN', nameEn: 'China', nameZh: '中国', nameJa: '中国' },
        { code: 'TW', nameEn: 'Taiwan', nameZh: '台湾', nameJa: '台湾' },
        { code: 'HK', nameEn: 'Hong Kong', nameZh: '香港', nameJa: '香港' },
        { code: 'KR', nameEn: 'South Korea', nameZh: '韩国', nameJa: '韓国' },
        { code: 'US', nameEn: 'United States', nameZh: '美国', nameJa: 'アメリカ' },
        { code: 'GB', nameEn: 'United Kingdom', nameZh: '英国', nameJa: 'イギリス' },
        { code: 'DE', nameEn: 'Germany', nameZh: '德国', nameJa: 'ドイツ' },
        { code: 'FR', nameEn: 'France', nameZh: '法国', nameJa: 'フランス' },
        { code: 'AU', nameEn: 'Australia', nameZh: '澳大利亚', nameJa: 'オーストラリア' },
        { code: 'SG', nameEn: 'Singapore', nameZh: '新加坡', nameJa: 'シンガポール' },
        { code: 'MY', nameEn: 'Malaysia', nameZh: '马来西亚', nameJa: 'マレーシア' },
        { code: 'TH', nameEn: 'Thailand', nameZh: '泰国', nameJa: 'タイ' },
        { code: 'VN', nameEn: 'Vietnam', nameZh: '越南', nameJa: 'ベトナム' },
        { code: 'ID', nameEn: 'Indonesia', nameZh: '印度尼西亚', nameJa: 'インドネシア' },
        { code: 'PH', nameEn: 'Philippines', nameZh: '菲律宾', nameJa: 'フィリピン' },
      ],
      description: 'Country dictionary',
    },
  ];

  for (const config of configs) {
    await prisma.globalConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: config,
    });
  }

  console.log(`    ✓ Created ${configs.length} global configs`);
}
