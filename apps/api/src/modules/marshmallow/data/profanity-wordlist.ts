// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Multi-language Profanity Wordlist
 *
 * This file contains common profanity, slurs, and offensive terms in multiple languages.
 * Words are categorized by severity:
 * - high: Severe slurs, hate speech, explicit content
 * - medium: Moderate profanity, insults
 * - low: Mild profanity, borderline content
 *
 * NOTE: This list is for content moderation purposes only.
 * The words are hashed/obfuscated in production builds.
 */

export type ProfanitySeverity = 'high' | 'medium' | 'low';

export interface ProfanityEntry {
  word: string;
  severity: ProfanitySeverity;
  category?: string;
}

// =============================================================================
// English Profanity
// =============================================================================

export const PROFANITY_EN: ProfanityEntry[] = [
  // High severity - Severe slurs and explicit content
  { word: 'fuck', severity: 'high', category: 'explicit' },
  { word: 'fucker', severity: 'high', category: 'explicit' },
  { word: 'fucking', severity: 'high', category: 'explicit' },
  { word: 'motherfucker', severity: 'high', category: 'explicit' },
  { word: 'cunt', severity: 'high', category: 'explicit' },
  { word: 'nigger', severity: 'high', category: 'slur' },
  { word: 'nigga', severity: 'high', category: 'slur' },
  { word: 'faggot', severity: 'high', category: 'slur' },
  { word: 'fag', severity: 'high', category: 'slur' },
  { word: 'retard', severity: 'high', category: 'slur' },
  { word: 'kike', severity: 'high', category: 'slur' },
  { word: 'chink', severity: 'high', category: 'slur' },
  { word: 'gook', severity: 'high', category: 'slur' },
  { word: 'spic', severity: 'high', category: 'slur' },
  { word: 'wetback', severity: 'high', category: 'slur' },

  // Medium severity - Moderate profanity
  { word: 'shit', severity: 'medium', category: 'profanity' },
  { word: 'shitty', severity: 'medium', category: 'profanity' },
  { word: 'bullshit', severity: 'medium', category: 'profanity' },
  { word: 'asshole', severity: 'medium', category: 'profanity' },
  { word: 'bitch', severity: 'medium', category: 'profanity' },
  { word: 'bastard', severity: 'medium', category: 'profanity' },
  { word: 'dick', severity: 'medium', category: 'profanity' },
  { word: 'dickhead', severity: 'medium', category: 'profanity' },
  { word: 'cock', severity: 'medium', category: 'profanity' },
  { word: 'pussy', severity: 'medium', category: 'profanity' },
  { word: 'whore', severity: 'medium', category: 'profanity' },
  { word: 'slut', severity: 'medium', category: 'profanity' },
  { word: 'piss', severity: 'medium', category: 'profanity' },
  { word: 'pissed', severity: 'medium', category: 'profanity' },

  // Low severity - Mild profanity
  { word: 'damn', severity: 'low', category: 'mild' },
  { word: 'crap', severity: 'low', category: 'mild' },
  { word: 'hell', severity: 'low', category: 'mild' },
  { word: 'ass', severity: 'low', category: 'mild' },
  { word: 'idiot', severity: 'low', category: 'insult' },
  { word: 'stupid', severity: 'low', category: 'insult' },
  { word: 'dumb', severity: 'low', category: 'insult' },
  { word: 'moron', severity: 'low', category: 'insult' },
  { word: 'jerk', severity: 'low', category: 'insult' },
  { word: 'loser', severity: 'low', category: 'insult' },
];

// =============================================================================
// Chinese Profanity (Simplified & Traditional)
// =============================================================================

export const PROFANITY_ZH: ProfanityEntry[] = [
  // High severity
  { word: '傻逼', severity: 'high', category: 'explicit' },
  { word: '傻屄', severity: 'high', category: 'explicit' },
  { word: '操你妈', severity: 'high', category: 'explicit' },
  { word: '操你', severity: 'high', category: 'explicit' },
  { word: '肏', severity: 'high', category: 'explicit' },
  { word: '艹', severity: 'high', category: 'explicit' },
  { word: '草泥马', severity: 'high', category: 'explicit' },
  { word: '我操', severity: 'high', category: 'explicit' },
  { word: '他妈的', severity: 'high', category: 'explicit' },
  { word: '你妈的', severity: 'high', category: 'explicit' },
  { word: '妈逼', severity: 'high', category: 'explicit' },
  { word: '马勒戈壁', severity: 'high', category: 'explicit' },
  { word: '狗日的', severity: 'high', category: 'explicit' },
  { word: '日你', severity: 'high', category: 'explicit' },
  { word: '贱人', severity: 'high', category: 'slur' },
  { word: '婊子', severity: 'high', category: 'slur' },
  { word: '鸡巴', severity: 'high', category: 'explicit' },
  { word: '屌', severity: 'high', category: 'explicit' },
  { word: '逼', severity: 'high', category: 'explicit' },
  { word: '屄', severity: 'high', category: 'explicit' },

  // Medium severity
  { word: '去死', severity: 'medium', category: 'threat' },
  { word: '滚蛋', severity: 'medium', category: 'profanity' },
  { word: '滚开', severity: 'medium', category: 'profanity' },
  { word: '混蛋', severity: 'medium', category: 'profanity' },
  { word: '王八蛋', severity: 'medium', category: 'profanity' },
  { word: '狗屎', severity: 'medium', category: 'profanity' },
  { word: '废物', severity: 'medium', category: 'insult' },
  { word: '垃圾', severity: 'medium', category: 'insult' },
  { word: '蠢货', severity: 'medium', category: 'insult' },
  { word: '蠢猪', severity: 'medium', category: 'insult' },
  { word: '畜生', severity: 'medium', category: 'insult' },
  { word: '猪头', severity: 'medium', category: 'insult' },
  { word: '狗东西', severity: 'medium', category: 'insult' },
  { word: '死全家', severity: 'medium', category: 'threat' },
  { word: '脑残', severity: 'medium', category: 'insult' },
  { word: '智障', severity: 'medium', category: 'slur' },

  // Low severity
  { word: '笨蛋', severity: 'low', category: 'insult' },
  { word: '白痴', severity: 'low', category: 'insult' },
  { word: '傻瓜', severity: 'low', category: 'insult' },
  { word: '弱智', severity: 'low', category: 'insult' },
  { word: '讨厌', severity: 'low', category: 'mild' },
  { word: '可恶', severity: 'low', category: 'mild' },
  { word: '该死', severity: 'low', category: 'mild' },
  { word: '变态', severity: 'low', category: 'insult' },
  { word: '神经病', severity: 'low', category: 'insult' },
  { word: '有病', severity: 'low', category: 'insult' },
];

// =============================================================================
// Japanese Profanity
// =============================================================================

export const PROFANITY_JA: ProfanityEntry[] = [
  // High severity
  { word: '死ね', severity: 'high', category: 'threat' },
  { word: 'くたばれ', severity: 'high', category: 'threat' },
  { word: '殺す', severity: 'high', category: 'threat' },
  { word: 'ファック', severity: 'high', category: 'explicit' },
  { word: 'セックス', severity: 'high', category: 'explicit' },
  { word: 'ちんこ', severity: 'high', category: 'explicit' },
  { word: 'まんこ', severity: 'high', category: 'explicit' },
  { word: 'おまんこ', severity: 'high', category: 'explicit' },
  { word: 'ちんぽ', severity: 'high', category: 'explicit' },
  { word: 'きちがい', severity: 'high', category: 'slur' },
  { word: '在日', severity: 'high', category: 'slur' },
  { word: 'チョン', severity: 'high', category: 'slur' },
  { word: '部落', severity: 'high', category: 'slur' },

  // Medium severity
  { word: 'クソ', severity: 'medium', category: 'profanity' },
  { word: 'くそ', severity: 'medium', category: 'profanity' },
  { word: '糞', severity: 'medium', category: 'profanity' },
  { word: 'うんこ', severity: 'medium', category: 'profanity' },
  { word: 'うざい', severity: 'medium', category: 'insult' },
  { word: 'ウザい', severity: 'medium', category: 'insult' },
  { word: 'きもい', severity: 'medium', category: 'insult' },
  { word: 'キモい', severity: 'medium', category: 'insult' },
  { word: '気持ち悪い', severity: 'medium', category: 'insult' },
  { word: 'ゴミ', severity: 'medium', category: 'insult' },
  { word: 'カス', severity: 'medium', category: 'insult' },
  { word: 'クズ', severity: 'medium', category: 'insult' },
  { word: '消えろ', severity: 'medium', category: 'threat' },
  { word: '失せろ', severity: 'medium', category: 'threat' },
  { word: 'ブス', severity: 'medium', category: 'insult' },
  { word: 'デブ', severity: 'medium', category: 'insult' },
  { word: 'ハゲ', severity: 'medium', category: 'insult' },
  { word: 'クソガキ', severity: 'medium', category: 'insult' },

  // Low severity
  { word: 'バカ', severity: 'low', category: 'insult' },
  { word: 'ばか', severity: 'low', category: 'insult' },
  { word: '馬鹿', severity: 'low', category: 'insult' },
  { word: 'アホ', severity: 'low', category: 'insult' },
  { word: 'あほ', severity: 'low', category: 'insult' },
  { word: '阿呆', severity: 'low', category: 'insult' },
  { word: 'まぬけ', severity: 'low', category: 'insult' },
  { word: '間抜け', severity: 'low', category: 'insult' },
  { word: 'のろま', severity: 'low', category: 'insult' },
  { word: 'ダサい', severity: 'low', category: 'mild' },
  { word: 'むかつく', severity: 'low', category: 'mild' },
  { word: 'ムカつく', severity: 'low', category: 'mild' },
  { word: 'うるさい', severity: 'low', category: 'mild' },
  { word: '黙れ', severity: 'low', category: 'mild' },
];

// =============================================================================
// Combined Wordlist
// =============================================================================

export interface ProfanityWordlist {
  en: ProfanityEntry[];
  zh: ProfanityEntry[];
  ja: ProfanityEntry[];
}

export const PROFANITY_WORDLIST: ProfanityWordlist = {
  en: PROFANITY_EN,
  zh: PROFANITY_ZH,
  ja: PROFANITY_JA,
};

/**
 * Get all words as a flat array
 */
export function getAllProfanityWords(): ProfanityEntry[] {
  return [...PROFANITY_EN, ...PROFANITY_ZH, ...PROFANITY_JA];
}

/**
 * Get words by severity
 */
export function getProfanityBySeverity(severity: ProfanitySeverity): ProfanityEntry[] {
  return getAllProfanityWords().filter(entry => entry.severity === severity);
}

/**
 * Get words by language
 */
export function getProfanityByLanguage(lang: 'en' | 'zh' | 'ja'): ProfanityEntry[] {
  return PROFANITY_WORDLIST[lang];
}

/**
 * Check if a word exists in the wordlist
 */
export function isProfanity(word: string): { found: boolean; entry?: ProfanityEntry } {
  const normalized = word.toLowerCase().trim();
  const all = getAllProfanityWords();
  const entry = all.find(e => e.word.toLowerCase() === normalized);
  return { found: !!entry, entry };
}

// =============================================================================
// Threat/Violence Keywords (Cross-language)
// =============================================================================

export const THREAT_KEYWORDS: ProfanityEntry[] = [
  // English
  { word: 'kill', severity: 'high', category: 'threat' },
  { word: 'murder', severity: 'high', category: 'threat' },
  { word: 'suicide', severity: 'high', category: 'threat' },
  { word: 'bomb', severity: 'high', category: 'threat' },
  { word: 'terrorist', severity: 'high', category: 'threat' },
  { word: 'shoot', severity: 'medium', category: 'threat' },
  { word: 'stab', severity: 'medium', category: 'threat' },
  { word: 'attack', severity: 'low', category: 'threat' },

  // Chinese
  { word: '杀', severity: 'high', category: 'threat' },
  { word: '杀死', severity: 'high', category: 'threat' },
  { word: '自杀', severity: 'high', category: 'threat' },
  { word: '炸弹', severity: 'high', category: 'threat' },
  { word: '恐怖分子', severity: 'high', category: 'threat' },

  // Japanese
  { word: '殺す', severity: 'high', category: 'threat' },
  { word: '殺害', severity: 'high', category: 'threat' },
  { word: '自殺', severity: 'high', category: 'threat' },
  { word: '爆弾', severity: 'high', category: 'threat' },
  { word: 'テロ', severity: 'high', category: 'threat' },
];

/**
 * Get all threat keywords
 */
export function getThreatKeywords(): ProfanityEntry[] {
  return THREAT_KEYWORDS;
}
