// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * System Dictionary Data
 * Read-only enums and standard data
 */

export interface DictionaryItem {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  [key: string]: unknown;
}

// Profile Types
export const PROFILE_TYPES: DictionaryItem[] = [
  { code: 'individual', nameEn: 'Individual', nameZh: '个人', nameJa: '個人' },
  { code: 'company', nameEn: 'Company', nameZh: '企业', nameJa: '企業' },
];

// Genders
export const GENDERS: DictionaryItem[] = [
  { code: 'male', nameEn: 'Male', nameZh: '男', nameJa: '男性' },
  { code: 'female', nameEn: 'Female', nameZh: '女', nameJa: '女性' },
  { code: 'other', nameEn: 'Other', nameZh: '其他', nameJa: 'その他' },
  { code: 'undisclosed', nameEn: 'Undisclosed', nameZh: '未透露', nameJa: '非公開' },
];

// Adapter Types
export const ADAPTER_TYPES: DictionaryItem[] = [
  { code: 'oauth', nameEn: 'OAuth', nameZh: 'OAuth认证', nameJa: 'OAuth認証' },
  { code: 'api_key', nameEn: 'API Key', nameZh: 'API密钥', nameJa: 'APIキー' },
  { code: 'webhook', nameEn: 'Webhook', nameZh: 'Webhook', nameJa: 'Webhook' },
];

// Webhook Events
export const WEBHOOK_EVENTS: DictionaryItem[] = [
  { code: 'customer.created', nameEn: 'Customer Created', nameZh: '客户创建', nameJa: '顧客作成' },
  { code: 'customer.updated', nameEn: 'Customer Updated', nameZh: '客户更新', nameJa: '顧客更新' },
  { code: 'customer.deleted', nameEn: 'Customer Deleted', nameZh: '客户删除', nameJa: '顧客削除' },
  { code: 'membership.created', nameEn: 'Membership Created', nameZh: '会员创建', nameJa: '会員作成' },
  { code: 'membership.updated', nameEn: 'Membership Updated', nameZh: '会员更新', nameJa: '会員更新' },
  { code: 'membership.expired', nameEn: 'Membership Expired', nameZh: '会员过期', nameJa: '会員期限切れ' },
  { code: 'marshmallow.received', nameEn: 'Marshmallow Received', nameZh: '棉花糖收到', nameJa: 'マシュマロ受信' },
  { code: 'marshmallow.replied', nameEn: 'Marshmallow Replied', nameZh: '棉花糖回复', nameJa: 'マシュマロ返信' },
  { code: 'import.completed', nameEn: 'Import Completed', nameZh: '导入完成', nameJa: 'インポート完了' },
  { code: 'import.failed', nameEn: 'Import Failed', nameZh: '导入失败', nameJa: 'インポート失敗' },
  { code: 'report.ready', nameEn: 'Report Ready', nameZh: '报表就绪', nameJa: 'レポート準備完了' },
];

// Job Status
export const JOB_STATUSES: DictionaryItem[] = [
  { code: 'pending', nameEn: 'Pending', nameZh: '待处理', nameJa: '保留中' },
  { code: 'processing', nameEn: 'Processing', nameZh: '处理中', nameJa: '処理中' },
  { code: 'completed', nameEn: 'Completed', nameZh: '已完成', nameJa: '完了' },
  { code: 'failed', nameEn: 'Failed', nameZh: '失败', nameJa: '失敗' },
  { code: 'cancelled', nameEn: 'Cancelled', nameZh: '已取消', nameJa: 'キャンセル' },
];

// Log Severity
export const LOG_SEVERITIES: DictionaryItem[] = [
  { code: 'debug', nameEn: 'Debug', nameZh: '调试', nameJa: 'デバッグ' },
  { code: 'info', nameEn: 'Info', nameZh: '信息', nameJa: '情報' },
  { code: 'warn', nameEn: 'Warning', nameZh: '警告', nameJa: '警告' },
  { code: 'error', nameEn: 'Error', nameZh: '错误', nameJa: 'エラー' },
  { code: 'fatal', nameEn: 'Fatal', nameZh: '致命', nameJa: '致命的' },
];

// Common Countries (top 50 + some)
export const COUNTRIES: DictionaryItem[] = [
  { code: 'CN', nameEn: 'China', nameZh: '中国', nameJa: '中国' },
  { code: 'JP', nameEn: 'Japan', nameZh: '日本', nameJa: '日本' },
  { code: 'US', nameEn: 'United States', nameZh: '美国', nameJa: 'アメリカ' },
  { code: 'GB', nameEn: 'United Kingdom', nameZh: '英国', nameJa: 'イギリス' },
  { code: 'KR', nameEn: 'South Korea', nameZh: '韩国', nameJa: '韓国' },
  { code: 'TW', nameEn: 'Taiwan', nameZh: '台湾', nameJa: '台湾' },
  { code: 'HK', nameEn: 'Hong Kong', nameZh: '香港', nameJa: '香港' },
  { code: 'SG', nameEn: 'Singapore', nameZh: '新加坡', nameJa: 'シンガポール' },
  { code: 'MY', nameEn: 'Malaysia', nameZh: '马来西亚', nameJa: 'マレーシア' },
  { code: 'TH', nameEn: 'Thailand', nameZh: '泰国', nameJa: 'タイ' },
  { code: 'VN', nameEn: 'Vietnam', nameZh: '越南', nameJa: 'ベトナム' },
  { code: 'ID', nameEn: 'Indonesia', nameZh: '印度尼西亚', nameJa: 'インドネシア' },
  { code: 'PH', nameEn: 'Philippines', nameZh: '菲律宾', nameJa: 'フィリピン' },
  { code: 'IN', nameEn: 'India', nameZh: '印度', nameJa: 'インド' },
  { code: 'AU', nameEn: 'Australia', nameZh: '澳大利亚', nameJa: 'オーストラリア' },
  { code: 'NZ', nameEn: 'New Zealand', nameZh: '新西兰', nameJa: 'ニュージーランド' },
  { code: 'CA', nameEn: 'Canada', nameZh: '加拿大', nameJa: 'カナダ' },
  { code: 'DE', nameEn: 'Germany', nameZh: '德国', nameJa: 'ドイツ' },
  { code: 'FR', nameEn: 'France', nameZh: '法国', nameJa: 'フランス' },
  { code: 'IT', nameEn: 'Italy', nameZh: '意大利', nameJa: 'イタリア' },
  { code: 'ES', nameEn: 'Spain', nameZh: '西班牙', nameJa: 'スペイン' },
  { code: 'RU', nameEn: 'Russia', nameZh: '俄罗斯', nameJa: 'ロシア' },
  { code: 'BR', nameEn: 'Brazil', nameZh: '巴西', nameJa: 'ブラジル' },
  { code: 'MX', nameEn: 'Mexico', nameZh: '墨西哥', nameJa: 'メキシコ' },
];

// Common Languages
export const LANGUAGES: DictionaryItem[] = [
  { code: 'en', nameEn: 'English', nameZh: '英语', nameJa: '英語' },
  { code: 'zh', nameEn: 'Chinese', nameZh: '中文', nameJa: '中国語' },
  { code: 'ja', nameEn: 'Japanese', nameZh: '日语', nameJa: '日本語' },
  { code: 'ko', nameEn: 'Korean', nameZh: '韩语', nameJa: '韓国語' },
  { code: 'es', nameEn: 'Spanish', nameZh: '西班牙语', nameJa: 'スペイン語' },
  { code: 'fr', nameEn: 'French', nameZh: '法语', nameJa: 'フランス語' },
  { code: 'de', nameEn: 'German', nameZh: '德语', nameJa: 'ドイツ語' },
  { code: 'it', nameEn: 'Italian', nameZh: '意大利语', nameJa: 'イタリア語' },
  { code: 'pt', nameEn: 'Portuguese', nameZh: '葡萄牙语', nameJa: 'ポルトガル語' },
  { code: 'ru', nameEn: 'Russian', nameZh: '俄语', nameJa: 'ロシア語' },
  { code: 'ar', nameEn: 'Arabic', nameZh: '阿拉伯语', nameJa: 'アラビア語' },
  { code: 'hi', nameEn: 'Hindi', nameZh: '印地语', nameJa: 'ヒンディー語' },
  { code: 'th', nameEn: 'Thai', nameZh: '泰语', nameJa: 'タイ語' },
  { code: 'vi', nameEn: 'Vietnamese', nameZh: '越南语', nameJa: 'ベトナム語' },
  { code: 'id', nameEn: 'Indonesian', nameZh: '印尼语', nameJa: 'インドネシア語' },
];

// Common Timezones
export const TIMEZONES: Array<DictionaryItem & { offset: string }> = [
  { code: 'UTC', nameEn: 'Coordinated Universal Time', nameZh: '协调世界时', nameJa: '協定世界時', offset: '+00:00' },
  { code: 'Asia/Shanghai', nameEn: 'China Standard Time', nameZh: '中国标准时间', nameJa: '中国標準時', offset: '+08:00' },
  { code: 'Asia/Tokyo', nameEn: 'Japan Standard Time', nameZh: '日本标准时间', nameJa: '日本標準時', offset: '+09:00' },
  { code: 'Asia/Seoul', nameEn: 'Korea Standard Time', nameZh: '韩国标准时间', nameJa: '韓国標準時', offset: '+09:00' },
  { code: 'Asia/Taipei', nameEn: 'Taipei Standard Time', nameZh: '台北标准时间', nameJa: '台北標準時', offset: '+08:00' },
  { code: 'Asia/Hong_Kong', nameEn: 'Hong Kong Time', nameZh: '香港时间', nameJa: '香港時間', offset: '+08:00' },
  { code: 'Asia/Singapore', nameEn: 'Singapore Time', nameZh: '新加坡时间', nameJa: 'シンガポール時間', offset: '+08:00' },
  { code: 'Asia/Bangkok', nameEn: 'Indochina Time', nameZh: '中南半岛时间', nameJa: 'インドシナ時間', offset: '+07:00' },
  { code: 'America/New_York', nameEn: 'Eastern Time (US)', nameZh: '美国东部时间', nameJa: '米国東部時間', offset: '-05:00' },
  { code: 'America/Los_Angeles', nameEn: 'Pacific Time (US)', nameZh: '美国太平洋时间', nameJa: '米国太平洋時間', offset: '-08:00' },
  { code: 'America/Chicago', nameEn: 'Central Time (US)', nameZh: '美国中部时间', nameJa: '米国中部時間', offset: '-06:00' },
  { code: 'Europe/London', nameEn: 'Greenwich Mean Time', nameZh: '格林威治标准时间', nameJa: 'グリニッジ標準時', offset: '+00:00' },
  { code: 'Europe/Paris', nameEn: 'Central European Time', nameZh: '中欧时间', nameJa: '中央ヨーロッパ時間', offset: '+01:00' },
  { code: 'Europe/Berlin', nameEn: 'Central European Time', nameZh: '中欧时间', nameJa: '中央ヨーロッパ時間', offset: '+01:00' },
  { code: 'Australia/Sydney', nameEn: 'Australian Eastern Time', nameZh: '澳大利亚东部时间', nameJa: 'オーストラリア東部時間', offset: '+11:00' },
];

// Common Currencies
export const CURRENCIES: Array<DictionaryItem & { symbol: string }> = [
  { code: 'USD', nameEn: 'US Dollar', nameZh: '美元', nameJa: '米ドル', symbol: '$' },
  { code: 'EUR', nameEn: 'Euro', nameZh: '欧元', nameJa: 'ユーロ', symbol: '€' },
  { code: 'GBP', nameEn: 'British Pound', nameZh: '英镑', nameJa: '英ポンド', symbol: '£' },
  { code: 'JPY', nameEn: 'Japanese Yen', nameZh: '日元', nameJa: '日本円', symbol: '¥' },
  { code: 'CNY', nameEn: 'Chinese Yuan', nameZh: '人民币', nameJa: '中国人民元', symbol: '¥' },
  { code: 'KRW', nameEn: 'South Korean Won', nameZh: '韩元', nameJa: '韓国ウォン', symbol: '₩' },
  { code: 'TWD', nameEn: 'Taiwan Dollar', nameZh: '新台币', nameJa: '台湾ドル', symbol: 'NT$' },
  { code: 'HKD', nameEn: 'Hong Kong Dollar', nameZh: '港币', nameJa: '香港ドル', symbol: 'HK$' },
  { code: 'SGD', nameEn: 'Singapore Dollar', nameZh: '新加坡元', nameJa: 'シンガポールドル', symbol: 'S$' },
  { code: 'AUD', nameEn: 'Australian Dollar', nameZh: '澳元', nameJa: '豪ドル', symbol: 'A$' },
  { code: 'CAD', nameEn: 'Canadian Dollar', nameZh: '加元', nameJa: 'カナダドル', symbol: 'C$' },
  { code: 'CHF', nameEn: 'Swiss Franc', nameZh: '瑞士法郎', nameJa: 'スイスフラン', symbol: 'CHF' },
  { code: 'THB', nameEn: 'Thai Baht', nameZh: '泰铢', nameJa: 'タイバーツ', symbol: '฿' },
  { code: 'MYR', nameEn: 'Malaysian Ringgit', nameZh: '马来西亚令吉', nameJa: 'マレーシアリンギット', symbol: 'RM' },
  { code: 'IDR', nameEn: 'Indonesian Rupiah', nameZh: '印尼盾', nameJa: 'インドネシアルピア', symbol: 'Rp' },
];

// Dictionary type definitions
export const DICTIONARY_TYPES = {
  profile_types: { data: PROFILE_TYPES, nameEn: 'Profile Types', nameZh: '档案类型', nameJa: 'プロフィールタイプ' },
  genders: { data: GENDERS, nameEn: 'Genders', nameZh: '性别', nameJa: '性別' },
  adapter_types: { data: ADAPTER_TYPES, nameEn: 'Adapter Types', nameZh: '适配器类型', nameJa: 'アダプタータイプ' },
  webhook_events: { data: WEBHOOK_EVENTS, nameEn: 'Webhook Events', nameZh: 'Webhook事件', nameJa: 'Webhookイベント' },
  job_statuses: { data: JOB_STATUSES, nameEn: 'Job Statuses', nameZh: '任务状态', nameJa: 'ジョブステータス' },
  log_severities: { data: LOG_SEVERITIES, nameEn: 'Log Severities', nameZh: '日志级别', nameJa: 'ログ重要度' },
  countries: { data: COUNTRIES, nameEn: 'Countries', nameZh: '国家/地区', nameJa: '国・地域' },
  languages: { data: LANGUAGES, nameEn: 'Languages', nameZh: '语言', nameJa: '言語' },
  timezones: { data: TIMEZONES, nameEn: 'Timezones', nameZh: '时区', nameJa: 'タイムゾーン' },
  currencies: { data: CURRENCIES, nameEn: 'Currencies', nameZh: '货币', nameJa: '通貨' },
} as const;

export type DictionaryType = keyof typeof DICTIONARY_TYPES;
