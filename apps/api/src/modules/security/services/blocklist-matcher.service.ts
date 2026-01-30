// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database';
import { RedisService } from '../../redis';

interface BlocklistPattern {
  id: string;
  pattern: string;
  patternType: 'keyword' | 'regex' | 'wildcard';
  action: 'reject' | 'flag' | 'replace';
  replacement: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  scope: string[];
}

interface MatchResult {
  matched: boolean;
  action: 'allow' | 'reject' | 'flag' | 'replace';
  matches: Array<{
    patternId: string;
    pattern: string;
    position: number;
    category: string;
    severity: string;
  }>;
  filteredContent?: string;
}

@Injectable()
export class BlocklistMatcherService implements OnModuleInit {
  private readonly logger = new Logger(BlocklistMatcherService.name);
  private keywordPatterns: Map<string, BlocklistPattern> = new Map();
  private regexPatterns: Array<{ pattern: BlocklistPattern; regex: RegExp }> = [];

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    await this.rebuildMatcher();
  }

  /**
   * Rebuild matcher with current patterns
   */
  async rebuildMatcher(): Promise<void> {
    const patterns = await this.loadPatterns();

    this.keywordPatterns.clear();
    this.regexPatterns = [];

    for (const p of patterns) {
      if (p.patternType === 'keyword') {
        this.keywordPatterns.set(p.pattern.toLowerCase(), p);
      } else if (p.patternType === 'regex') {
        try {
          this.regexPatterns.push({
            pattern: p,
            regex: new RegExp(p.pattern, 'gi'),
          });
        } catch {
          this.logger.warn(`Invalid regex pattern: ${p.pattern}`);
        }
      } else if (p.patternType === 'wildcard') {
        try {
          const regexPattern = p.pattern
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\\\*/g, '.*')
            .replace(/\\\?/g, '.');
          this.regexPatterns.push({
            pattern: p,
            regex: new RegExp(regexPattern, 'gi'),
          });
        } catch {
          this.logger.warn(`Invalid wildcard pattern: ${p.pattern}`);
        }
      }
    }

    this.logger.log(`Loaded ${this.keywordPatterns.size} keywords and ${this.regexPatterns.length} regex patterns`);
  }

  /**
   * Match content against blocklist
   */
  async match(content: string, scope: string): Promise<MatchResult> {
    const matches: MatchResult['matches'] = [];
    let filteredContent = content;
    let highestAction: 'allow' | 'reject' | 'flag' | 'replace' = 'allow';

    const lowerContent = content.toLowerCase();

    // 1. Keyword matching (simple string search)
    for (const [keyword, pattern] of this.keywordPatterns) {
      if (!pattern.scope.includes(scope)) continue;

      let pos = 0;
      while ((pos = lowerContent.indexOf(keyword, pos)) !== -1) {
        matches.push({
          patternId: pattern.id,
          pattern: pattern.pattern,
          position: pos,
          category: pattern.category,
          severity: pattern.severity,
        });
        highestAction = this.escalateAction(highestAction, pattern.action);

        if (pattern.action === 'replace') {
          filteredContent = this.replaceAtPosition(
            filteredContent,
            pos,
            keyword.length,
            pattern.replacement,
          );
        }

        pos += keyword.length;
      }
    }

    // 2. Regex matching
    for (const { pattern, regex } of this.regexPatterns) {
      if (!pattern.scope.includes(scope)) continue;

      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          patternId: pattern.id,
          pattern: pattern.pattern,
          position: match.index,
          category: pattern.category,
          severity: pattern.severity,
        });
        highestAction = this.escalateAction(highestAction, pattern.action);

        if (pattern.action === 'replace') {
          filteredContent = filteredContent.replace(match[0], pattern.replacement);
        }
      }
    }

    // Update match stats asynchronously
    if (matches.length > 0) {
      this.updateMatchStats(matches.map((m) => m.patternId)).catch(() => {});
    }

    return {
      matched: matches.length > 0,
      action: highestAction,
      matches,
      filteredContent: highestAction !== 'allow' ? filteredContent : undefined,
    };
  }

  /**
   * Test a pattern against content
   */
  testPattern(
    testContent: string,
    pattern: string,
    patternType: 'keyword' | 'regex' | 'wildcard',
  ): { matched: boolean; positions: number[]; highlightedContent: string } {
    const positions: number[] = [];
    let highlightedContent = testContent;

    if (patternType === 'keyword') {
      const lowerContent = testContent.toLowerCase();
      const lowerPattern = pattern.toLowerCase();
      let pos = 0;
      while ((pos = lowerContent.indexOf(lowerPattern, pos)) !== -1) {
        positions.push(pos);
        pos += lowerPattern.length;
      }
      highlightedContent = testContent.replace(
        new RegExp(this.escapeRegex(pattern), 'gi'),
        '<mark>$&</mark>',
      );
    } else {
      let regex: RegExp;
      if (patternType === 'regex') {
        regex = new RegExp(pattern, 'gi');
      } else {
        const regexPattern = pattern
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\\\*/g, '.*')
          .replace(/\\\?/g, '.');
        regex = new RegExp(regexPattern, 'gi');
      }

      let match;
      while ((match = regex.exec(testContent)) !== null) {
        positions.push(match.index);
      }
      regex.lastIndex = 0;
      highlightedContent = testContent.replace(regex, '<mark>$&</mark>');
    }

    return {
      matched: positions.length > 0,
      positions,
      highlightedContent,
    };
  }

  /**
   * Load patterns from database
   */
  private async loadPatterns(): Promise<BlocklistPattern[]> {
    const prisma = this.databaseService.getPrisma();

    const entries = await prisma.blocklistEntry.findMany({
      where: { isActive: true },
    });

    return entries.map((e) => ({
      id: e.id,
      pattern: e.pattern,
      patternType: e.patternType as 'keyword' | 'regex' | 'wildcard',
      action: e.action as 'reject' | 'flag' | 'replace',
      replacement: e.replacement || '***',
      severity: e.severity as 'low' | 'medium' | 'high',
      category: e.category || 'general',
      scope: e.scope as string[],
    }));
  }

  /**
   * Update match statistics
   */
  private async updateMatchStats(patternIds: string[]): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.blocklistEntry.updateMany({
      where: { id: { in: patternIds } },
      data: {
        matchCount: { increment: 1 },
        lastMatchedAt: new Date(),
      },
    });
  }

  private escalateAction(
    current: 'allow' | 'reject' | 'flag' | 'replace',
    incoming: 'reject' | 'flag' | 'replace',
  ): 'allow' | 'reject' | 'flag' | 'replace' {
    const priority = { allow: 0, replace: 1, flag: 2, reject: 3 };
    return priority[incoming] > priority[current] ? incoming : current;
  }

  private replaceAtPosition(
    str: string,
    pos: number,
    length: number,
    replacement: string,
  ): string {
    return str.substring(0, pos) + replacement + str.substring(pos + length);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
