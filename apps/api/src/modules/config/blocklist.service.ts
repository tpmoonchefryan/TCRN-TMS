// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import { OwnerType, BlocklistEntryFields } from './config.types';

export interface BlocklistMatch {
  entryId: string;
  pattern: string;
  matchedText: string;
  position: { start: number; end: number };
  severity: 'low' | 'medium' | 'high';
  action: 'reject' | 'flag' | 'replace';
  ownerType: OwnerType;
  ownerName: string | null;
}

export interface BlocklistTestResult {
  originalText: string;
  isBlocked: boolean;
  matches: BlocklistMatch[];
  filteredText: string;
}

/**
 * Blocklist Service
 * Handles blocklist matching and testing
 */
@Injectable()
export class BlocklistService {
  /**
   * Test text against blocklist
   */
  async testText(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null,
    text: string
  ): Promise<BlocklistTestResult> {
    // Get effective blocklist entries
    const entries = await this.getEffectiveEntries(tenantSchema, scopeType, scopeId);
    
    const matches: BlocklistMatch[] = [];
    let filteredText = text;
    let isBlocked = false;

    for (const entry of entries) {
      const regex = this.patternToRegex(entry.pattern, entry.patternType);
      let match: RegExpExecArray | null;
      
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          entryId: entry.id,
          pattern: entry.pattern,
          matchedText: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          severity: entry.severity,
          action: entry.action,
          ownerType: entry.ownerType,
          ownerName: entry.ownerName,
        });

        if (entry.action === 'reject') {
          isBlocked = true;
        }

        // Prevent infinite loop for zero-width matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }

      // Apply replacement if action is replace
      if (entry.action === 'replace') {
        const replaceRegex = this.patternToRegex(entry.pattern, entry.patternType);
        filteredText = filteredText.replace(replaceRegex, entry.replacement || '***');
      }
    }

    // Update match count
    if (matches.length > 0) {
      const entryIds = [...new Set(matches.map(m => m.entryId))];
      for (const entryId of entryIds) {
        await prisma.$executeRawUnsafe(`
          UPDATE "${tenantSchema}".blocklist_entry
          SET match_count = match_count + 1, last_matched_at = now()
          WHERE id = $1
        `, entryId);
      }
    }

    return {
      originalText: text,
      isBlocked,
      matches,
      filteredText: isBlocked ? text : filteredText,
    };
  }

  /**
   * Get effective blocklist entries for a scope
   */
  async getEffectiveEntries(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null
  ): Promise<Array<BlocklistEntryFields & { id: string; ownerType: OwnerType; ownerName: string | null }>> {
    // Build scope chain
    const scopeConditions: string[] = [`(owner_type = 'tenant' AND owner_id IS NULL)`];
    
    if (scopeType === 'subsidiary' && scopeId) {
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{ path: string }>>(`
        SELECT path FROM "${tenantSchema}".subsidiary WHERE id = $1
      `, scopeId);
      
      if (subsidiaries.length > 0) {
        const ancestors = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT id FROM "${tenantSchema}".subsidiary 
          WHERE $1 LIKE path || '%'
          ORDER BY length(path)
        `, subsidiaries[0].path);
        
        for (const anc of ancestors) {
          scopeConditions.push(`(owner_type = 'subsidiary' AND owner_id = '${anc.id}')`);
        }
      }
    }

    if (scopeType === 'talent' && scopeId) {
      const talents = await prisma.$queryRawUnsafe<Array<{ subsidiaryId: string | null; path: string }>>(`
        SELECT subsidiary_id as "subsidiaryId", path FROM "${tenantSchema}".talent WHERE id = $1
      `, scopeId);
      
      if (talents.length > 0 && talents[0].subsidiaryId) {
        const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
          SELECT id FROM "${tenantSchema}".subsidiary 
          WHERE $1 LIKE path || '%'
          ORDER BY length(path)
        `, talents[0].path);
        
        for (const sub of subsidiaries) {
          scopeConditions.push(`(owner_type = 'subsidiary' AND owner_id = '${sub.id}')`);
        }
      }
      scopeConditions.push(`(owner_type = 'talent' AND owner_id = '${scopeId}')`);
    }

    const entries = await prisma.$queryRawUnsafe<Array<BlocklistEntryFields & { id: string; ownerType: OwnerType; ownerName: string | null }>>(`
      SELECT 
        id, owner_type as "ownerType", NULL as "ownerName",
        pattern, pattern_type as "patternType", action, replacement,
        scope, severity, category, match_count as "matchCount", last_matched_at as "lastMatchedAt"
      FROM "${tenantSchema}".blocklist_entry
      WHERE is_active = true AND (${scopeConditions.join(' OR ')})
      ORDER BY severity DESC, pattern
    `);

    return entries;
  }

  /**
   * Convert pattern to regex
   */
  private patternToRegex(pattern: string, patternType: 'keyword' | 'regex' | 'wildcard'): RegExp {
    switch (patternType) {
      case 'regex':
        return new RegExp(pattern, 'gi');
      
      case 'wildcard':
        // Convert wildcard to regex: * -> .*, ? -> .
        const regexPattern = pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        return new RegExp(regexPattern, 'gi');
      
      case 'keyword':
      default:
        // Escape special regex characters for literal matching
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped, 'gi');
    }
  }
}
