// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  LocalReportJobCreateResponse as SharedLocalReportJobCreateResponse,
  MfrFilterCriteria as SharedMfrFilterCriteria,
  PiiPlatformReportCreateResponse as SharedPiiPlatformReportCreateResponse,
  ReportArtifactKind as SharedReportArtifactKind,
  ReportCatalogItem as SharedReportCatalogItem,
  ReportCreateResponse as SharedReportCreateResponse,
  ReportFilterField as SharedReportFilterField,
  ReportFilterSchema as SharedReportFilterSchema,
  ReportFormat as SharedReportFormat,
  ReportJobStatus as SharedReportJobStatus,
  ReportLocalizedText as SharedReportLocalizedText,
  ReportType as SharedReportType,
} from '../../../schemas/report';

export type ReportJobStatus = SharedReportJobStatus;
export type ReportType = SharedReportType;
export type ReportFormat = SharedReportFormat;
export type ReportArtifactKind = SharedReportArtifactKind;
export type ReportLocalizedText = SharedReportLocalizedText;
export type ReportFilterField = SharedReportFilterField;
export type ReportFilterSchema = SharedReportFilterSchema;
export type ReportCatalogItem = SharedReportCatalogItem;
export type MfrFilterCriteria = SharedMfrFilterCriteria;
export type LocalReportJobCreateResponse = SharedLocalReportJobCreateResponse;
export type PiiPlatformReportCreateResponse = SharedPiiPlatformReportCreateResponse;
export type ReportCreateResponse = SharedReportCreateResponse;

export interface ReportDefinition {
  code: ReportType;
  name: string;
  description: string;
  icon: string;
}

export const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    id: 'mfr',
    name: {
      en: 'Member Feedback Report',
      zh_HANS: '会员反馈报表',
      zh_HANT: '會員回饋報表',
      ja: 'メンバーフィードバックレポート',
      ko: '멤버 피드백 리포트',
      fr: 'Rapport de feedback des membres',
    },
    description: {
      en: 'Export membership data for physical gift delivery or digital rewards through the approved PII handoff flow.',
      zh_HANS: '通过已批准的 PII 交接流程导出会员数据，用于实体礼物配送或数字奖励。',
      zh_HANT: '透過已核准的 PII 交接流程匯出會員資料，用於實體禮物配送或數位獎勵。',
      ja: '承認済みのPII引き渡しフローで、物理ギフト配送やデジタル特典用のメンバーシップデータをエクスポートします。',
      ko: '승인된 PII 전달 흐름을 통해 실물 선물 배송 또는 디지털 리워드용 멤버십 데이터를 내보냅니다.',
      fr: 'Exporte les donnees d adhesion pour la livraison de cadeaux physiques ou de recompenses numeriques via le flux PII approuve.',
    },
    icon: 'Gift',
    availability: {
      status: 'available',
      requiredPermissions: [
        {
          resource: 'report.mfr',
          actions: ['read', 'export'],
        },
      ],
    },
    artifactKinds: ['xlsx', 'csv', 'pii_platform_portal'],
    filterSchema: {
      version: 1,
      fields: [
        {
          id: 'platformCodes',
          type: 'config-multi-select',
          targetField: 'platformCodes',
          label: {
            en: 'Platforms',
            zh_HANS: '平台',
            zh_HANT: '平台',
            ja: 'プラットフォーム',
            ko: '플랫폼',
            fr: 'Plateformes',
          },
          description: {
            en: 'Limit the report to configured social platform codes.',
          },
          source: {
            kind: 'config-entity',
            entityType: 'social-platform',
          },
        },
        {
          id: 'membershipClassCodes',
          type: 'config-multi-select',
          targetField: 'membershipClassCodes',
          label: {
            en: 'Membership classes',
            zh_HANS: '会员类别',
            zh_HANT: '會員類別',
            ja: 'メンバーシップクラス',
            ko: '멤버십 클래스',
            fr: 'Classes d adhesion',
          },
          source: {
            kind: 'config-entity',
            entityType: 'membership-class',
          },
        },
        {
          id: 'membershipTypeCodes',
          type: 'config-multi-select',
          targetField: 'membershipTypeCodes',
          label: {
            en: 'Membership types',
            zh_HANS: '会员类型',
            zh_HANT: '會員類型',
            ja: 'メンバーシップタイプ',
            ko: '멤버십 유형',
            fr: 'Types d adhesion',
          },
          source: {
            kind: 'config-entity',
            entityType: 'membership-type',
          },
        },
        {
          id: 'membershipLevelCodes',
          type: 'config-multi-select',
          targetField: 'membershipLevelCodes',
          label: {
            en: 'Membership levels',
            zh_HANS: '会员等级',
            zh_HANT: '會員等級',
            ja: 'メンバーシップレベル',
            ko: '멤버십 레벨',
            fr: 'Niveaux d adhesion',
          },
          source: {
            kind: 'config-entity',
            entityType: 'membership-level',
          },
        },
        {
          id: 'statusCodes',
          type: 'config-multi-select',
          targetField: 'statusCodes',
          label: {
            en: 'Customer statuses',
            zh_HANS: '客户状态',
            zh_HANT: '客戶狀態',
            ja: '顧客ステータス',
            ko: '고객 상태',
            fr: 'Statuts client',
          },
          source: {
            kind: 'config-entity',
            entityType: 'customer-status',
          },
        },
        {
          id: 'validFrom',
          type: 'date-range',
          fromField: 'validFromStart',
          toField: 'validFromEnd',
          label: {
            en: 'Valid from',
            zh_HANS: '生效开始',
            zh_HANT: '生效開始',
            ja: '有効開始日',
            ko: '유효 시작일',
            fr: 'Debut de validite',
          },
        },
        {
          id: 'validTo',
          type: 'date-range',
          fromField: 'validToStart',
          toField: 'validToEnd',
          label: {
            en: 'Valid to',
            zh_HANS: '生效结束',
            zh_HANT: '生效結束',
            ja: '有効終了日',
            ko: '유효 종료일',
            fr: 'Fin de validite',
          },
        },
        {
          id: 'includeExpired',
          type: 'boolean',
          targetField: 'includeExpired',
          label: {
            en: 'Include expired memberships',
            zh_HANS: '包含已过期会员',
            zh_HANT: '包含已過期會員',
            ja: '期限切れメンバーシップを含める',
            ko: '만료된 멤버십 포함',
            fr: 'Inclure les adhesions expirees',
          },
          defaultValue: false,
        },
        {
          id: 'includeInactive',
          type: 'boolean',
          targetField: 'includeInactive',
          label: {
            en: 'Include inactive customers',
            zh_HANS: '包含停用客户',
            zh_HANT: '包含停用客戶',
            ja: '非アクティブ顧客を含める',
            ko: '비활성 고객 포함',
            fr: 'Inclure les clients inactifs',
          },
          defaultValue: false,
        },
        {
          id: 'platformCodesRaw',
          type: 'raw-code-list',
          targetField: 'platformCodes',
          fallbackForFieldId: 'platformCodes',
          label: {
            en: 'Raw platform codes',
            zh_HANS: '原始平台代码',
            zh_HANT: '原始平台代碼',
            ja: '生のプラットフォームコード',
            ko: '원시 플랫폼 코드',
            fr: 'Codes plateforme bruts',
          },
          advanced: true,
        },
      ],
    },
  },
];

export const AVAILABLE_REPORTS: ReportDefinition[] = REPORT_CATALOG.map((report) => ({
  code: report.id,
  name: report.name.en,
  description: report.description.en,
  icon: report.icon,
}));
