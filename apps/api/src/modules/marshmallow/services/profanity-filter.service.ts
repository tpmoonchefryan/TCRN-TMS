// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database';
import { RedisService } from '../../redis';
import {
  getAllProfanityWords,
  getThreatKeywords,
  ProfanityEntry,
  ProfanitySeverity,
} from '../data/profanity-wordlist';
import { detectEvasionTechniques,TextNormalizer } from '../utils/text-normalizer';

// =============================================================================
// Types and Interfaces
// =============================================================================

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
  score: number;        // 0-100
  category: 'safe' | 'suspicious' | 'harmful';
  factors: ScoreFactor[];
}

export interface ScoreFactor {
  type: string;
  weight: number;
  details?: string;
}

interface ExternalPattern {
  id: string;
  pattern: string;
  patternType: 'domain' | 'url_regex' | 'keyword';
  action: 'reject' | 'flag' | 'replace';
  replacement: string | null;
  severity?: string;
}

// Score weights for different detection types
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
};

// Score thresholds for categorization
const SCORE_THRESHOLDS = {
  safe: 20,        // 0-20 = safe
  suspicious: 50,  // 21-50 = suspicious
  harmful: 100,    // 51+ = harmful
};

@Injectable()
export class ProfanityFilterService {
  private readonly logger = new Logger(ProfanityFilterService.name);
  private profanityWords: ProfanityEntry[] = [];
  private threatKeywords: ProfanityEntry[] = [];

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {
    // Load wordlists on initialization
    this.profanityWords = getAllProfanityWords();
    this.threatKeywords = getThreatKeywords();
    this.logger.log(`Loaded ${this.profanityWords.length} profanity words and ${this.threatKeywords.length} threat keywords`);
  }

  /**
   * Filter message content with comprehensive analysis
   */
  async filter(
    content: string,
    talentId: string,
    options: FilterOptions,
  ): Promise<FilterResult> {
    const flags: string[] = [];
    const matchedPatterns: string[] = [];
    const scoreFactors: ScoreFactor[] = [];
    let filteredContent = content;
    let action: 'allow' | 'reject' | 'flag' = 'allow';

    // 0. Text normalization and evasion detection
    const normResult = TextNormalizer.normalize(content);
    const normalizedContent = normResult.normalized;

    // Check for evasion techniques
    if (normResult.homoglyphsDetected) {
      flags.push('evasion:homoglyph');
      scoreFactors.push({ type: 'homoglyph_detected', weight: SCORE_WEIGHTS.homoglyph_detected, details: 'Unicode homoglyphs detected' });
    }
    if (normResult.leetspeakDetected) {
      flags.push('evasion:leetspeak');
      scoreFactors.push({ type: 'leetspeak_detected', weight: SCORE_WEIGHTS.leetspeak_detected, details: 'Leetspeak substitutions detected' });
    }
    if (normResult.zeroWidthRemoved) {
      flags.push('evasion:zero_width');
      scoreFactors.push({ type: 'zero_width_detected', weight: SCORE_WEIGHTS.zero_width_detected, details: 'Zero-width characters removed' });
    }

    // Detect other evasion techniques
    const evasionTechniques = detectEvasionTechniques(content);
    for (const technique of evasionTechniques) {
      if (!flags.includes(`evasion:${technique}`)) {
        flags.push(`evasion:${technique}`);
        scoreFactors.push({ type: 'evasion_technique', weight: SCORE_WEIGHTS.evasion_technique, details: technique });
      }
    }

    // 1. Built-in profanity wordlist check (on normalized content)
    if (options.profanityFilterEnabled) {
      const profanityResult = this.checkProfanityWordlist(normalizedContent);
      if (profanityResult.matched) {
        flags.push(...profanityResult.flags);
        matchedPatterns.push(...profanityResult.patterns);
        scoreFactors.push(...profanityResult.scoreFactors);
        action = this.escalateAction(action, profanityResult.action);
      }

      // Check threat keywords
      const threatResult = this.checkThreatKeywords(normalizedContent);
      if (threatResult.matched) {
        flags.push(...threatResult.flags);
        matchedPatterns.push(...threatResult.patterns);
        scoreFactors.push(...threatResult.scoreFactors);
        action = this.escalateAction(action, threatResult.action);
      }
    }

    // 2. External blocklist check
    if (options.externalBlocklistEnabled) {
      const externalResult = await this.checkExternalBlocklist(content, talentId);
      if (externalResult.matched) {
        flags.push(...externalResult.flags);
        matchedPatterns.push(...externalResult.patterns);
        scoreFactors.push(...externalResult.scoreFactors);
        action = this.escalateAction(action, externalResult.action);
        if (externalResult.filteredContent) {
          filteredContent = externalResult.filteredContent;
        }
      }
    }

    // 3. Database blocklist check (custom patterns)
    if (options.profanityFilterEnabled) {
      const blocklist = await this.checkBlocklist(normalizedContent, talentId);
      if (blocklist.matched) {
        flags.push(...blocklist.flags);
        matchedPatterns.push(...blocklist.patterns);
        scoreFactors.push(...blocklist.scoreFactors);
        action = this.escalateAction(action, blocklist.action);
      }
    }

    // 4. Behavior pattern check
    const behaviorResult = this.checkBehaviorPatterns(content);
    if (behaviorResult.suspicious) {
      flags.push(...behaviorResult.flags);
      scoreFactors.push(...behaviorResult.scoreFactors);
      action = this.escalateAction(action, 'flag');
    }

    // 5. Calculate final score
    const score = this.calculateScore(scoreFactors);

    // Adjust action based on score if not already reject
    if (action !== 'reject') {
      if (score.category === 'harmful') {
        action = 'reject';
      } else if (score.category === 'suspicious' && action === 'allow') {
        action = 'flag';
      }
    }

    return {
      passed: action !== 'reject',
      action,
      flags,
      matchedPatterns,
      filteredContent: action === 'allow' ? content : filteredContent,
      score,
    };
  }

  /**
   * Check content against built-in profanity wordlist
   */
  private checkProfanityWordlist(normalizedContent: string): {
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

    for (const entry of this.profanityWords) {
      const wordLower = entry.word.toLowerCase();
      // Use word boundary matching for better accuracy
      const regex = new RegExp(`\\b${this.escapeRegex(wordLower)}\\b`, 'gi');

      if (regex.test(normalizedContent)) {
        flags.push(`profanity:${entry.severity}:${entry.word}`);
        patterns.push(entry.word);

        const weightKey = `profanity_${entry.severity}` as keyof typeof SCORE_WEIGHTS;
        scoreFactors.push({
          type: weightKey,
          weight: SCORE_WEIGHTS[weightKey],
          details: `Matched: ${entry.word} (${entry.category || 'general'})`,
        });

        // Track highest severity
        if (entry.severity === 'high') {
          highestSeverity = 'high';
        } else if (entry.severity === 'medium' && highestSeverity !== 'high') {
          highestSeverity = 'medium';
        }
      }
    }

    if (patterns.length === 0) {
      return { matched: false, flags: [], patterns: [], scoreFactors: [], action: 'allow' };
    }

    // Determine action based on highest severity
    let action: 'allow' | 'reject' | 'flag';
    if (highestSeverity === 'high') {
      action = 'reject';
    } else if (highestSeverity === 'medium') {
      action = 'flag';
    } else {
      action = 'flag';
    }

    return { matched: true, flags, patterns, scoreFactors, action };
  }

  /**
   * Check content against threat keywords
   */
  private checkThreatKeywords(normalizedContent: string): {
    matched: boolean;
    flags: string[];
    patterns: string[];
    scoreFactors: ScoreFactor[];
    action: 'allow' | 'reject' | 'flag';
  } {
    const flags: string[] = [];
    const patterns: string[] = [];
    const scoreFactors: ScoreFactor[] = [];

    for (const entry of this.threatKeywords) {
      const wordLower = entry.word.toLowerCase();
      const regex = new RegExp(`\\b${this.escapeRegex(wordLower)}\\b`, 'gi');

      if (regex.test(normalizedContent)) {
        flags.push(`threat:${entry.severity}:${entry.word}`);
        patterns.push(entry.word);
        scoreFactors.push({
          type: 'threat_keyword',
          weight: SCORE_WEIGHTS.threat_keyword,
          details: `Threat keyword: ${entry.word}`,
        });
      }
    }

    if (patterns.length === 0) {
      return { matched: false, flags: [], patterns: [], scoreFactors: [], action: 'allow' };
    }

    // Threat keywords always flag at minimum
    return { matched: true, flags, patterns, scoreFactors, action: 'flag' };
  }

  /**
   * Calculate content score from factors
   */
  private calculateScore(factors: ScoreFactor[]): ContentScore {
    const totalScore = factors.reduce((sum, f) => sum + f.weight, 0);
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

  /**
   * Check external blocklist patterns
   */
  private async checkExternalBlocklist(
    content: string,
    talentId: string,
  ): Promise<{ matched: boolean; flags: string[]; patterns: string[]; scoreFactors: ScoreFactor[]; action: 'allow' | 'reject' | 'flag'; filteredContent?: string }> {
    const externalPatterns = await this.getExternalPatterns(talentId);
    const matched: Array<{ pattern: string; action: 'reject' | 'flag' | 'replace'; replacement: string | null; severity?: string }> = [];

    for (const pattern of externalPatterns) {
      let isMatch = false;

      switch (pattern.patternType) {
        case 'domain':
          const domainRegex = new RegExp(
            `https?://([a-z0-9-]+\\.)*${this.escapeRegex(pattern.pattern)}(/|$|\\s|\\?|#)`,
            'gi',
          );
          isMatch = domainRegex.test(content);
          break;

        case 'url_regex':
          try {
            const urlRegex = new RegExp(pattern.pattern, 'gi');
            isMatch = urlRegex.test(content);
          } catch {
            // Invalid regex, skip
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

    // Determine strictest action
    const actions = matched.map((m) => m.action);
    const finalAction = actions.includes('reject')
      ? 'reject'
      : actions.includes('flag')
      ? 'flag'
      : 'flag';

    // Calculate score factors
    const scoreFactors: ScoreFactor[] = matched.map((m) => {
      const severityKey = `external_blocklist_${m.severity || 'medium'}` as keyof typeof SCORE_WEIGHTS;
      const weight = SCORE_WEIGHTS[severityKey] || SCORE_WEIGHTS.external_blocklist_medium;
      return {
        type: severityKey,
        weight,
        details: `External blocklist: ${m.pattern}`,
      };
    });

    // Apply replacements if action is not reject
    let filteredContent = content;
    if (finalAction !== 'reject') {
      for (const m of matched) {
        if (m.action === 'replace' && m.replacement) {
          const replaceRegex = new RegExp(this.escapeRegex(m.pattern), 'gi');
          filteredContent = filteredContent.replace(replaceRegex, m.replacement);
        }
      }
    }

    return {
      matched: true,
      flags: matched.map((m) => `external:${m.pattern}`),
      patterns: matched.map((m) => m.pattern),
      scoreFactors,
      action: finalAction,
      filteredContent,
    };
  }

  /**
   * Check blocklist entries (custom patterns from database)
   */
  private async checkBlocklist(
    content: string,
    talentId: string,
  ): Promise<{ matched: boolean; flags: string[]; patterns: string[]; scoreFactors: ScoreFactor[]; action: 'allow' | 'reject' | 'flag' }> {
    const prisma = this.databaseService.getPrisma();

    // Get blocklist entries with inheritance
    const entries = await prisma.blocklistEntry.findMany({
      where: {
        isActive: true,
        OR: [
          { ownerType: 'tenant', ownerId: null },
          { ownerType: 'talent', ownerId: talentId },
        ],
      },
    });

    const matched: Array<{ pattern: string; action: string; severity: string }> = [];

    for (const entry of entries) {
      let isMatch = false;

      switch (entry.patternType) {
        case 'keyword':
          isMatch = content.toLowerCase().includes(entry.pattern.toLowerCase());
          break;

        case 'regex':
          try {
            const regex = new RegExp(entry.pattern, 'gi');
            isMatch = regex.test(content);
          } catch {
            // Invalid regex
          }
          break;

        case 'wildcard':
          const wildcardRegex = new RegExp(
            entry.pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
            'gi',
          );
          isMatch = wildcardRegex.test(content);
          break;
      }

      if (isMatch) {
        matched.push({ pattern: entry.pattern, action: entry.action, severity: entry.severity });
      }
    }

    if (matched.length === 0) {
      return { matched: false, flags: [], patterns: [], scoreFactors: [], action: 'allow' };
    }

    const actions = matched.map((m) => m.action);
    const finalAction = actions.includes('reject')
      ? 'reject'
      : actions.includes('flag')
      ? 'flag'
      : 'flag';

    // Calculate score factors
    const scoreFactors: ScoreFactor[] = matched.map((m) => ({
      type: 'blocklist_match',
      weight: SCORE_WEIGHTS.blocklist_match,
      details: `Custom blocklist: ${m.pattern} (${m.severity})`,
    }));

    return {
      matched: true,
      flags: matched.map((m) => `blocklist:${m.pattern}`),
      patterns: matched.map((m) => m.pattern),
      scoreFactors,
      action: finalAction as 'allow' | 'reject' | 'flag',
    };
  }

  /**
   * Check behavior patterns (spam, abuse patterns)
   */
  private checkBehaviorPatterns(content: string): { suspicious: boolean; flags: string[]; scoreFactors: ScoreFactor[] } {
    const flags: string[] = [];
    const scoreFactors: ScoreFactor[] = [];

    // All caps check (shouting)
    if (content.length > 20 && content === content.toUpperCase()) {
      flags.push('behavior:all_caps');
      scoreFactors.push({ type: 'behavior_pattern', weight: SCORE_WEIGHTS.behavior_pattern, details: 'All caps text' });
    }

    // Excessive special characters
    const specialCharCount = (content.match(/[!@#$%^&*()]/g) || []).length;
    if (content.length > 10 && specialCharCount / content.length > 0.3) {
      flags.push('behavior:excessive_special_chars');
      scoreFactors.push({ type: 'behavior_pattern', weight: SCORE_WEIGHTS.behavior_pattern, details: 'Excessive special characters' });
    }

    // Repeated characters (spam indicator)
    if (/(.)\1{5,}/.test(content)) {
      flags.push('behavior:repeated_chars');
      scoreFactors.push({ type: 'behavior_pattern', weight: SCORE_WEIGHTS.behavior_pattern, details: 'Repeated characters' });
    }

    // Check for excessive URLs (spam indicator)
    const urlCount = (content.match(/https?:\/\//gi) || []).length;
    if (urlCount > 3) {
      flags.push('behavior:excessive_urls');
      scoreFactors.push({ type: 'behavior_pattern', weight: SCORE_WEIGHTS.behavior_pattern * 2, details: `Excessive URLs (${urlCount})` });
    }

    // Check for excessive punctuation
    const punctuationCount = (content.match(/[!?]{3,}/g) || []).length;
    if (punctuationCount > 2) {
      flags.push('behavior:excessive_punctuation');
      scoreFactors.push({ type: 'behavior_pattern', weight: SCORE_WEIGHTS.behavior_pattern, details: 'Excessive punctuation' });
    }

    // Check for potential spam patterns (repeated words)
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
      scoreFactors.push({ type: 'behavior_pattern', weight: SCORE_WEIGHTS.behavior_pattern, details: 'Repeated words' });
    }

    // Check for only emoji/emoticons (low effort spam)
    const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojiMatches = content.match(emojiPattern) || [];
    const textWithoutEmoji = content.replace(emojiPattern, '').replace(/\s/g, '');
    if (emojiMatches.length > 10 && textWithoutEmoji.length < 10) {
      flags.push('behavior:emoji_spam');
      scoreFactors.push({ type: 'behavior_pattern', weight: SCORE_WEIGHTS.behavior_pattern, details: 'Emoji spam' });
    }

    return {
      suspicious: flags.length > 0,
      flags,
      scoreFactors,
    };
  }

  /**
   * Get external patterns from cache or database
   */
  private async getExternalPatterns(talentId: string): Promise<ExternalPattern[]> {
    const cacheKey = `external_blocklist:${talentId}`;

    // Try cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const prisma = this.databaseService.getPrisma();

    const patterns = await prisma.externalBlocklistPattern.findMany({
      where: {
        isActive: true,
        OR: [
          { ownerType: 'tenant', ownerId: null, inherit: true },
          { ownerType: 'talent', ownerId: talentId },
        ],
      },
      orderBy: { severity: 'desc' },
    });

    const result = patterns.map((p) => ({
      id: p.id,
      pattern: p.pattern,
      patternType: p.patternType as 'domain' | 'url_regex' | 'keyword',
      action: p.action as 'reject' | 'flag' | 'replace',
      replacement: p.replacement,
      severity: p.severity,
    }));

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Escalate action to more severe
   */
  private escalateAction(
    current: 'allow' | 'reject' | 'flag',
    incoming: 'allow' | 'reject' | 'flag',
  ): 'allow' | 'reject' | 'flag' {
    const priority = { allow: 0, flag: 1, reject: 2 };
    return priority[incoming] > priority[current] ? incoming : current;
  }
}
