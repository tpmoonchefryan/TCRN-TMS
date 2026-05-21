'use client';

import {
  PUBLIC_PRESENCE_COMPONENT_DEFINITIONS,
  PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS,
  SUPPORTED_UI_LOCALES,
  type HomepageComponentType,
  type LocalizedText,
  type PublicPresenceTemplateId,
  type SupportedUiLocale,
} from '@tcrn/shared';
import {
  Code2,
  Eye,
  LayoutTemplate,
  Package2,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';

import { PublicPresenceBadge, PublicPresenceShell, PublicPresenceSurface } from '@/domains/public-presence';
import {
  listPublicPresenceAuthoringDrafts,
  type PublicPresenceAuthoringArtifactKind,
  type PublicPresenceAuthoringDraftSummary,
} from '@/domains/public-presence-studio/api/public-presence-studio.api';
import { useOverlayFocusManager } from '@/domains/public-presence-studio/screens/public-presence-studio-overlay';
import {
  getHomepageSurfaceActionLabel,
  getHomepageSurfaceLabel,
  getPublicPresenceFieldLabel,
  getPublicPresenceStageSectionLabel,
  getPublicPresenceTemplateLabel,
  getPublicPresenceTemplateUseCase,
} from '@/domains/public-presence-studio/screens/public-presence-studio.copy';
import {
  buildPublicPresenceComponentAuthoringPath,
  buildPublicPresenceHomepageSurfacePath,
  buildPublicPresenceStudioEditorPath,
  buildPublicPresenceStudioPreviewPath,
  buildPublicPresenceTemplateAuthoringPath,
} from '@/platform/routing/workspace-paths';
import { formatLocaleDateTime, pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { useSession } from '@/platform/runtime/session/session-provider';

type HomepageSurfaceId = 'management' | 'templates' | 'components';

interface SurfaceNavItem {
  description: string;
  href: string;
  id: HomepageSurfaceId;
  label: string;
}

function buildExactText(
  en: string,
  zh_HANS: string,
  zh_HANT: string,
  ja: string,
  ko: string,
  fr: string,
): LocalizedText {
  return {
    en,
    fr,
    ja,
    ko,
    zh_HANS,
    zh_HANT,
  };
}

const COMPONENT_PREVIEW_COPY: Record<HomepageComponentType, LocalizedText> = {
  ProfileCard: buildExactText(
    'Profile-led first impression card',
    '以档案为主的首屏身份卡',
    '以檔案為主的首屏身份卡',
    'プロフィール主導のファーストビューカード',
    '프로필 중심의 첫인상 카드',
    'Carte de premiere impression centree sur le profil',
  ),
  SocialLinks: buildExactText(
    'Trusted official channel cluster',
    '可信的官方渠道集合',
    '可信的官方渠道集合',
    '信頼できる公式チャンネル群',
    '신뢰 가능한 공식 채널 묶음',
    'Groupe de canaux officiels de confiance',
  ),
  ImageGallery: buildExactText(
    'Visual teaser and reveal gallery',
    '视觉预告与揭晓图集',
    '視覺預告與揭曉圖集',
    'ビジュアル告知と公開用ギャラリー',
    '비주얼 티저와 공개 갤러리',
    'Galerie visuelle pour teaser et reveal',
  ),
  VideoEmbed: buildExactText(
    'Official video embed block',
    '官方视频嵌入模块',
    '官方影片嵌入模組',
    '公式動画の埋め込みブロック',
    '공식 영상 임베드 블록',
    'Bloc video integre officiel',
  ),
  RichText: buildExactText(
    'Reference note block',
    '参考备注块',
    '參考備註塊',
    '参考ノートブロック',
    '참고 노트 블록',
    'Bloc de note de reference',
  ),
  LinkButton: buildExactText(
    'Action button for key fan destinations',
    '用于关键粉丝去向的动作按钮',
    '用於關鍵粉絲去向的動作按鈕',
    '大切なファン導線へつなぐアクションボタン',
    '중요한 팬 동선으로 연결하는 액션 버튼',
    'Bouton d’action pour les destinations fan importantes',
  ),
  MarshmallowWidget: buildExactText(
    'Fan interaction block',
    '粉丝互动模块',
    '粉絲互動模組',
    'ファン交流ブロック',
    '팬 상호작용 블록',
    'Bloc d’interaction fan',
  ),
  Schedule: buildExactText(
    'Structured stage schedule list',
    '结构化舞台日程列表',
    '結構化舞台行程列表',
    '構造化された出演スケジュール',
    '구조화된 스테이지 일정 목록',
    'Liste de planning de scene structuree',
  ),
  MusicPlayer: buildExactText(
    'Featured audio moment',
    '精选音频时刻',
    '精選音訊時刻',
    '注目の音声モーメント',
    '주목할 오디오 순간',
    'Moment audio mis en avant',
  ),
  LiveStatus: buildExactText(
    'Live or launch state banner',
    '直播或上线状态横幅',
    '直播或上線狀態橫幅',
    '配信・公開状況バナー',
    '라이브 또는 런치 상태 배너',
    'Banniere d’etat live ou lancement',
  ),
  Divider: buildExactText(
    'Section divider',
    '分区分隔线',
    '分區分隔線',
    'セクション区切り',
    '섹션 구분선',
    'Separateur de section',
  ),
  Spacer: buildExactText(
    'Breathing room spacer',
    '留白间距块',
    '留白間距塊',
    '余白スペーサー',
    '여백 스페이서',
    'Bloc d’espacement',
  ),
  BilibiliDynamic: buildExactText(
    'Official updates feed',
    '官方动态流',
    '官方動態流',
    '公式更新フィード',
    '공식 업데이트 피드',
    'Flux de mises a jour officielles',
  ),
};

function resolveText(locale: SupportedUiLocale, text: LocalizedText) {
  return text[locale];
}

function getLocaleCoverageLabel(locale: SupportedUiLocale) {
  return pickLocaleText(locale, {
    en: `${SUPPORTED_UI_LOCALES.length} locales ready`,
    zh_HANS: `已覆盖 ${SUPPORTED_UI_LOCALES.length} 个界面语言`,
    zh_HANT: `已覆蓋 ${SUPPORTED_UI_LOCALES.length} 個介面語言`,
    ja: `${SUPPORTED_UI_LOCALES.length} 言語をカバー`,
    ko: `${SUPPORTED_UI_LOCALES.length}개 UI 언어 지원`,
    fr: `${SUPPORTED_UI_LOCALES.length} langues prises en charge`,
  });
}

function getAuthoringDraftStatusTone(
  status: PublicPresenceAuthoringDraftSummary['artifactStatus'],
) {
  return status === 'submitted'
    ? 'rose'
    : status === 'validated'
      ? 'success'
      : 'warning';
}

function getAuthoringDraftStatusLabel(
  locale: SupportedUiLocale,
  status: PublicPresenceAuthoringDraftSummary['artifactStatus'],
) {
  if (status === 'submitted') {
    return pickLocaleText(locale, {
      en: 'Submitted for review',
      zh_HANS: '已提交审核',
      zh_HANT: '已提交審核',
      ja: 'レビュー提出済み',
      ko: '검토 제출됨',
      fr: 'Soumis pour revue',
    });
  }

  if (status === 'validated') {
    return pickLocaleText(locale, {
      en: 'Validated draft',
      zh_HANS: '已完成校验',
      zh_HANT: '已完成驗證',
      ja: '検証済みドラフト',
      ko: '검증된 드래프트',
      fr: 'Brouillon validé',
    });
  }

  return pickLocaleText(locale, {
    en: 'Draft in progress',
    zh_HANS: '草稿进行中',
    zh_HANT: '草稿進行中',
    ja: '作成中のドラフト',
    ko: '작성 중인 드래프트',
    fr: 'Brouillon en cours',
  });
}

function getAuthoringDraftSubjectLabel(
  locale: SupportedUiLocale,
  artifactKind: PublicPresenceAuthoringArtifactKind,
  subjectKey: string,
) {
  if (artifactKind === 'template') {
    if (subjectKey in PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS) {
      return getPublicPresenceTemplateLabel(
        locale,
        PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[subjectKey as PublicPresenceTemplateId],
      );
    }

    return subjectKey === 'new'
      ? pickLocaleText(locale, {
          en: 'New template draft',
          zh_HANS: '新模板草稿',
          zh_HANT: '新模板草稿',
          ja: '新規テンプレートドラフト',
          ko: '새 템플릿 드래프트',
          fr: 'Nouveau brouillon de template',
        })
      : subjectKey;
  }

  if (subjectKey in PUBLIC_PRESENCE_COMPONENT_DEFINITIONS) {
    return getComponentDisplayName(locale, subjectKey as HomepageComponentType);
  }

  return subjectKey === 'new'
    ? pickLocaleText(locale, {
        en: 'New component draft',
        zh_HANS: '新组件草稿',
        zh_HANT: '新元件草稿',
        ja: '新規コンポーネントドラフト',
        ko: '새 컴포넌트 드래프트',
        fr: 'Nouveau brouillon de composant',
      })
    : subjectKey;
}

function buildAuthoringDraftHref(
  tenantId: string,
  talentId: string,
  draft: PublicPresenceAuthoringDraftSummary,
) {
  if (draft.artifactKind === 'template') {
    return draft.subjectKey in PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS
      ? buildPublicPresenceTemplateAuthoringPath(tenantId, talentId, draft.subjectKey)
      : buildPublicPresenceTemplateAuthoringPath(tenantId, talentId);
  }

  return draft.subjectKey in PUBLIC_PRESENCE_COMPONENT_DEFINITIONS
    ? buildPublicPresenceComponentAuthoringPath(tenantId, talentId, draft.subjectKey)
    : buildPublicPresenceComponentAuthoringPath(tenantId, talentId);
}

function getComponentSupportBadgeLabel(
  locale: SupportedUiLocale,
  visualSupport: (typeof PUBLIC_PRESENCE_COMPONENT_DEFINITIONS)[HomepageComponentType]['visualSupport'],
) {
  return visualSupport === 'supported'
    ? pickLocaleText(locale, {
        en: 'Easy to tailor',
        zh_HANS: '容易定制',
        zh_HANT: '容易客製',
        ja: '調整しやすい',
        ko: '쉽게 다듬기',
        fr: 'Facile a ajuster',
      })
    : pickLocaleText(locale, {
        en: 'Custom-crafted',
        zh_HANS: '适合定制创作',
        zh_HANT: '適合客製創作',
        ja: 'カスタム向け',
        ko: '맞춤 제작용',
        fr: 'Pour une création sur mesure',
      });
}

function getComponentFanMomentCopy(
  locale: SupportedUiLocale,
  visualSupport: (typeof PUBLIC_PRESENCE_COMPONENT_DEFINITIONS)[HomepageComponentType]['visualSupport'],
) {
  return visualSupport === 'supported'
    ? pickLocaleText(locale, {
        en: 'Everyday homepage visits and familiar fan touchpoints.',
        zh_HANS: '适合日常主页访问与常用粉丝触点。',
        zh_HANT: '適合日常主頁造訪與常用粉絲觸點。',
        ja: '日常のホームページ訪問や定番のファン接点に向いています。',
        ko: '일상적인 홈페이지 방문과 익숙한 팬 접점에 잘 맞습니다.',
        fr: 'Idéal pour les visites du quotidien et les points de contact fan habituels.',
      })
    : pickLocaleText(locale, {
        en: 'Reveal-day moments, embeds, or special fan features.',
        zh_HANS: '适合揭晓日内容、嵌入模块或特殊粉丝玩法。',
        zh_HANT: '適合揭曉日內容、嵌入模組或特殊粉絲玩法。',
        ja: '公開当日の演出、埋め込み、特別なファン向け機能に向いています。',
        ko: '공개 당일 연출, 임베드, 특별한 팬 기능에 잘 맞습니다.',
        fr: 'Pensé pour les moments de reveal, les embeds ou les fonctions fan spéciales.',
      });
}

function getComponentAdjustmentCopy(
  locale: SupportedUiLocale,
  component: (typeof PUBLIC_PRESENCE_COMPONENT_DEFINITIONS)[HomepageComponentType],
) {
  const editableLabels = component.fieldDefinitions
    .filter((field) => field.visualEditable)
    .map((field) => getPublicPresenceFieldLabel(locale, field.fieldKey));

  if (editableLabels.length === 0) {
    return pickLocaleText(locale, {
      en: 'Use this block as designed on the homepage, or open the Component IDE when you need a custom version.',
      zh_HANS: '可以直接按现成样式放到主页上；如果需要定制版本，再打开组件 IDE。',
      zh_HANT: '可以直接按現成樣式放到主頁上；若需要客製版本，再打開元件 IDE。',
      ja: 'このブロックはそのままホームページで使えます。独自版が必要なときだけコンポーネント IDE を開きます。',
      ko: '이 블록은 기본 형태로 바로 쓸 수 있고, 맞춤 버전이 필요할 때만 컴포넌트 IDE를 엽니다.',
      fr: 'Utilisez ce bloc tel quel sur la page, puis ouvrez l’IDE composant seulement si vous avez besoin d’une version sur mesure.',
    });
  }

  return pickLocaleText(locale, {
    en: `Creators can adjust ${editableLabels.join(', ')} before the block goes live.`,
    zh_HANS: `创作者可以在上线前调整 ${editableLabels.join('、')}。`,
    zh_HANT: `創作者可以在上線前調整 ${editableLabels.join('、')}。`,
    ja: `公開前に ${editableLabels.join('、')} を調整できます。`,
    ko: `공개 전에 ${editableLabels.join(', ')} 항목을 조정할 수 있습니다.`,
    fr: `Les créateurs peuvent ajuster ${editableLabels.join(', ')} avant la mise en ligne.`,
  });
}

function getComponentNextStepCopy(
  locale: SupportedUiLocale,
  component: (typeof PUBLIC_PRESENCE_COMPONENT_DEFINITIONS)[HomepageComponentType],
) {
  return component.fieldDefinitions.some((field) => field.visualEditable)
    ? pickLocaleText(locale, {
        en: 'Next step: open the Component IDE to tailor the block and review the live sample.',
        zh_HANS: '下一步：打开组件 IDE，定制这个模块并查看实时样例。',
        zh_HANT: '下一步：打開元件 IDE，客製這個模組並查看即時樣例。',
        ja: '次の一歩: コンポーネント IDE を開いて、このブロックを整えながらライブサンプルを確認します。',
        ko: '다음 단계: 컴포넌트 IDE를 열어 이 블록을 다듬고 라이브 샘플을 확인합니다.',
        fr: 'Étape suivante : ouvrez l’IDE composant pour ajuster ce bloc et revoir l’échantillon live.',
      })
    : pickLocaleText(locale, {
        en: 'Next step: open the Component IDE only when this homepage moment needs a custom-crafted version.',
        zh_HANS: '下一步：只有在这个主页场景需要定制版本时，再打开组件 IDE。',
        zh_HANT: '下一步：只有在這個主頁場景需要客製版本時，再打開元件 IDE。',
        ja: '次の一歩: このホームページ演出に独自版が必要なときだけコンポーネント IDE を開きます。',
        ko: '다음 단계: 이 홈페이지 장면에 맞춤 버전이 필요할 때만 컴포넌트 IDE를 엽니다.',
        fr: 'Étape suivante : ouvrez l’IDE composant seulement si ce moment de page demande une version sur mesure.',
      });
}

const TEMPLATE_READINESS_RULE_COPY: Record<string, LocalizedText> = {
  requiresOfficialChannels: buildExactText(
    'Official channels need at least one trusted destination before launch.',
    '上线前需要至少一个可信的官方渠道入口。',
    '上線前需要至少一個可信的官方渠道入口。',
    '公開前に、信頼できる公式導線を少なくとも一つ用意します。',
    '런치 전에 신뢰할 수 있는 공식 채널 연결이 최소 하나 필요합니다.',
    'Au moins un canal officiel fiable doit être prêt avant le lancement.',
  ),
  requiresFirstEncounter: buildExactText(
    'First encounter needs the opening headline and intro moment ready.',
    '首屏相遇区需要准备好开场标题与简介内容。',
    '首屏相遇區需要準備好開場標題與簡介內容。',
    'ファーストビューには、導入見出しと紹介要素が必要です。',
    '첫 만남 구역에는 도입 헤드라인과 소개 장면이 준비되어야 합니다.',
    'La première impression doit inclure un titre d’ouverture et une introduction prêtes.',
  ),
  requiresCountdownReveal: buildExactText(
    'Countdown and reveal moments need a complete launch sequence.',
    '倒计时与揭晓场景需要完整的上线节奏。',
    '倒數與揭曉場景需要完整的上線節奏。',
    'カウントダウンと公開演出には、完成した公開シーケンスが必要です。',
    '카운트다운과 공개 장면에는 완성된 런치 시퀀스가 필요합니다.',
    'Le compte à rebours et le reveal ont besoin d’une séquence de lancement complète.',
  ),
  requiresRevealSafeNaming: buildExactText(
    'Reveal naming needs the fan-facing display name locked in.',
    '揭晓页命名需要先确定面向粉丝的展示名称。',
    '揭曉頁命名需要先確定面向粉絲的展示名稱。',
    '公開ページの名称には、ファン向け表示名の確定が必要です。',
    '공개 페이지 명칭에는 팬이 보는 표시 이름 확정이 필요합니다.',
    'Le nom du reveal doit être finalisé avec l’intitulé visible par les fans.',
  ),
};

function getTemplatePersonaFieldLabels(
  locale: SupportedUiLocale,
  template: (typeof PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS)[PublicPresenceTemplateId],
) {
  return template.personaKitFields.map((fieldKey) => getPublicPresenceFieldLabel(locale, fieldKey));
}

function getTemplateReadinessRuleLabel(locale: SupportedUiLocale, rule: string) {
  const localizedRule = TEMPLATE_READINESS_RULE_COPY[rule];

  if (localizedRule) {
    return resolveText(locale, localizedRule);
  }

  return pickLocaleText(locale, {
    en: 'One launch-readiness checkpoint needs a closer IDE review.',
    zh_HANS: '有一项上线前检查需要在 IDE 中进一步确认。',
    zh_HANT: '有一項上線前檢查需要在 IDE 中進一步確認。',
    ja: '公開準備の確認項目のうち一つは、IDE で詳しく見直す必要があります。',
    ko: '런치 전 점검 항목 중 하나는 IDE에서 더 자세히 확인해야 합니다.',
    fr: 'Un point de readiness demande un contrôle plus poussé dans l’IDE.',
  });
}

function getTemplateReadinessRuleLabels(
  locale: SupportedUiLocale,
  template: (typeof PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS)[PublicPresenceTemplateId],
) {
  return template.validationRules.map((rule) => getTemplateReadinessRuleLabel(locale, rule));
}

function getTemplateIdeHint(locale: SupportedUiLocale) {
  return pickLocaleText(locale, {
    en: 'Opens the full Template IDE with this layout loaded as your starting point.',
    zh_HANS: '会打开完整的模板 IDE，并把这个布局作为起始方案载入。',
    zh_HANT: '會打開完整的模板 IDE，並把這個版型作為起始方案載入。',
    ja: 'このレイアウトを出発点として、フルサイズの Template IDE を開きます。',
    ko: '이 레이아웃을 시작점으로 불러온 전체 Template IDE를 엽니다.',
    fr: 'Ouvre l’IDE Template complet avec ce layout chargé comme point de départ.',
  });
}

function getComponentIdeHint(locale: SupportedUiLocale) {
  return pickLocaleText(locale, {
    en: 'Opens the full Component IDE with this block loaded as your starting point.',
    zh_HANS: '会打开完整的组件 IDE，并把这个模块作为起始方案载入。',
    zh_HANT: '會打開完整的元件 IDE，並把這個模組作為起始方案載入。',
    ja: 'このブロックを出発点として、フルサイズの Component IDE を開きます。',
    ko: '이 블록을 시작점으로 불러온 전체 Component IDE를 엽니다.',
    fr: 'Ouvre l’IDE Component complet avec ce bloc chargé comme point de départ.',
  });
}

function SurfaceCommandLink({
  href,
  icon,
  label,
  tone = 'neutral',
}: Readonly<{
  href: string;
  icon: React.ReactNode;
  label: string;
  tone?: 'neutral' | 'primary';
}>) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        tone === 'primary'
          ? 'border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function buildScopedActionLabel(
  _locale: SupportedUiLocale,
  action: string,
  subject: string,
) {
  return `${action}: ${subject}`;
}

function getComponentDisplayName(
  _locale: SupportedUiLocale,
  componentType: HomepageComponentType,
) {
  return componentType.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

export function useHomepageSurfaceNavigation(
  tenantId: string,
  talentId: string,
) {
  const { locale } = useUiLocale();

  return useMemo<SurfaceNavItem[]>(
    () => [
      {
        id: 'management',
        href: buildPublicPresenceHomepageSurfacePath(tenantId, talentId, 'management'),
        label: getHomepageSurfaceLabel(locale, 'management'),
        description: pickLocaleText(locale, {
          en: 'Route, readiness, release state, and launch actions.',
          zh_HANS: '路由、就绪度、发布状态与启动动作。',
          zh_HANT: '路由、就緒度、發佈狀態與啟動動作。',
          ja: 'ルート、準備状況、公開状態、起動アクション。',
          ko: '라우트, 준비도, 공개 상태, 실행 액션.',
          fr: 'Route, preparation, etat de publication et actions de lancement.',
        }),
      },
      {
        id: 'templates',
        href: buildPublicPresenceHomepageSurfacePath(tenantId, talentId, 'templates'),
        label: getHomepageSurfaceLabel(locale, 'templates'),
        description: pickLocaleText(locale, {
          en: 'Curated page layouts, preview samples, and template authoring entry.',
          zh_HANS: '精选页面布局、预览样例与模板创作入口。',
          zh_HANT: '精選頁面版型、預覽樣例與模板創作入口。',
          ja: '厳選レイアウト、プレビュー用サンプル、テンプレート制作入口。',
          ko: '큐레이션된 페이지 레이아웃, 프리뷰 샘플, 템플릿 제작 진입점.',
          fr: 'Layouts choisis, apercus d’exemple et entree d’auteur de template.',
        }),
      },
      {
        id: 'components',
        href: buildPublicPresenceHomepageSurfacePath(tenantId, talentId, 'components'),
        label: getHomepageSurfaceLabel(locale, 'components'),
        description: pickLocaleText(locale, {
          en: 'Homepage building blocks, live samples, and component authoring entry.',
          zh_HANS: '主页构件、实时样例与组件创作入口。',
          zh_HANT: '主頁構件、即時樣例與元件創作入口。',
          ja: 'ホームページ構成ブロック、ライブサンプル、コンポーネント制作入口。',
          ko: '홈페이지 블록, 라이브 샘플, 컴포넌트 제작 진입점.',
          fr: 'Blocs de page, échantillons live et entrée d’authoring composant.',
        }),
      },
    ],
    [locale, talentId, tenantId],
  );
}

export function HomepageSurfaceMenu({
  activeSurface,
  tenantId,
  talentId,
}: Readonly<{
  activeSurface: HomepageSurfaceId;
  talentId: string;
  tenantId: string;
}>) {
  const { locale } = useUiLocale();
  const items = useHomepageSurfaceNavigation(tenantId, talentId);

  return (
    <PublicPresenceSurface className="px-4 py-3" data-testid="homepage-surface-menu">
      <div className="flex flex-wrap items-center gap-2">
        <PublicPresenceBadge icon={<LayoutTemplate className="h-4 w-4" aria-hidden="true" />} tone="rose">
          {pickLocaleText(locale, {
            en: 'Homepage',
            zh_HANS: '主页',
            zh_HANT: '主頁',
            ja: 'ホームページ',
            ko: '홈페이지',
            fr: 'Homepage',
          })}
        </PublicPresenceBadge>
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={activeSurface === item.id ? 'page' : undefined}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeSurface === item.id
                ? 'border-rose-300 bg-rose-50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
            title={item.description}
          >
            <span className="text-slate-950">{item.label}</span>
          </Link>
        ))}
      </div>
    </PublicPresenceSurface>
  );
}

function AuthoringDraftActivityPanel({
  artifactKind,
  drafts,
  locale,
  talentId,
  tenantId,
}: Readonly<{
  artifactKind: PublicPresenceAuthoringArtifactKind;
  drafts: PublicPresenceAuthoringDraftSummary[];
  locale: SupportedUiLocale;
  talentId: string;
  tenantId: string;
}>) {
  if (drafts.length === 0) {
    return null;
  }

  return (
    <PublicPresenceSurface className="space-y-4" variant="inset">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-950">
          {pickLocaleText(locale, {
            en: 'Recent draft activity',
            zh_HANS: '最近草稿动态',
            zh_HANT: '最近草稿動態',
            ja: '最近のドラフト状況',
            ko: '최근 드래프트 활동',
            fr: 'Activité récente des brouillons',
          })}
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          {artifactKind === 'template'
            ? pickLocaleText(locale, {
                en: 'Return to saved template work without losing the latest draft state.',
                zh_HANS: '可以从这里回到已保存的模板创作，不会丢失最近一次草稿状态。',
                zh_HANT: '可以從這裡回到已儲存的模板創作，不會遺失最近一次草稿狀態。',
                ja: '保存済みのテンプレート作業に戻り、最新ドラフト状態をそのまま引き継げます。',
                ko: '저장한 템플릿 작업으로 돌아가 최신 드래프트 상태를 그대로 이어갈 수 있습니다.',
                fr: 'Reprenez un travail de template déjà enregistré sans perdre le dernier état du brouillon.',
              })
            : pickLocaleText(locale, {
                en: 'Return to saved component work without losing the latest draft state.',
                zh_HANS: '可以从这里回到已保存的组件创作，不会丢失最近一次草稿状态。',
                zh_HANT: '可以從這裡回到已儲存的元件創作，不會遺失最近一次草稿狀態。',
                ja: '保存済みのコンポーネント作業に戻り、最新ドラフト状態をそのまま引き継げます。',
                ko: '저장한 컴포넌트 작업으로 돌아가 최신 드래프트 상태를 그대로 이어갈 수 있습니다.',
                fr: 'Reprenez un travail de composant déjà enregistré sans perdre le dernier état du brouillon.',
              })}
        </p>
      </div>
      <div className="space-y-3">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="rounded-3xl border border-slate-200 bg-white px-4 py-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <PublicPresenceBadge tone="slate" variant="outline">
                {getAuthoringDraftSubjectLabel(locale, draft.artifactKind, draft.subjectKey)}
              </PublicPresenceBadge>
              <PublicPresenceBadge
                tone={getAuthoringDraftStatusTone(draft.artifactStatus)}
                variant="outline"
              >
                {getAuthoringDraftStatusLabel(locale, draft.artifactStatus)}
              </PublicPresenceBadge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {pickLocaleText(locale, {
                en: 'Last saved',
                zh_HANS: '最近保存',
                zh_HANT: '最近儲存',
                ja: '最終保存',
                ko: '마지막 저장',
                fr: 'Dernière sauvegarde',
              })}{' '}
              {formatLocaleDateTime(locale, draft.lastSavedAt, draft.lastSavedAt)}
            </p>
            <div className="mt-3">
              <SurfaceCommandLink
                href={buildAuthoringDraftHref(tenantId, talentId, draft)}
                icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
                label={pickLocaleText(locale, {
                  en: 'Open saved draft',
                  zh_HANS: '打开已保存草稿',
                  zh_HANT: '打開已儲存草稿',
                  ja: '保存済みドラフトを開く',
                  ko: '저장된 드래프트 열기',
                  fr: 'Ouvrir le brouillon enregistré',
                })}
                tone="primary"
              />
            </div>
          </div>
        ))}
      </div>
    </PublicPresenceSurface>
  );
}

export function TemplateCenterScreen({
  talentId,
  tenantId,
}: Readonly<{
  talentId: string;
  tenantId: string;
}>) {
  const { locale } = useUiLocale();
  const { request } = useSession();
  const [inspectTemplateId, setInspectTemplateId] = useState<PublicPresenceTemplateId | null>(null);
  const [templateDrafts, setTemplateDrafts] = useState<PublicPresenceAuthoringDraftSummary[]>([]);
  const inspectTemplateDrawerId = useId();
  const templates = Object.values(PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS);
  const inspectTemplate = inspectTemplateId
    ? PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[inspectTemplateId]
    : null;
  const inspectTemplateOpen = Boolean(inspectTemplate);
  const inspectTemplateOverlay = useOverlayFocusManager({
    onClose: () => setInspectTemplateId(null),
    open: inspectTemplateOpen,
  });
  const templateDraftsBySubject = useMemo(
    () => new Map(templateDrafts.map((draft) => [draft.subjectKey, draft])),
    [templateDrafts],
  );
  const unmatchedTemplateDrafts = useMemo(
    () =>
      templateDrafts.filter(
        (draft) => !(draft.subjectKey in PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS),
      ),
    [templateDrafts],
  );

  useEffect(() => {
    let cancelled = false;

    void listPublicPresenceAuthoringDrafts(request, talentId, 'template')
      .then((drafts) => {
        if (!cancelled && drafts.length > 0) {
          setTemplateDrafts(drafts);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [request, talentId]);

  return (
    <PublicPresenceShell decorationDensity="calm">
      <div className="space-y-4">
        <HomepageSurfaceMenu activeSurface="templates" talentId={talentId} tenantId={tenantId} />

        <PublicPresenceSurface
          className="sticky top-4 z-20 px-4 py-3"
          data-testid="template-center-topbar"
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-2 lg:flex-nowrap">
              <PublicPresenceBadge icon={<LayoutTemplate className="h-4 w-4" aria-hidden="true" />} tone="rose">
                {getHomepageSurfaceLabel(locale, 'templates')}
              </PublicPresenceBadge>
              <PublicPresenceBadge tone="slate" variant="outline">
                {getLocaleCoverageLabel(locale)}
              </PublicPresenceBadge>
              <p className="min-w-0 text-sm font-medium text-slate-600 lg:flex-1">
                {pickLocaleText(locale, {
                  en: 'Curated layouts for launch and always-on fan pages.',
                  zh_HANS: '面向上线与常驻粉丝主页的精选布局。',
                  zh_HANT: '面向上線與常駐粉絲主頁的精選版型。',
                  ja: '公開演出用と常設ファンページ向けの厳選レイアウト。',
                  ko: '런치와 상시 팬 페이지를 위한 큐레이션 레이아웃.',
                  fr: 'Layouts choisis pour les lancements et les pages fan permanentes.',
                })}
              </p>
            </div>
            <SurfaceCommandLink
              href={buildPublicPresenceTemplateAuthoringPath(tenantId, talentId)}
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              label={getHomepageSurfaceActionLabel(locale, 'addTemplate')}
              tone="primary"
            />
          </div>
        </PublicPresenceSurface>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_16rem] 2xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3" data-testid="template-center-catalog">
            {templates.map((template) => (
              <PublicPresenceSurface
                key={template.templateId}
                className="space-y-4"
                data-testid={`template-card-${template.templateId}`}
              >
                {(() => {
                  const templateDraft = templateDraftsBySubject.get(template.templateId);

                  return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <PublicPresenceBadge tone="rose" variant="outline">
                      {getPublicPresenceTemplateLabel(locale, template)}
                    </PublicPresenceBadge>
                    <PublicPresenceBadge tone="success" variant="outline">
                      {pickLocaleText(locale, {
                        en: 'Registered',
                        zh_HANS: '已注册',
                        zh_HANT: '已註冊',
                        ja: '登録済み',
                        ko: '등록됨',
                        fr: 'Enregistre',
                      })}
                    </PublicPresenceBadge>
                    {templateDraft ? (
                      <PublicPresenceBadge
                        tone={getAuthoringDraftStatusTone(templateDraft.artifactStatus)}
                        variant="outline"
                      >
                        {getAuthoringDraftStatusLabel(locale, templateDraft.artifactStatus)}
                      </PublicPresenceBadge>
                    ) : null}
                  </div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {getPublicPresenceTemplateUseCase(locale, template)}
                  </h2>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Preview anatomy',
                        zh_HANS: '预览结构',
                        zh_HANT: '預覽結構',
                        ja: 'プレビュー構造',
                        ko: '프리뷰 구조',
                        fr: 'Aperçu de l’anatomie',
                      })}
                    </p>
                    <p className="mt-2">
                      {template.defaultSectionOrder
                        .slice(0, 4)
                        .map((section) =>
                          getPublicPresenceStageSectionLabel(locale, { kind: section }),
                        )
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-900">
                        {pickLocaleText(locale, {
                          en: 'Required sections:',
                          zh_HANS: '必填分区：',
                          zh_HANT: '必填分區：',
                          ja: '必須セクション:',
                          ko: '필수 섹션:',
                          fr: 'Sections requises :',
                        })}
                      </span>{' '}
                      {template.requiredSections
                        .map((section) =>
                          getPublicPresenceStageSectionLabel(locale, { kind: section }),
                        )
                        .join(', ')}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">
                        {pickLocaleText(locale, {
                          en: 'Page type:',
                          zh_HANS: '页面类型：',
                          zh_HANT: '頁面類型：',
                          ja: 'ページ種別:',
                          ko: '페이지 유형:',
                          fr: 'Type de page :',
                        })}
                      </span>{' '}
                      {getPublicPresenceTemplateUseCase(locale, template)}
                    </p>
                  </div>
                </div>
                  );
                })()}
                <div className="flex flex-wrap items-center gap-2">
                  <SurfaceCommandLink
                    href={buildPublicPresenceStudioPreviewPath(tenantId, talentId, template.templateId)}
                    icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                    label={buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'viewPreview'),
                      getPublicPresenceTemplateLabel(locale, template),
                    )}
                  />
                  <button
                    type="button"
                    aria-controls={inspectTemplateDrawerId}
                    aria-expanded={inspectTemplateId === template.templateId}
                    ref={inspectTemplateId === template.templateId ? inspectTemplateOverlay.fallbackTriggerRef : undefined}
                    onClick={(event) => {
                      inspectTemplateOverlay.registerTrigger(event.currentTarget);
                      setInspectTemplateId(template.templateId);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'inspect'),
                      getPublicPresenceTemplateLabel(locale, template),
                    )}
                  </button>
                  <SurfaceCommandLink
                    href={buildPublicPresenceTemplateAuthoringPath(tenantId, talentId, template.templateId)}
                    icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
                    label={buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'openTemplateIde'),
                      getPublicPresenceTemplateLabel(locale, template),
                    )}
                    tone="primary"
                  />
                </div>
              </PublicPresenceSurface>
            ))}
          </div>

          {inspectTemplate ? (
            <PublicPresenceSurface
              aria-label={getHomepageSurfaceActionLabel(locale, 'inspectTemplate')}
              aria-modal={false}
              className="fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl xl:sticky xl:top-24 xl:z-10 xl:max-h-[34rem] xl:w-full xl:self-start"
              data-testid="template-inspect-drawer"
              id={inspectTemplateDrawerId}
              role="dialog"
              variant="inset"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {getHomepageSurfaceActionLabel(locale, 'inspectTemplate')}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {getPublicPresenceTemplateUseCase(locale, inspectTemplate)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={pickLocaleText(locale, {
                    en: 'Close template inspection',
                    zh_HANS: '关闭模板检查',
                    zh_HANT: '關閉模板檢查',
                    ja: 'テンプレート確認を閉じる',
                    ko: '템플릿 검토 닫기',
                    fr: 'Fermer l’inspection du template',
                  })}
                  onClick={() => setInspectTemplateId(null)}
                  ref={inspectTemplateOverlay.desktopInitialFocusRef}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PublicPresenceBadge tone="rose">
                    {getPublicPresenceTemplateLabel(locale, inspectTemplate)}
                  </PublicPresenceBadge>
                  <PublicPresenceBadge tone="slate" variant="outline">
                    {pickLocaleText(locale, {
                      en: 'Curated layout',
                      zh_HANS: '精选布局',
                      zh_HANT: '精選版型',
                      ja: '厳選レイアウト',
                      ko: '큐레이션된 레이아웃',
                      fr: 'Layout choisi',
                    })}
                  </PublicPresenceBadge>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">
                    {pickLocaleText(locale, {
                      en: 'Section flow',
                      zh_HANS: '分区流程',
                      zh_HANT: '分區流程',
                      ja: 'セクションの流れ',
                      ko: '섹션 흐름',
                      fr: 'Flux des sections',
                    })}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {inspectTemplate.defaultSectionOrder.map((section) => (
                      <PublicPresenceBadge key={section} tone="slate" variant="outline">
                        {getPublicPresenceStageSectionLabel(locale, { kind: section })}
                      </PublicPresenceBadge>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 text-sm text-slate-600">
                  <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Persona Kit focus',
                        zh_HANS: '人设聚焦',
                        zh_HANT: '人設聚焦',
                        ja: 'Persona Kit の要点',
                        ko: 'Persona Kit 초점',
                        fr: 'Focus Persona Kit',
                      })}
                    </p>
                    <p className="mt-2">
                      {getTemplatePersonaFieldLabels(locale, inspectTemplate).join(' · ')}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Launch-readiness checkpoints',
                        zh_HANS: '上线前检查点',
                        zh_HANT: '上線前檢查點',
                        ja: '公開前チェック',
                        ko: '런치 전 점검',
                        fr: 'Points de readiness',
                      })}
                    </p>
                    <div className="mt-2 space-y-2">
                      {getTemplateReadinessRuleLabels(locale, inspectTemplate).map((ruleLabel) => (
                        <p key={ruleLabel}>{ruleLabel}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Use this layout',
                        zh_HANS: '使用这个布局',
                        zh_HANT: '使用這個版型',
                        ja: 'このレイアウトを使う',
                        ko: '이 레이아웃 사용',
                        fr: 'Utiliser ce layout',
                      })}
                    </p>
                    <p className="mt-2">{getTemplateIdeHint(locale)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <SurfaceCommandLink
                        href={buildPublicPresenceStudioPreviewPath(tenantId, talentId, inspectTemplate.templateId)}
                        icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                        label={getHomepageSurfaceActionLabel(locale, 'viewPreview')}
                      />
                      <SurfaceCommandLink
                        href={buildPublicPresenceTemplateAuthoringPath(tenantId, talentId, inspectTemplate.templateId)}
                        icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
                        label={getHomepageSurfaceActionLabel(locale, 'openTemplateIde')}
                        tone="primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PublicPresenceSurface>
          ) : (
            <div className="space-y-4">
              <AuthoringDraftActivityPanel
                artifactKind="template"
                drafts={unmatchedTemplateDrafts}
                locale={locale}
                talentId={talentId}
                tenantId={tenantId}
              />
              <PublicPresenceSurface className="space-y-4" variant="inset">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {getHomepageSurfaceActionLabel(locale, 'inspectTemplate')}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {pickLocaleText(locale, {
                      en: 'Choose a template card to compare section flow, Persona Kit focus, and launch-readiness checkpoints.',
                      zh_HANS: '选择一个模板卡片，比较分区流程、人设聚焦与上线前检查点。',
                      zh_HANT: '選擇一個模板卡片，比較分區流程、人設聚焦與上線前檢查點。',
                      ja: 'テンプレートカードを選ぶと、セクションの流れ、Persona Kit の要点、公開前チェックを比較できます。',
                      ko: '템플릿 카드를 선택하면 섹션 흐름, Persona Kit 초점, 런치 전 점검을 비교할 수 있습니다.',
                      fr: 'Choisissez une carte pour comparer le flux des sections, le focus Persona Kit et les points de readiness.',
                    })}
                  </p>
                </div>
              </PublicPresenceSurface>
            </div>
          )}
        </div>
      </div>
    </PublicPresenceShell>
  );
}

export function ComponentStoreScreen({
  talentId,
  tenantId,
}: Readonly<{
  talentId: string;
  tenantId: string;
}>) {
  const { locale } = useUiLocale();
  const { request } = useSession();
  const [inspectComponentType, setInspectComponentType] = useState<HomepageComponentType | null>(null);
  const [componentDrafts, setComponentDrafts] = useState<PublicPresenceAuthoringDraftSummary[]>([]);
  const inspectComponentDrawerId = useId();
  const components = Object.values(PUBLIC_PRESENCE_COMPONENT_DEFINITIONS);
  const inspectComponent = inspectComponentType
    ? PUBLIC_PRESENCE_COMPONENT_DEFINITIONS[inspectComponentType]
    : null;
  const inspectComponentOpen = Boolean(inspectComponentType);
  const inspectComponentOverlay = useOverlayFocusManager({
    onClose: () => setInspectComponentType(null),
    open: inspectComponentOpen,
  });
  const componentDraftsBySubject = useMemo(
    () => new Map(componentDrafts.map((draft) => [draft.subjectKey, draft])),
    [componentDrafts],
  );
  const unmatchedComponentDrafts = useMemo(
    () =>
      componentDrafts.filter(
        (draft) => !(draft.subjectKey in PUBLIC_PRESENCE_COMPONENT_DEFINITIONS),
      ),
    [componentDrafts],
  );

  useEffect(() => {
    let cancelled = false;

    void listPublicPresenceAuthoringDrafts(request, talentId, 'component')
      .then((drafts) => {
        if (!cancelled && drafts.length > 0) {
          setComponentDrafts(drafts);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [request, talentId]);

  return (
    <PublicPresenceShell decorationDensity="calm">
      <div className="space-y-4">
        <HomepageSurfaceMenu activeSurface="components" talentId={talentId} tenantId={tenantId} />

        <PublicPresenceSurface
          className="sticky top-4 z-20 px-4 py-3"
          data-testid="component-store-topbar"
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-2 lg:flex-nowrap">
              <PublicPresenceBadge icon={<Package2 className="h-4 w-4" aria-hidden="true" />} tone="rose">
                {getHomepageSurfaceLabel(locale, 'components')}
              </PublicPresenceBadge>
              <PublicPresenceBadge tone="slate" variant="outline">
                {getLocaleCoverageLabel(locale)}
              </PublicPresenceBadge>
              <p className="min-w-0 text-sm font-medium text-slate-600 lg:flex-1">
                {pickLocaleText(locale, {
                  en: 'Homepage building blocks for everyday visits, launches, and special fan moments.',
                  zh_HANS: '面向日常访问、上线时刻与特殊粉丝场景的主页构件。',
                  zh_HANT: '面向日常造訪、上線時刻與特殊粉絲場景的主頁構件。',
                  ja: '日常の訪問、公開の瞬間、特別なファン体験に使うホームページ構成ブロックです。',
                  ko: '일상 방문, 런치 순간, 특별한 팬 장면을 위한 홈페이지 블록입니다.',
                  fr: 'Des blocs de page pour les visites du quotidien, les lancements et les moments fan spéciaux.',
                })}
              </p>
            </div>
            <SurfaceCommandLink
              href={buildPublicPresenceComponentAuthoringPath(tenantId, talentId)}
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              label={getHomepageSurfaceActionLabel(locale, 'addComponent')}
              tone="primary"
            />
          </div>
        </PublicPresenceSurface>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3" data-testid="component-store-catalog">
            {components.map((component) => (
              <PublicPresenceSurface
                key={component.componentType}
                className="space-y-4"
                data-testid={`component-card-${component.componentType}`}
              >
                {(() => {
                  const componentDraft = componentDraftsBySubject.get(component.componentType);

                  return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <PublicPresenceBadge tone="rose" variant="outline">
                      {getComponentDisplayName(locale, component.componentType)}
                    </PublicPresenceBadge>
                    <PublicPresenceBadge tone="slate" variant="outline">
                      {component.visualSupport === 'supported'
                        ? pickLocaleText(locale, {
                            en: 'Launch staple',
                            zh_HANS: '常用主页组件',
                            zh_HANT: '常用主頁元件',
                            ja: '定番ホームページ要素',
                            ko: '기본 홈페이지 요소',
                            fr: 'Composant de base pour la page',
                          })
                        : pickLocaleText(locale, {
                            en: 'Special moment',
                            zh_HANS: '特殊场景组件',
                            zh_HANT: '特殊場景元件',
                            ja: '特別な場面向け',
                            ko: '특수 장면용',
                          fr: 'Composant pour moment special',
                        })}
                    </PublicPresenceBadge>
                    {componentDraft ? (
                      <PublicPresenceBadge
                        tone={getAuthoringDraftStatusTone(componentDraft.artifactStatus)}
                        variant="outline"
                      >
                        {getAuthoringDraftStatusLabel(locale, componentDraft.artifactStatus)}
                      </PublicPresenceBadge>
                    ) : null}
                  </div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {resolveText(locale, COMPONENT_PREVIEW_COPY[component.componentType])}
                  </h2>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'What fans notice',
                        zh_HANS: '粉丝首先会注意到',
                        zh_HANT: '粉絲首先會注意到',
                        ja: 'ファンが最初に受け取る印象',
                        ko: '팬이 먼저 느끼는 요소',
                        fr: 'Ce que les fans remarquent',
                      })}
                    </p>
                    <p className="mt-2">{resolveText(locale, COMPONENT_PREVIEW_COPY[component.componentType])}</p>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-900">
                        {pickLocaleText(locale, {
                          en: 'Best for:',
                          zh_HANS: '适合用于：',
                          zh_HANT: '適合用於：',
                          ja: '向いている使い方:',
                          ko: '잘 맞는 상황:',
                          fr: 'Idéal pour :',
                        })}
                      </span>{' '}
                      {getComponentFanMomentCopy(locale, component.visualSupport)}
                    </p>
                  </div>
                </div>
                  );
                })()}
                <div className="flex flex-wrap items-center gap-2">
                  <SurfaceCommandLink
                    href={buildPublicPresenceStudioPreviewPath(tenantId, talentId)}
                    icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                    label={buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'viewPreview'),
                      getComponentDisplayName(locale, component.componentType),
                    )}
                  />
                  <button
                    type="button"
                    aria-controls={inspectComponentDrawerId}
                    aria-expanded={inspectComponentType === component.componentType}
                    ref={inspectComponentType === component.componentType ? inspectComponentOverlay.fallbackTriggerRef : undefined}
                    onClick={(event) => {
                      inspectComponentOverlay.registerTrigger(event.currentTarget);
                      const card = event.currentTarget.closest('[data-testid^="component-card-"]');

                      if (card instanceof HTMLElement && typeof card.scrollIntoView === 'function') {
                        card.scrollIntoView({ block: 'center', inline: 'nearest' });
                      }

                      setInspectComponentType(component.componentType);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'inspect'),
                      getComponentDisplayName(locale, component.componentType),
                    )}
                  </button>
                  <SurfaceCommandLink
                    href={buildPublicPresenceComponentAuthoringPath(tenantId, talentId, component.componentType)}
                    icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
                    label={buildScopedActionLabel(
                      locale,
                      getHomepageSurfaceActionLabel(locale, 'openComponentIde'),
                      getComponentDisplayName(locale, component.componentType),
                    )}
                    tone="primary"
                  />
                </div>
              </PublicPresenceSurface>
            ))}
          </div>

          {inspectComponent ? (
            <PublicPresenceSurface
              aria-label={getHomepageSurfaceActionLabel(locale, 'inspectComponent')}
              aria-modal={false}
              className="fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl xl:sticky xl:top-24 xl:z-10 xl:max-h-[34rem] xl:w-full xl:self-start"
              data-testid="component-inspect-drawer"
              id={inspectComponentDrawerId}
              role="dialog"
              variant="inset"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {getHomepageSurfaceActionLabel(locale, 'inspectComponent')}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {resolveText(locale, COMPONENT_PREVIEW_COPY[inspectComponent.componentType])}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={pickLocaleText(locale, {
                    en: 'Close component inspection',
                    zh_HANS: '关闭组件检查',
                    zh_HANT: '關閉元件檢查',
                    ja: 'コンポーネント確認を閉じる',
                    ko: '컴포넌트 검토 닫기',
                    fr: 'Fermer l’inspection du composant',
                  })}
                  onClick={() => setInspectComponentType(null)}
                  ref={inspectComponentOverlay.desktopInitialFocusRef}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PublicPresenceBadge tone="rose">
                    {getComponentDisplayName(locale, inspectComponent.componentType)}
                  </PublicPresenceBadge>
                  <PublicPresenceBadge tone="slate" variant="outline">
                    {getComponentSupportBadgeLabel(locale, inspectComponent.visualSupport)}
                  </PublicPresenceBadge>
                </div>
                <div className="grid gap-3 text-sm text-slate-600">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'What fans notice',
                        zh_HANS: '粉丝首先会注意到',
                        zh_HANT: '粉絲首先會注意到',
                        ja: 'ファンが最初に受け取る印象',
                        ko: '팬이 먼저 느끼는 요소',
                        fr: 'Ce que les fans remarquent',
                      })}
                    </p>
                    <p className="mt-2">{resolveText(locale, COMPONENT_PREVIEW_COPY[inspectComponent.componentType])}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Best for',
                        zh_HANS: '适合场景',
                        zh_HANT: '適合場景',
                        ja: '向いている場面',
                        ko: '잘 맞는 장면',
                        fr: 'Idéal pour',
                      })}
                    </p>
                    <p className="mt-2">{getComponentFanMomentCopy(locale, inspectComponent.visualSupport)}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Creator controls',
                        zh_HANS: '创作者可控项',
                        zh_HANT: '創作者可控項',
                        ja: 'クリエイターが調整できる内容',
                        ko: '크리에이터가 조정할 수 있는 항목',
                        fr: 'Réglages créateur',
                      })}
                    </p>
                    <p className="mt-2">{getComponentAdjustmentCopy(locale, inspectComponent)}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {pickLocaleText(locale, {
                        en: 'Use this block',
                        zh_HANS: '使用这个模块',
                        zh_HANT: '使用這個模組',
                        ja: 'このブロックを使う',
                        ko: '이 블록 사용',
                        fr: 'Utiliser ce bloc',
                      })}
                    </p>
                    <p className="mt-2">{getComponentIdeHint(locale)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <SurfaceCommandLink
                        href={buildPublicPresenceStudioPreviewPath(tenantId, talentId)}
                        icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                        label={getHomepageSurfaceActionLabel(locale, 'viewPreview')}
                      />
                      <SurfaceCommandLink
                        href={buildPublicPresenceComponentAuthoringPath(tenantId, talentId, inspectComponent.componentType)}
                        icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
                        label={getHomepageSurfaceActionLabel(locale, 'openComponentIde')}
                        tone="primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PublicPresenceSurface>
          ) : (
            <div className="space-y-4">
              <AuthoringDraftActivityPanel
                artifactKind="component"
                drafts={unmatchedComponentDrafts}
                locale={locale}
                talentId={talentId}
                tenantId={tenantId}
              />
              <PublicPresenceSurface className="space-y-4" variant="inset">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {getHomepageSurfaceActionLabel(locale, 'inspectComponent')}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {pickLocaleText(locale, {
                      en: 'Choose a component card to see what fans notice first, when to use it, and what creators can tailor.',
                      zh_HANS: '选择一个组件卡片，查看粉丝首先会看到什么、适合什么场景，以及创作者能调整什么。',
                      zh_HANT: '選擇一個元件卡片，查看粉絲首先會看到什麼、適合什麼場景，以及創作者能調整什麼。',
                      ja: 'コンポーネントカードを選ぶと、ファンが最初に受け取る印象、向いている使い方、調整できる内容を確認できます。',
                      ko: '컴포넌트 카드를 선택하면 팬이 먼저 보게 될 모습, 잘 맞는 장면, 조정할 수 있는 내용을 확인할 수 있습니다.',
                      fr: 'Choisissez une carte pour voir ce que les fans remarquent d’abord, quand l’utiliser et ce que le créateur peut ajuster.',
                    })}
                  </p>
                </div>
              </PublicPresenceSurface>
            </div>
          )}
        </div>
      </div>
    </PublicPresenceShell>
  );
}
