// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ProfanityEntry, ProfanitySeverity } from '../data/profanity-wordlist';

export interface FilterResult {
  passed: boolean;
  action: 'allow' | 'reject' | 'flag';
  flags: string[];
  matchedPatterns: string[];
  filteredContent?: string;
  score: ContentScore;
}

export interface FilterOptions {
  profanityFilterEnabled: boolean;
  externalBlocklistEnabled: boolean;
}

export interface ContentScore {
  score: number;
  category: 'safe' | 'suspicious' | 'harmful';
  factors: ScoreFactor[];
}

export interface ScoreFactor {
  type: string;
  weight: number;
  details?: string;
}

export interface ExternalPattern {
  id: string;
  pattern: string;
  patternType: 'domain' | 'url_regex' | 'keyword';
  action: 'reject' | 'flag' | 'replace';
  replacement: string | null;
  severity?: string;
}

export interface CustomBlocklistPattern {
  pattern: string;
  patternType: 'keyword' | 'regex' | 'wildcard';
  action: 'allow' | 'reject' | 'flag';
  severity: string;
}

const SCORE_WEIGHTS = {
  profanity_high: 40,
  profanity_medium: 25,
  profanity_low: 10,
  threat_keyword: 50,
  external_blocklist_high: 35,
  external_blocklist_medium: 25,
  external_blocklist_low: 15,
  blocklist_match: 30,
  behavior_pattern: 15,
  homoglyph_detected: 20,
  leetspeak_detected: 15,
  zero_width_detected: 25,
  evasion_technique: 20,
} as const;

const SCORE_THRESHOLDS = {
  safe: 20,
  suspicious: 50,
  harmful: 100,
} as const;

export function checkProfanityWordlist(
  profanityWords: ProfanityEntry[],
  normalizedContent: string,
): {
  matched: boolean;
  flags: string[];
  patterns: string[];
  scoreFactors: ScoreFactor[];
  action: 'allow' | 'reject' | 'flag';
} {
  const flags: string[] = [];
  const patterns: string[] = [];
  const scoreFactors: ScoreFactor[] = [];
  let highestSeverity: ProfanitySeverity = 'low';

  for (const entry of profanityWords) {
    const regex = new RegExp(`\\b${escapeFilterRegex(entry.word.toLowerCase())}\\b`, 'gi');

    if (!regex.test(normalizedContent)) {
      continue;
    }

    flags.push(`profanity:${entry.severity}:${entry.word}`);
    patterns.push(entry.word);

    const weightKey = `profanity_${entry.severity}` as keyof typeof SCORE_WEIGHTS;
    scoreFactors.push({
      type: weightKey,
      weight: SCORE_WEIGHTS[weightKey],
      details: `Matched: ${entry.word} (${entry.category || 'general'})`,
    });

    if (entry.severity === 'high') {
      highestSeverity = 'high';
    } else if (entry.severity === 'medium' && highestSeverity !== 'high') {
      highestSeverity = 'medium';
    }
  }

  if (patterns.length === 0) {
    return { matched: false, flags: [], patterns: [], scoreFactors: [], action: 'allow' };
  }

  const action = highestSeverity === 'high' ? 'reject' : 'flag';
  return { matched: true, flags, patterns, scoreFactors, action };
}

export function checkThreatKeywords(
  threatKeywords: ProfanityEntry[],
  normalizedContent: string,
): {
  matched: boolean;
  flags: string[];
  patterns: string[];
  scoreFactors: ScoreFactor[];
  action: 'allow' | 'reject' | 'flag';
} {
  const flags: string[] = [];
  const patterns: string[] = [];
  const scoreFactors: ScoreFactor[] = [];

  for (const entry of threatKeywords) {
    const regex = new RegExp(`\\b${escapeFilterRegex(entry.word.toLowerCase())}\\b`, 'gi');

    if (!regex.test(normalizedContent)) {
      continue;
    }

    flags.push(`threat:${entry.severity}:${entry.word}`);
    patterns.push(entry.word);
    scoreFactors.push({
      type: 'threat_keyword',
      weight: SCORE_WEIGHTS.threat_keyword,
      details: `Threat keyword: ${entry.word}`,
    });
  }

  if (patterns.length === 0) {
    return { matched: false, flags: [], patterns: [], scoreFactors: [], action: 'allow' };
  }

  return { matched: true, flags, patterns, scoreFactors, action: 'flag' };
}

export function calculateContentScore(factors: ScoreFactor[]): ContentScore {
  const totalScore = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const normalizedScore = Math.min(100, totalScore);

  let category: 'safe' | 'suspicious' | 'harmful';
  if (normalizedScore <= SCORE_THRESHOLDS.safe) {
    category = 'safe';
  } else if (normalizedScore <= SCORE_THRESHOLDS.suspicious) {
    category = 'suspicious';
  } else {
    category = 'harmful';
  }

  return {
    score: normalizedScore,
    category,
    factors,
  };
}

export function matchExternalPatterns(
  content: string,
  externalPatterns: ExternalPattern[],
): {
  matched: boolean;
  flags: string[];
  patterns: string[];
  scoreFactors: ScoreFactor[];
  action: 'allow' | 'reject' | 'flag';
  filteredContent?: string;
} {
  const matched: Array<{
    pattern: string;
    action: 'reject' | 'flag' | 'replace';
    replacement: string | null;
    severity?: string;
  }> = [];

  for (const pattern of externalPatterns) {
    let isMatch = false;

    switch (pattern.patternType) {
      case 'domain': {
        const domainRegex = new RegExp(
          `https?://([a-z0-9-]+\\.)*${escapeFilterRegex(pattern.pattern)}(/|$|\\s|\\?|#)`,
          'gi',
        );
        isMatch = domainRegex.test(content);
        break;
      }
      case 'url_regex':
        try {
          isMatch = new RegExp(pattern.pattern, 'gi').test(content);
        } catch {
          isMatch = false;
        }
        break;
      case 'keyword':
        isMatch = content.toLowerCase().includes(pattern.pattern.toLowerCase());
        break;
    }

    if (isMatch) {
      matched.push({
        pattern: pattern.pattern,
        action: pattern.action,
        replacement: pattern.replacement,
        severity: pattern.severity,
      });
    }
  }

  if (matched.length === 0) {
    return { matched: false, flags: [], patterns: [], scoreFactors: [], action: 'allow' };
  }

  const actions = matched.map((item) => item.action);
  const finalAction = actions.includes('reject')
    ? 'reject'
    : actions.includes('flag')
    ? 'flag'
    : 'flag';

  const scoreFactors: ScoreFactor[] = matched.map((item) => {
    const severityKey =
      `external_blocklist_${item.severity || 'medium'}` as keyof typeof SCORE_WEIGHTS;
    const weight = SCORE_WEIGHTS[severityKey] || SCORE_WEIGHTS.external_blocklist_medium;
    return {
      type: severityKey,
      weight,
      details: `External blocklist: ${item.pattern}`,
    };
  });

  let filteredContent = content;
  if (finalAction !== 'reject') {
    for (const item of matched) {
      if (item.action === 'replace' && item.replacement) {
        filteredContent = filteredContent.replace(
          new RegExp(escapeFilterRegex(item.pattern), 'gi'),
          item.replacement,
        );
      }
    }
  }

  return {
    matched: true,
    flags: matched.map((item) => `external:${item.pattern}`),
    patterns: matched.map((item) => item.pattern),
    scoreFactors,
    action: finalAction,
    filteredContent,
  };
}

export function matchCustomBlocklist(
  content: string,
  entries: CustomBlocklistPattern[],
): {
  matched: boolean;
  flags: string[];
  patterns: string[];
  scoreFactors: ScoreFactor[];
  action: 'allow' | 'reject' | 'flag';
} {
  const matched: Array<{ pattern: string; action: string; severity: string }> = [];

  for (const entry of entries) {
    let isMatch = false;

    switch (entry.patternType) {
      case 'keyword':
        isMatch = content.toLowerCase().includes(entry.pattern.toLowerCase());
        break;
      case 'regex':
        try {
          isMatch = new RegExp(entry.pattern, 'gi').test(content);
        } catch {
          isMatch = false;
        }
        break;
      case 'wildcard':
        isMatch = new RegExp(
          entry.pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
          'gi',
        ).test(content);
        break;
    }

    if (isMatch) {
      matched.push({
        pattern: entry.pattern,
        action: entry.action,
        severity: entry.severity,
      });
    }
  }

  if (matched.length === 0) {
    return { matched: false, flags: [], patterns: [], scoreFactors: [], action: 'allow' };
  }

  const actions = matched.map((item) => item.action);
  const finalAction = actions.includes('reject')
    ? 'reject'
    : actions.includes('flag')
    ? 'flag'
    : 'flag';

  return {
    matched: true,
    flags: matched.map((item) => `blocklist:${item.pattern}`),
    patterns: matched.map((item) => item.pattern),
    scoreFactors: matched.map((item) => ({
      type: 'blocklist_match',
      weight: SCORE_WEIGHTS.blocklist_match,
      details: `Custom blocklist: ${item.pattern} (${item.severity})`,
    })),
    action: finalAction as 'allow' | 'reject' | 'flag',
  };
}

export function checkBehaviorPatterns(content: string): {
  suspicious: boolean;
  flags: string[];
  scoreFactors: ScoreFactor[];
} {
  const flags: string[] = [];
  const scoreFactors: ScoreFactor[] = [];

  if (content.length > 20 && content === content.toUpperCase()) {
    flags.push('behavior:all_caps');
    scoreFactors.push({
      type: 'behavior_pattern',
      weight: SCORE_WEIGHTS.behavior_pattern,
      details: 'All caps text',
    });
  }

  const specialCharCount = (content.match(/[!@#$%^&*()]/g) || []).length;
  if (content.length > 10 && specialCharCount / content.length > 0.3) {
    flags.push('behavior:excessive_special_chars');
    scoreFactors.push({
      type: 'behavior_pattern',
      weight: SCORE_WEIGHTS.behavior_pattern,
      details: 'Excessive special characters',
    });
  }

  if (/(.)\1{5,}/.test(content)) {
    flags.push('behavior:repeated_chars');
    scoreFactors.push({
      type: 'behavior_pattern',
      weight: SCORE_WEIGHTS.behavior_pattern,
      details: 'Repeated characters',
    });
  }

  const urlCount = (content.match(/https?:\/\//gi) || []).length;
  if (urlCount > 3) {
    flags.push('behavior:excessive_urls');
    scoreFactors.push({
      type: 'behavior_pattern',
      weight: SCORE_WEIGHTS.behavior_pattern * 2,
      details: `Excessive URLs (${urlCount})`,
    });
  }

  const punctuationCount = (content.match(/[!?]{3,}/g) || []).length;
  if (punctuationCount > 2) {
    flags.push('behavior:excessive_punctuation');
    scoreFactors.push({
      type: 'behavior_pattern',
      weight: SCORE_WEIGHTS.behavior_pattern,
      details: 'Excessive punctuation',
    });
  }

  const words = content.toLowerCase().split(/\s+/);
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    if (word.length > 3) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }
  const maxRepeat = Math.max(...Array.from(wordCounts.values()), 0);
  if (maxRepeat > 5 && words.length > 10) {
    flags.push('behavior:repeated_words');
    scoreFactors.push({
      type: 'behavior_pattern',
      weight: SCORE_WEIGHTS.behavior_pattern,
      details: 'Repeated words',
    });
  }

  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiMatches = content.match(emojiPattern) || [];
  const textWithoutEmoji = content.replace(emojiPattern, '').replace(/\s/g, '');
  if (emojiMatches.length > 10 && textWithoutEmoji.length < 10) {
    flags.push('behavior:emoji_spam');
    scoreFactors.push({
      type: 'behavior_pattern',
      weight: SCORE_WEIGHTS.behavior_pattern,
      details: 'Emoji spam',
    });
  }

  return {
    suspicious: flags.length > 0,
    flags,
    scoreFactors,
  };
}

export function escapeFilterRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escalateFilterAction(
  current: 'allow' | 'reject' | 'flag',
  incoming: 'allow' | 'reject' | 'flag',
): 'allow' | 'reject' | 'flag' {
  const priority = { allow: 0, flag: 1, reject: 2 };
  return priority[incoming] > priority[current] ? incoming : current;
}
