import {
  PUBLIC_PRESENCE_COMPONENT_DEFINITIONS,
  PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS,
  PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS,
  type HomepageComponentType,
  type PublicPresenceTemplateId,
  type SupportedUiLocale,
} from '@tcrn/shared';

import { pickLocaleText } from '@/platform/runtime/locale/locale-text';

interface WorkspaceJsonFileLike {
  contents: string;
  path: string;
}

export interface TemplateStarterBlueprint {
  baseTemplateId: PublicPresenceTemplateId;
  campaignLabel: string;
  heroHeadline: string;
  heroIntro: string;
  linkedComponentDraftKeys: string[];
  sectionOrder: string[];
}

export interface ComponentStarterBlueprint {
  componentType: HomepageComponentType;
  preferredSectionKind: string | null;
  props: Record<string, unknown>;
}

function readJsonWorkspaceFile(
  files: readonly WorkspaceJsonFileLike[],
  path: string,
) {
  const file = files.find((entry) => entry.path === path);

  if (!file) {
    return null;
  }

  try {
    return JSON.parse(file.contents) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTemplateId(value: unknown): value is PublicPresenceTemplateId {
  return typeof value === 'string' && value in PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS;
}

function isComponentType(value: unknown): value is HomepageComponentType {
  return typeof value === 'string' && value in PUBLIC_PRESENCE_COMPONENT_DEFINITIONS;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .map((entry) => entry.trim())
    : [];
}

function readRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function buildComponentStarterProps(
  componentType: HomepageComponentType,
  locale: SupportedUiLocale,
) {
  switch (componentType) {
    case 'SocialLinks':
      return {
        iconSize: 'medium',
        layout: 'horizontal',
        platforms: [
          {
            label: 'YouTube',
            platformCode: 'youtube',
            url: 'https://www.youtube.com/@official-fan-room',
          },
          {
            label: pickLocaleText(locale, {
              en: 'Fan Club',
              zh_HANS: '粉丝会',
              zh_HANT: '粉絲會',
              ja: 'ファンクラブ',
              ko: '팬클럽',
              fr: 'Fan Club',
            }),
            platformCode: 'website',
            url: 'https://example.com/fan-club',
          },
        ],
        style: 'pill',
      } satisfies Record<string, unknown>;
    case 'LinkButton':
      return {
        fullWidth: false,
        label: pickLocaleText(locale, {
          en: 'Open fan room',
          zh_HANS: '打开粉丝房间',
          zh_HANT: '打開粉絲房間',
          ja: 'ファンルームを開く',
          ko: '팬룸 열기',
          fr: 'Ouvrir la fan room',
        }),
        style: 'primary',
        url: 'https://example.com/fan-room',
      } satisfies Record<string, unknown>;
    case 'RichText':
      return {
        contentHtml: `<p>${pickLocaleText(locale, {
          en: 'Creator-authored fan note for this custom homepage starter.',
          zh_HANS: '这是为这个自定义主页起稿准备的创作者粉丝说明。',
          zh_HANT: '這是為這個自訂主頁起稿準備的創作者粉絲說明。',
          ja: 'このカスタムホームページ下書きのために用意したクリエイター向けファンノートです。',
          ko: '이 커스텀 홈페이지 초안을 위해 준비한 크리에이터용 팬 노트입니다.',
          fr: 'Note fan rédigée pour ce starter de homepage personnalisé.',
        })}</p>`,
        tone: 'default',
      } satisfies Record<string, unknown>;
    case 'Schedule':
      return {
        events: [
          {
            day: 'Sat',
            time: '20:00',
            title: pickLocaleText(locale, {
              en: 'Weekly live',
              zh_HANS: '每周直播',
              zh_HANT: '每週直播',
              ja: '週次ライブ',
              ko: '주간 라이브',
              fr: 'Live hebdo',
            }),
          },
        ],
        title: pickLocaleText(locale, {
          en: 'Fan schedule',
          zh_HANS: '粉丝日程',
          zh_HANT: '粉絲日程',
          ja: 'ファンスケジュール',
          ko: '팬 일정',
          fr: 'Planning fan',
        }),
        weekOf: '2026-05-18',
      } satisfies Record<string, unknown>;
    default:
      return structuredClone(PUBLIC_PRESENCE_COMPONENT_DEFINITIONS[componentType].defaultProps) as Record<
        string,
        unknown
      >;
  }
}

function findPreferredSectionKind(componentType: HomepageComponentType) {
  const activeHubOrder = PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS.activeTalentHub.defaultSectionOrder;

  for (const sectionKind of activeHubOrder) {
    const sectionDefinition =
      PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS[
        sectionKind as keyof typeof PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS
      ];

    if (sectionDefinition?.allowedComponents.includes(componentType)) {
      return sectionDefinition.kind;
    }
  }

  const fallbackDefinition = Object.values(PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS).find((definition) =>
    definition.allowedComponents.includes(componentType),
  );

  return fallbackDefinition?.kind ?? null;
}

export function buildTemplateStarterBlueprint(
  templateId: PublicPresenceTemplateId,
  locale: SupportedUiLocale,
  linkedComponentDraftKeys: readonly string[] = [],
): TemplateStarterBlueprint {
  const template = PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[templateId];

  return {
    baseTemplateId: template.templateId,
    campaignLabel: 'Custom homepage starter',
    heroHeadline:
      templateId === 'debutReveal'
        ? pickLocaleText(locale, {
            en: 'A custom reveal page is ready for fan launch checks.',
            zh_HANS: '这个自定义揭晓页已经可以进入粉丝上线检查。',
            zh_HANT: '這個自訂揭曉頁已經可以進入粉絲上線檢查。',
            ja: 'このカスタム公開ページはファン向け公開チェックの準備ができています。',
            ko: '이 커스텀 공개 페이지는 팬 런치 점검을 시작할 준비가 되었습니다.',
            fr: 'Cette page reveal personnalisée est prête pour les contrôles de lancement fan.',
          })
        : pickLocaleText(locale, {
            en: 'A custom homepage starter is ready for creator edits.',
            zh_HANS: '这个自定义主页起稿已经可以继续由创作者编辑。',
            zh_HANT: '這個自訂主頁起稿已經可以繼續由創作者編輯。',
            ja: 'このカスタムホームページ下書きは、クリエイターがそのまま編集を始められます。',
            ko: '이 커스텀 홈페이지 스타터는 크리에이터가 바로 편집을 이어갈 수 있습니다.',
            fr: 'Ce starter de homepage personnalisé est prêt pour les ajustements du créateur.',
          }),
    heroIntro: pickLocaleText(locale, {
      en: 'This homepage starter came from a custom template draft and keeps the page ready for Studio editing.',
      zh_HANS: '这个主页起稿来自一个自定义模板草稿，并且已经准备好继续在 Studio 中编辑。',
      zh_HANT: '這個主頁起稿來自一個自訂模板草稿，並且已經準備好繼續在 Studio 中編輯。',
      ja: 'このホームページ下書きはカスタムテンプレート草稿から作成され、Studio でそのまま編集を続けられます。',
      ko: '이 홈페이지 스타터는 커스텀 템플릿 초안에서 만들어졌으며 Studio에서 바로 편집을 이어갈 수 있습니다.',
      fr: 'Ce starter de homepage vient d’un brouillon de template personnalisé et reste prêt pour l’édition dans le Studio.',
    }),
    linkedComponentDraftKeys: [...linkedComponentDraftKeys],
    sectionOrder: [...template.defaultSectionOrder],
  };
}

export function buildComponentStarterBlueprint(
  componentType: HomepageComponentType,
  locale: SupportedUiLocale,
): ComponentStarterBlueprint {
  return {
    componentType,
    preferredSectionKind: findPreferredSectionKind(componentType),
    props: buildComponentStarterProps(componentType, locale),
  };
}

export function buildTemplateAuthoringManifest(
  templateId: PublicPresenceTemplateId,
  locale: SupportedUiLocale,
  linkedComponentDraftKeys: readonly string[] = [],
) {
  const definition = PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[templateId];

  return {
    ...definition,
    authoring: {
      homepageStarter: buildTemplateStarterBlueprint(templateId, locale, linkedComponentDraftKeys),
      subjectScope: 'templateSource',
    },
  };
}

export function buildComponentAuthoringManifest(
  componentType: HomepageComponentType,
  locale: SupportedUiLocale,
) {
  const definition = PUBLIC_PRESENCE_COMPONENT_DEFINITIONS[componentType];

  return {
    ...definition,
    authoring: {
      homepageStarter: buildComponentStarterBlueprint(componentType, locale),
      subjectScope: 'componentSource',
    },
  };
}

export function readTemplateStarterBlueprint(
  files: readonly WorkspaceJsonFileLike[],
): Partial<TemplateStarterBlueprint> | null {
  const manifest = readJsonWorkspaceFile(files, 'manifest.json');
  const authoring = readRecord(manifest?.authoring);
  const homepageStarter = readRecord(authoring?.homepageStarter);

  if (!homepageStarter && !manifest) {
    return null;
  }

  const sectionOrder = readStringArray(homepageStarter?.sectionOrder);
  const linkedComponentDraftKeys = readStringArray(homepageStarter?.linkedComponentDraftKeys);
  const baseTemplateId =
    (isTemplateId(homepageStarter?.baseTemplateId) && homepageStarter?.baseTemplateId)
    || (isTemplateId(manifest?.templateId) && manifest?.templateId)
    || null;

  return {
    baseTemplateId: baseTemplateId ?? undefined,
    campaignLabel: readString(homepageStarter?.campaignLabel) ?? undefined,
    heroHeadline: readString(homepageStarter?.heroHeadline) ?? undefined,
    heroIntro: readString(homepageStarter?.heroIntro) ?? undefined,
    linkedComponentDraftKeys,
    sectionOrder,
  };
}

export function readComponentStarterBlueprint(
  files: readonly WorkspaceJsonFileLike[],
): Partial<ComponentStarterBlueprint> | null {
  const manifest = readJsonWorkspaceFile(files, 'manifest.json');
  const authoring = readRecord(manifest?.authoring);
  const homepageStarter = readRecord(authoring?.homepageStarter);

  if (!homepageStarter && !manifest) {
    return null;
  }

  const componentType =
    (isComponentType(homepageStarter?.componentType) && homepageStarter?.componentType)
    || (isComponentType(manifest?.componentType) && manifest?.componentType)
    || null;
  const preferredSectionKind = readString(homepageStarter?.preferredSectionKind);
  const props = readRecord(homepageStarter?.props);

  return {
    componentType: componentType ?? undefined,
    preferredSectionKind: preferredSectionKind ?? undefined,
    props: props ?? undefined,
  };
}
