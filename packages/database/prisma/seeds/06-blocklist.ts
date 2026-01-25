// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Blocklist seed data - with inheritance control fields
// Sources:
// - English: LDNOOBW (CC-BY-4.0) https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
// - Chinese: Sensitive-lexicon (MIT) https://github.com/konsheng/Sensitive-lexicon
// - Japanese: inappropriate-words-ja (MIT) https://github.com/MosasoM/inappropriate-words-ja

import { PrismaClient } from '@prisma/client';

interface BlocklistEntryData {
  ownerType: string;
  ownerId: string | null;
  pattern: string;
  patternType: string;
  nameEn: string;
  nameZh: string;
  nameJa?: string;
  category: string;
  severity: string;
  action: string;
  scope: string[];
  inherit: boolean;
  sortOrder: number;
  isForceUse: boolean;
  isSystem: boolean;
}

// ============================================================================
// WORDLIST DEFINITIONS - Organized by language and category
// ============================================================================

// ----- English Profanity (High Severity - Reject) -----
const EN_PROFANITY_HIGH = [
  'fuck', 'fucking', 'fuckin', 'fucker', 'fucked', 'motherfucker',
  'shit', 'shitty', 'bullshit', 'horseshit',
  'bitch', 'bitches', 'asshole', 'bastard',
  'cunt', 'cock', 'cocks', 'dick', 'dicks',
  'nigger', 'nigga', 'faggot', 'fag',
  'whore', 'slut', 'retard', 'retarded',
];

// ----- English Profanity (Medium Severity - Flag) -----
const EN_PROFANITY_MEDIUM = [
  'ass', 'arse', 'arsehole', 'damn', 'dammit', 'goddamn',
  'crap', 'piss', 'pissed', 'bollocks', 'wanker', 'tosser',
  'jerk', 'idiot', 'moron', 'dumb', 'stupid',
];

// ----- English Sexual (High Severity - Reject) -----
const EN_SEXUAL_HIGH = [
  'blowjob', 'blow job', 'handjob', 'hand job', 'footjob',
  'gangbang', 'gang bang', 'threesome', 'orgy',
  'anal', 'anus', 'rectum', 'sodomy', 'sodomize',
  'cum', 'cumshot', 'cumming', 'creampie', 'bukkake',
  'pussy', 'vagina', 'clitoris', 'clit', 'vulva',
  'penis', 'testicle', 'scrotum', 'erection', 'boner',
  'masturbat', 'jerk off', 'jack off', 'wank',
  'porn', 'porno', 'pornography', 'xxx', 'nsfw',
  'dildo', 'vibrator', 'sex toy',
  'hentai', 'ecchi', 'futanari', 'lolita', 'shota',
  'incest', 'rape', 'raping', 'rapist',
  'pedophile', 'paedophile', 'child porn', 'cp',
  'bdsm', 'bondage', 'dominatrix', 'femdom',
  'escort', 'hooker', 'prostitut',
];

// ----- English Harassment/Discrimination (High Severity - Reject) -----
const EN_HARASSMENT_HIGH = [
  'kill yourself', 'kys', 'go die', 'hope you die',
  'i will kill', 'gonna kill', 'murder you',
  'white power', 'white supremac', 'nazi', 'neonazi', 'swastika',
  'kike', 'spic', 'wetback', 'beaner', 'chink', 'gook', 'jap',
  'coon', 'darkie', 'towelhead', 'raghead', 'paki',
  'tranny', 'shemale', 'homo', 'dyke', 'lesbo',
];

// ----- Chinese Profanity (High Severity - Reject) -----
const ZH_PROFANITY_HIGH = [
  '傻逼', '煞笔', '傻B', 'SB', '智障', '弱智', '脑残',
  '操你妈', '草你妈', '日你妈', '干你妈', '肏',
  '妈的', '他妈的', 'TMD', '卧槽', 'WC', '我操',
  '婊子', '贱人', '贱货', '骚货', '臭婊子',
  '王八蛋', '混蛋', '狗杂种', '杂种', '畜生',
  '滚蛋', '滚犊子', '去死', '死全家',
  '狗娘养', '狗日的', '狗逼', '狗屎',
];

// ----- Chinese Profanity (Medium Severity - Flag) -----
const ZH_PROFANITY_MEDIUM = [
  '笨蛋', '蠢货', '白痴', '废物', '垃圾',
  '二货', '二逼', '沙雕', '傻叉',
  '屁话', '放屁', '扯淡', '胡说八道',
  '神经病', '变态', '恶心', '讨厌',
];

// ----- Chinese Sexual (High Severity - Reject) -----
const ZH_SEXUAL_HIGH = [
  '做爱', '性交', '交配', '上床', '睡觉吗',
  '操逼', '草逼', '干逼', '插逼',
  '阴茎', '阴道', '阴蒂', '阴部', '生殖器',
  '鸡巴', 'JB', '屌', '鸡鸡', '肉棒',
  '奶子', '奶头', '乳头', '胸部', '巨乳',
  '射精', '高潮', '潮吹', '自慰', '手淫', '打飞机',
  '口交', '肛交', '足交', '乳交',
  '色情', '黄片', 'AV', '成人片', '毛片',
  '一夜情', '约炮', '援交', '卖淫', '嫖娼',
  '三级片', 'H漫', '黄图', '裸照',
  '强奸', '轮奸', '迷奸', '性侵',
  '恋童', '幼女', '萝莉控', '正太控',
];

// ----- Chinese Political (High Severity - Reject) -----
// Note: This category can be disabled for overseas operations
const ZH_POLITICAL_HIGH = [
  // Historical events
  '六四', '天安门事件', '六四事件', '八九民运', '坦克人',
  '文化大革命', '文革', '红卫兵',
  '大跃进', '三年困难', '大饥荒',
  // Separatism
  '台独', '藏独', '疆独', '港独',
  '分裂国家', '颠覆政权',
  // Sensitive organizations
  '法轮功', 'FLG', '轮子', '大法好',
  // Leaders (avoid criticism)
  '习近平', '包子', '刁近平', '小熊维尼',
  '毛泽东', '毛贼', '腊肉',
  // Sensitive terms
  '共匪', '土共', '中共邪恶',
  '独裁', '专制政府', '暴政',
  '翻墙', 'VPN', '科学上网',
  '敏感词', '和谐社会', '维稳',
];

// ----- Chinese Political (Medium Severity - Flag) -----
const ZH_POLITICAL_MEDIUM = [
  // General political terms that might need review
  '民主', '自由', '人权', '维权',
  '抗议', '游行', '示威', '罢工',
  '言论自由', '新闻自由', '网络审查',
  '反华', '辱华', '卖国',
];

// ----- Chinese Harassment (High Severity - Reject) -----
const ZH_HARASSMENT_HIGH = [
  '杀了你', '弄死你', '打死你', '搞死你',
  '自杀吧', '去死吧', '死全家', '全家死光',
  '人渣', '败类', '废物点心', '社会败类',
  '地域歧视', '外地人滚', '乡巴佬',
  '黑鬼', '白皮猪', '棒子', '小日本鬼子',
];

// ----- Japanese Profanity (High Severity - Reject) -----
const JA_PROFANITY_HIGH = [
  '死ね', '殺す', '殺すぞ', '殺してやる',
  'くたばれ', 'ころす', 'しね',
  'きちがい', '気違い', '基地外',
  'クズ', '屑', 'ゴミ', 'カス',
];

// ----- Japanese Profanity (Medium Severity - Flag) -----
const JA_PROFANITY_MEDIUM = [
  'くそ', 'クソ', '糞', 'ウンコ',
  'バカ', '馬鹿', 'ばか', 'アホ', '阿呆',
  'ブス', '不細工', 'デブ', 'ハゲ',
  'うざい', 'きもい', 'キモい', 'キモイ',
];

// ----- Japanese Sexual (High Severity - Reject) -----
const JA_SEXUAL_HIGH = [
  'セックス', 'SEX', 'エッチ', 'えっち',
  'オナニー', 'おなにー', '自慰',
  'フェラ', 'フェラチオ', '口内射精',
  '中出し', '顔射', 'ぶっかけ',
  'おっぱい', '巨乳', '貧乳', '乳首',
  'チンコ', 'ちんこ', '陰茎', 'おちんちん',
  'マンコ', 'まんこ', '陰部', 'おまんこ',
  'AV女優', '風俗', 'ソープ', 'デリヘル',
  '援助交際', '援交', 'パパ活',
  'ロリコン', 'ショタコン', '幼女',
  '痴漢', 'レイプ', '強姦', '輪姦',
  'SM', '緊縛', '調教',
  '無修正', 'アダルト', 'ポルノ', 'エロ動画',
];

// ----- Japanese Harassment (High Severity - Reject) -----
const JA_HARASSMENT_HIGH = [
  '自殺しろ', '死んでくれ', '消えろ',
  '在日', 'チョン', 'シナ人', '支那',
  '部落', '穢多', '非人',
  '障害者', 'ガイジ', '池沼',
  'キモオタ', 'ヒキニート', 'こどおじ',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildRegexPattern(words: string[]): string {
  // Escape special regex characters and join with |
  return words
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
}

export async function seedBlocklistEntries(prisma: PrismaClient) {
  console.log('  → Seeding blocklist entries...');

  const blocklistEntries: BlocklistEntryData[] = [
    // ========================================
    // CRITICAL SAFETY RULES (isForceUse=true)
    // These cannot be disabled by lower levels
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern([
        ...EN_HARASSMENT_HIGH.filter((w) =>
          ['kill yourself', 'kys', 'go die', 'hope you die', 'i will kill', 'gonna kill', 'murder you'].includes(w)
        ),
        '去死', '自杀', '弄死', '杀了',
        '死ね', '殺す', '自殺しろ',
      ]),
      patternType: 'regex',
      nameEn: 'Death threats / Self-harm (All Languages)',
      nameZh: '死亡威胁/自残相关（全语言）',
      nameJa: '殺害予告・自傷関連（全言語）',
      category: 'safety',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 10,
      isForceUse: true,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern([
        'child porn', 'cp', 'pedo', 'pedophile', 'paedophile', 'lolita', 'shota',
        '儿童色情', '幼女', '萝莉控', '正太控', '恋童',
        'ロリコン', 'ショタコン', '幼女', '児童ポルノ',
      ]),
      patternType: 'regex',
      nameEn: 'Child exploitation content (All Languages)',
      nameZh: '儿童相关违法内容（全语言）',
      nameJa: '児童関連違法コンテンツ（全言語）',
      category: 'illegal',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 11,
      isForceUse: true,
      isSystem: true,
    },

    // ========================================
    // ENGLISH PROFANITY RULES
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(EN_PROFANITY_HIGH),
      patternType: 'regex',
      nameEn: 'English profanity - Severe',
      nameZh: '英文脏话 - 严重',
      nameJa: '英語罵倒語 - 重度',
      category: 'profanity',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 100,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(EN_PROFANITY_MEDIUM),
      patternType: 'regex',
      nameEn: 'English profanity - Moderate',
      nameZh: '英文脏话 - 中度',
      nameJa: '英語罵倒語 - 中度',
      category: 'profanity',
      severity: 'medium',
      action: 'flag',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 101,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // ENGLISH SEXUAL CONTENT RULES
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(EN_SEXUAL_HIGH),
      patternType: 'regex',
      nameEn: 'English sexual content',
      nameZh: '英文性相关内容',
      nameJa: '英語性的コンテンツ',
      category: 'sexual',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 110,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // ENGLISH HARASSMENT RULES
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(EN_HARASSMENT_HIGH),
      patternType: 'regex',
      nameEn: 'English harassment / discrimination',
      nameZh: '英文骚扰/歧视内容',
      nameJa: '英語ハラスメント・差別',
      category: 'harassment',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 120,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // CHINESE PROFANITY RULES
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(ZH_PROFANITY_HIGH),
      patternType: 'regex',
      nameEn: 'Chinese profanity - Severe',
      nameZh: '中文脏话 - 严重',
      nameJa: '中国語罵倒語 - 重度',
      category: 'profanity',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 200,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(ZH_PROFANITY_MEDIUM),
      patternType: 'regex',
      nameEn: 'Chinese profanity - Moderate',
      nameZh: '中文脏话 - 中度',
      nameJa: '中国語罵倒語 - 中度',
      category: 'profanity',
      severity: 'medium',
      action: 'flag',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 201,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // CHINESE SEXUAL CONTENT RULES
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(ZH_SEXUAL_HIGH),
      patternType: 'regex',
      nameEn: 'Chinese sexual content',
      nameZh: '中文性相关内容',
      nameJa: '中国語性的コンテンツ',
      category: 'sexual',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 210,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // CHINESE POLITICAL RULES
    // Note: Can be disabled for overseas operations
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(ZH_POLITICAL_HIGH),
      patternType: 'regex',
      nameEn: 'Chinese political sensitive - Critical',
      nameZh: '中文政治敏感词 - 严重',
      nameJa: '中国語政治敏感語 - 重度',
      category: 'political',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 220,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(ZH_POLITICAL_MEDIUM),
      patternType: 'regex',
      nameEn: 'Chinese political sensitive - Review',
      nameZh: '中文政治敏感词 - 待审核',
      nameJa: '中国語政治敏感語 - 要審査',
      category: 'political',
      severity: 'medium',
      action: 'flag',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 221,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // CHINESE HARASSMENT RULES
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(ZH_HARASSMENT_HIGH),
      patternType: 'regex',
      nameEn: 'Chinese harassment / discrimination',
      nameZh: '中文骚扰/歧视内容',
      nameJa: '中国語ハラスメント・差別',
      category: 'harassment',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 230,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // JAPANESE PROFANITY RULES
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(JA_PROFANITY_HIGH),
      patternType: 'regex',
      nameEn: 'Japanese profanity - Severe',
      nameZh: '日语脏话 - 严重',
      nameJa: '日本語罵倒語 - 重度',
      category: 'profanity',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 300,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(JA_PROFANITY_MEDIUM),
      patternType: 'regex',
      nameEn: 'Japanese profanity - Moderate',
      nameZh: '日语脏话 - 中度',
      nameJa: '日本語罵倒語 - 中度',
      category: 'profanity',
      severity: 'medium',
      action: 'flag',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 301,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // JAPANESE SEXUAL CONTENT RULES
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(JA_SEXUAL_HIGH),
      patternType: 'regex',
      nameEn: 'Japanese sexual content',
      nameZh: '日语性相关内容',
      nameJa: '日本語性的コンテンツ',
      category: 'sexual',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 310,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // JAPANESE HARASSMENT RULES
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern(JA_HARASSMENT_HIGH),
      patternType: 'regex',
      nameEn: 'Japanese harassment / discrimination',
      nameZh: '日语骚扰/歧视内容',
      nameJa: '日本語ハラスメント・差別',
      category: 'harassment',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 320,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // SPAM & PRIVACY PATTERNS (All Languages)
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: 'http[s]?://[\\S]+',
      patternType: 'regex',
      nameEn: 'URL pattern',
      nameZh: '链接模式',
      nameJa: 'URL パターン',
      category: 'spam',
      severity: 'medium',
      action: 'flag',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 400,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern([
        '微信', 'wechat', 'weixin', '加我', '联系方式', '私联', 'QQ号', '加好友',
      ]),
      patternType: 'regex',
      nameEn: 'Contact solicitation - Chinese',
      nameZh: '联系方式钓鱼 - 中文',
      nameJa: '連絡先誘導 - 中国語',
      category: 'spam',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 401,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern([
        'LINE', 'ライン', '連絡先', 'DM送って', 'DMして', 'フォローして',
      ]),
      patternType: 'regex',
      nameEn: 'Contact solicitation - Japanese',
      nameZh: '联系方式钓鱼 - 日语',
      nameJa: '連絡先誘導 - 日本語',
      category: 'spam',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 402,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern([
        'add me', 'dm me', 'message me', 'contact me', 'hit me up', 'hmu',
        'my discord', 'my twitter', 'my instagram', 'my snapchat',
      ]),
      patternType: 'regex',
      nameEn: 'Contact solicitation - English',
      nameZh: '联系方式钓鱼 - 英文',
      nameJa: '連絡先誘導 - 英語',
      category: 'spam',
      severity: 'medium',
      action: 'flag',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 403,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: '\\d{3}[-.]?\\d{4}[-.]?\\d{4}',
      patternType: 'regex',
      nameEn: 'Phone number pattern',
      nameZh: '电话号码模式',
      nameJa: '電話番号パターン',
      category: 'privacy',
      severity: 'medium',
      action: 'flag',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 410,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
      patternType: 'regex',
      nameEn: 'Email pattern',
      nameZh: '邮箱模式',
      nameJa: 'メールアドレスパターン',
      category: 'privacy',
      severity: 'medium',
      action: 'flag',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 411,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // ILLEGAL CONTENT (All Languages)
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern([
        '赌博', '博彩', '网赌', '赌场', '老虎机',
        'gambling', 'casino', 'bet365', 'poker',
        'パチンコ', '競馬', '競艇', 'カジノ', '賭博',
      ]),
      patternType: 'regex',
      nameEn: 'Gambling keywords (All Languages)',
      nameZh: '赌博关键词（全语言）',
      nameJa: 'ギャンブル関連（全言語）',
      category: 'illegal',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 500,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: buildRegexPattern([
        '毒品', '冰毒', '海洛因', '大麻', '可卡因', 'K粉',
        'cocaine', 'heroin', 'meth', 'weed', 'marijuana', 'drug dealer',
        '覚醒剤', 'シャブ', 'ヘロイン', 'コカイン', '大麻',
      ]),
      patternType: 'regex',
      nameEn: 'Drug keywords (All Languages)',
      nameZh: '毒品关键词（全语言）',
      nameJa: '薬物関連（全言語）',
      category: 'illegal',
      severity: 'high',
      action: 'reject',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 501,
      isForceUse: false,
      isSystem: true,
    },

    // ========================================
    // BEHAVIOR PATTERNS
    // ========================================
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: '(.)\\1{9,}',
      patternType: 'regex',
      nameEn: 'Repeated characters (10+)',
      nameZh: '重复字符 (10+)',
      nameJa: '繰り返し文字 (10+)',
      category: 'spam',
      severity: 'low',
      action: 'flag',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 600,
      isForceUse: false,
      isSystem: true,
    },
    {
      ownerType: 'tenant',
      ownerId: null,
      pattern: '^[A-Z\\s]{20,}$',
      patternType: 'regex',
      nameEn: 'All caps message (shouting)',
      nameZh: '全大写消息（吼叫）',
      nameJa: '全角大文字メッセージ',
      category: 'behavior',
      severity: 'low',
      action: 'flag',
      scope: ['marshmallow'],
      inherit: true,
      sortOrder: 601,
      isForceUse: false,
      isSystem: true,
    },
  ];

  // Use upsert pattern to create or update entries
  let created = 0;
  let updated = 0;

  for (const entry of blocklistEntries) {
    // Check if entry exists by pattern
    const existing = await prisma.blocklistEntry.findFirst({
      where: {
        ownerType: entry.ownerType,
        ownerId: entry.ownerId,
        pattern: entry.pattern,
      },
    });

    if (existing) {
      await prisma.blocklistEntry.update({
        where: { id: existing.id },
        data: {
          patternType: entry.patternType,
          nameEn: entry.nameEn,
          nameZh: entry.nameZh,
          nameJa: entry.nameJa,
          category: entry.category,
          severity: entry.severity,
          action: entry.action,
          scope: entry.scope,
          inherit: entry.inherit,
          sortOrder: entry.sortOrder,
          isForceUse: entry.isForceUse,
          isSystem: entry.isSystem,
        },
      });
      updated++;
    } else {
      await prisma.blocklistEntry.create({
        data: {
          ownerType: entry.ownerType,
          ownerId: entry.ownerId,
          pattern: entry.pattern,
          patternType: entry.patternType,
          nameEn: entry.nameEn,
          nameZh: entry.nameZh,
          nameJa: entry.nameJa,
          category: entry.category,
          severity: entry.severity,
          action: entry.action,
          scope: entry.scope,
          inherit: entry.inherit,
          sortOrder: entry.sortOrder,
          isForceUse: entry.isForceUse,
          isSystem: entry.isSystem,
          matchCount: 0,
        },
      });
      created++;
    }
  }

  console.log(`    ✓ Blocklist entries: ${created} created, ${updated} updated`);
}
