// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';

import {
  getAllProfanityWords,
  getThreatKeywords,
} from '../data/profanity-wordlist';
import {
  calculateContentScore,
  checkBehaviorPatterns,
  checkProfanityWordlist,
  checkThreatKeywords,
  escalateFilterAction,
  type FilterOptions,
  type FilterResult,
  matchCustomBlocklist,
  matchExternalPatterns,
  type ScoreFactor,
} from '../domain/profanity-filter.policy';
import { ProfanityFilterRepository } from '../infrastructure/profanity-filter.repository';
import { detectEvasionTechniques, TextNormalizer } from '../utils/text-normalizer';

@Injectable()
export class ProfanityFilterApplicationService {
  private readonly logger = new Logger(ProfanityFilterApplicationService.name);
  private readonly profanityWords = getAllProfanityWords();
  private readonly threatKeywords = getThreatKeywords();

  constructor(
    private readonly profanityFilterRepository: ProfanityFilterRepository,
  ) {
    this.logger.log(
      `Loaded ${this.profanityWords.length} profanity words and ${this.threatKeywords.length} threat keywords`,
    );
  }

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

    const normalizationResult = TextNormalizer.normalize(content);
    const normalizedContent = normalizationResult.normalized;

    if (normalizationResult.homoglyphsDetected) {
      flags.push('evasion:homoglyph');
      scoreFactors.push({
        type: 'homoglyph_detected',
        weight: 20,
        details: 'Unicode homoglyphs detected',
      });
    }
    if (normalizationResult.leetspeakDetected) {
      flags.push('evasion:leetspeak');
      scoreFactors.push({
        type: 'leetspeak_detected',
        weight: 15,
        details: 'Leetspeak substitutions detected',
      });
    }
    if (normalizationResult.zeroWidthRemoved) {
      flags.push('evasion:zero_width');
      scoreFactors.push({
        type: 'zero_width_detected',
        weight: 25,
        details: 'Zero-width characters removed',
      });
    }

    for (const technique of detectEvasionTechniques(content)) {
      if (!flags.includes(`evasion:${technique}`)) {
        flags.push(`evasion:${technique}`);
        scoreFactors.push({
          type: 'evasion_technique',
          weight: 20,
          details: technique,
        });
      }
    }

    if (options.profanityFilterEnabled) {
      const profanityResult = checkProfanityWordlist(this.profanityWords, normalizedContent);
      if (profanityResult.matched) {
        flags.push(...profanityResult.flags);
        matchedPatterns.push(...profanityResult.patterns);
        scoreFactors.push(...profanityResult.scoreFactors);
        action = escalateFilterAction(action, profanityResult.action);
      }

      const threatResult = checkThreatKeywords(this.threatKeywords, normalizedContent);
      if (threatResult.matched) {
        flags.push(...threatResult.flags);
        matchedPatterns.push(...threatResult.patterns);
        scoreFactors.push(...threatResult.scoreFactors);
        action = escalateFilterAction(action, threatResult.action);
      }
    }

    if (options.externalBlocklistEnabled) {
      const externalResult = matchExternalPatterns(
        content,
        await this.profanityFilterRepository.getExternalPatterns(talentId),
      );
      if (externalResult.matched) {
        flags.push(...externalResult.flags);
        matchedPatterns.push(...externalResult.patterns);
        scoreFactors.push(...externalResult.scoreFactors);
        action = escalateFilterAction(action, externalResult.action);
        if (externalResult.filteredContent) {
          filteredContent = externalResult.filteredContent;
        }
      }
    }

    if (options.profanityFilterEnabled) {
      const blocklistResult = matchCustomBlocklist(
        normalizedContent,
        await this.profanityFilterRepository.getCustomBlocklistEntries(talentId),
      );
      if (blocklistResult.matched) {
        flags.push(...blocklistResult.flags);
        matchedPatterns.push(...blocklistResult.patterns);
        scoreFactors.push(...blocklistResult.scoreFactors);
        action = escalateFilterAction(action, blocklistResult.action);
      }
    }

    const behaviorResult = checkBehaviorPatterns(content);
    if (behaviorResult.suspicious) {
      flags.push(...behaviorResult.flags);
      scoreFactors.push(...behaviorResult.scoreFactors);
      action = escalateFilterAction(action, 'flag');
    }

    const score = calculateContentScore(scoreFactors);
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
}
