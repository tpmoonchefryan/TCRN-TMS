// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';

// Excel column definitions for MFR report
export const MFR_COLUMNS = [
  { header: '全局昵称', key: 'nickname', width: 20 },
  { header: '真实姓名', key: 'realName', width: 15 },
  { header: '平台', key: 'platform', width: 15 },
  { header: '平台 UID', key: 'platformUid', width: 20 },
  { header: '平台昵称', key: 'platformNickname', width: 20 },
  { header: '会员大类', key: 'membershipClass', width: 15 },
  { header: '会员类型', key: 'membershipType', width: 15 },
  { header: '会员等级', key: 'membershipLevel', width: 15 },
  { header: '生效日期', key: 'validFrom', width: 12 },
  { header: '失效日期', key: 'validTo', width: 12 },
  { header: '自动续期', key: 'autoRenew', width: 10 },
  { header: '客户状态', key: 'status', width: 12 },
  { header: '电话号码', key: 'phone', width: 15 },
  { header: '邮箱地址', key: 'email', width: 25 },
];

export const LEGEND_DATA = [
  { column: '全局昵称', description: '客户在本系统中的显示名称', note: '' },
  { column: '真实姓名', description: '客户的真实姓名（PII）', note: '仅限内部使用' },
  { column: '平台', description: '会员所属的直播/社交平台', note: '' },
  { column: '平台 UID', description: '客户在平台上的唯一标识', note: '' },
  { column: '平台昵称', description: '客户在平台上的显示名称', note: '' },
  { column: '会员大类', description: '会员所属的大类（如直播会员）', note: '' },
  { column: '会员类型', description: '会员的具体类型（如舰长）', note: '' },
  { column: '会员等级', description: '会员的具体等级', note: '' },
  { column: '生效日期', description: '会员权益生效的日期', note: 'yyyy-MM-dd 格式' },
  { column: '失效日期', description: '会员权益失效的日期', note: '空值表示永久有效' },
  { column: '自动续期', description: '是否自动续期', note: '是/否' },
  { column: '客户状态', description: '客户在系统中的状态', note: '' },
  { column: '电话号码', description: '客户的主要联系电话（PII）', note: '仅限内部使用' },
  { column: '邮箱地址', description: '客户的主要邮箱地址（PII）', note: '仅限内部使用' },
];

export interface MfrRowData {
  nickname: string | null;
  realName: string;
  platform: string;
  platformUid: string;
  platformNickname: string;
  membershipClass: string;
  membershipType: string;
  membershipLevel: string;
  validFrom: Date;
  validTo: Date | null;
  autoRenew: boolean;
  status: string;
  phone: string;
  email: string;
}

export interface MfrMetaData {
  reportType: string;
  generatedAt: Date;
  operatorName: string;
  talentName: string;
  totalRows: number;
  filterSummary: string;
}

@Injectable()
export class ExcelBuilderService {
  /**
   * Build a data row for MFR report
   */
  buildMfrRow(data: MfrRowData): (string | number | boolean | null)[] {
    return [
      data.nickname ?? '',
      data.realName,
      data.platform,
      data.platformUid,
      data.platformNickname,
      data.membershipClass,
      data.membershipType,
      data.membershipLevel,
      this.formatDate(data.validFrom),
      data.validTo ? this.formatDate(data.validTo) : '',
      data.autoRenew ? '是' : '否',
      data.status,
      data.phone,
      data.email,
    ];
  }

  /**
   * Build meta sheet data
   */
  buildMetaData(meta: MfrMetaData): Array<[string, string]> {
    return [
      ['报表类型', meta.reportType],
      ['生成时间', this.formatDateTime(meta.generatedAt)],
      ['操作人', meta.operatorName],
      ['所属艺人', meta.talentName],
      ['数据行数', meta.totalRows.toString()],
      ['筛选条件', meta.filterSummary],
    ];
  }

  /**
   * Build legend sheet data
   */
  buildLegendData(): Array<[string, string, string]> {
    return LEGEND_DATA.map((row) => [row.column, row.description, row.note]);
  }

  /**
   * Generate file name for MFR report
   */
  generateFileName(
    tenantCode: string,
    talentCode: string,
    jobId: string,
  ): string {
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const shortId = jobId.substring(0, 8);
    return `MFR_${tenantCode}_${talentCode}_${timestamp}_${shortId}.xlsx`;
  }

  /**
   * Format date to yyyy-MM-dd
   */
  private formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  /**
   * Format datetime to yyyy-MM-dd HH:mm:ss
   */
  private formatDateTime(date: Date): string {
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  }

  /**
   * Build filter summary string
   */
  buildFilterSummary(filters: Record<string, unknown>): string {
    const parts: string[] = [];

    if (filters.platformCodes && Array.isArray(filters.platformCodes) && filters.platformCodes.length > 0) {
      parts.push(`平台: ${(filters.platformCodes as string[]).join(', ')}`);
    }

    if (filters.membershipClassCodes && Array.isArray(filters.membershipClassCodes)) {
      parts.push(`会员大类: ${(filters.membershipClassCodes as string[]).join(', ')}`);
    }

    if (filters.validFromStart || filters.validFromEnd) {
      parts.push(`生效日期: ${filters.validFromStart || '...'} ~ ${filters.validFromEnd || '...'}`);
    }

    if (filters.validToStart || filters.validToEnd) {
      parts.push(`失效日期: ${filters.validToStart || '...'} ~ ${filters.validToEnd || '...'}`);
    }

    if (filters.includeExpired) {
      parts.push('包含已过期');
    }

    if (filters.includeInactive) {
      parts.push('包含已停用');
    }

    return parts.length > 0 ? parts.join('; ') : '无筛选条件';
  }

  // ==========================================================================
  // CSV Export
  // ==========================================================================

  /**
   * Build CSV header row
   */
  buildCsvHeader(): string {
    return MFR_COLUMNS.map((col) => this.escapeCsvField(col.header)).join(',');
  }

  /**
   * Build CSV data row
   */
  buildCsvRow(data: MfrRowData): string {
    const row = this.buildMfrRow(data);
    return row.map((field) => this.escapeCsvField(String(field ?? ''))).join(',');
  }

  /**
   * Escape CSV field (handle commas, quotes, newlines)
   */
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Generate CSV file name for MFR report
   */
  generateCsvFileName(
    tenantCode: string,
    talentCode: string,
    jobId: string,
  ): string {
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const shortId = jobId.substring(0, 8);
    return `MFR_${tenantCode}_${talentCode}_${timestamp}_${shortId}.csv`;
  }
}
