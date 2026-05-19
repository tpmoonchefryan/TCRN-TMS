'use client';

import {
  PUBLIC_PRESENCE_COMPONENT_DEFINITIONS,
  PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS,
  ThemePreset,
  type HomepageComponentType,
  type PublicPresencePhaseVisibility,
  type PublicPresencePublicProjection,
  type PublicPresenceTemplateId,
} from '@tcrn/shared';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Code2,
  Eye,
  FileJson2,
  FileText,
  LayoutTemplate,
  LoaderCircle,
  Package2,
  PlaySquare,
  Smartphone,
  Upload,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { startTransition, useEffect, useId, useMemo, useRef, useState } from 'react';

import { PublicPresenceBadge, PublicPresenceShell, PublicPresenceSurface } from '@/domains/public-presence';
import { PublicHomepageProjectionRenderer } from '@/domains/public-homepage/components/PublicHomepageProjectionRenderer';
import { useOverlayFocusManager } from '@/domains/public-presence-studio/screens/public-presence-studio-overlay';
import {
  getHomepageSurfaceActionLabel,
  getPublicPresencePreviewPhaseLabel,
  getPublicPresenceTemplateLabel,
} from '@/domains/public-presence-studio/screens/public-presence-studio.copy';
import {
  buildPublicPresenceComponentAuthoringPath,
  buildPublicPresenceHomepageSurfacePath,
  buildPublicPresenceStudioPreviewPath,
  buildPublicPresenceTemplateAuthoringPath,
} from '@/platform/routing/workspace-paths';
import { formatLocaleDateTime, pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';

type AuthoringTarget = 'template' | 'component';
type PreviewViewport = 'desktop' | 'mobile';
type FixtureMode = 'default' | 'unsafeFallback';
type MobileAuthoringSurface = 'editor' | 'preview';
type MonacoEditorProps = {
  defaultLanguage?: string;
  height?: string | number;
  loading?: React.ReactNode;
  onChange?: (value: string | undefined) => void;
  options?: Record<string, unknown>;
  path?: string;
  theme?: string;
  value?: string;
};

interface VirtualFile {
  contents: string;
  kind: 'code' | 'schema' | 'fixture' | 'doc';
  language: string;
  path: string;
}

const MonacoEditor = dynamic<MonacoEditorProps>(
  async () => {
    const module = await import('@monaco-editor/react');
    return module.default;
  },
  {
    ssr: false,
    loading: () => (
      <div
        data-testid="monaco-loading"
        className="flex min-h-[28rem] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-slate-950 text-slate-100"
      >
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
      </div>
    ),
  },
);

function buildTemplatePreviewProjection(
  templateId: PublicPresenceTemplateId,
  locale: string,
): PublicPresencePublicProjection {
  const title =
    templateId === 'debutReveal'
      ? pickLocaleText(locale, {
          en: 'Mika Debut Countdown',
          zh_HANS: 'Mika 出道倒计时',
          zh_HANT: 'Mika 出道倒數',
          ja: 'Mika デビューカウントダウン',
          ko: 'Mika 데뷔 카운트다운',
          fr: 'Compte à rebours des débuts de Mika',
        })
      : pickLocaleText(locale, {
          en: 'Aki Rosenthal Official Hub',
          zh_HANS: 'Aki Rosenthal 官方主页',
          zh_HANT: 'Aki Rosenthal 官方主頁',
          ja: 'Aki Rosenthal 公式ハブ',
          ko: 'Aki Rosenthal 공식 허브',
          fr: 'Hub officiel d’Aki Rosenthal',
        });
  const description =
    templateId === 'debutReveal'
      ? pickLocaleText(locale, {
          en: 'Countdown-ready fan page with reveal pacing controls.',
          zh_HANS: '适合倒计时阶段、带揭晓节奏控制的粉丝页。',
          zh_HANT: '適合倒數階段、帶揭曉節奏控制的粉絲頁。',
          ja: 'カウントダウン期間に使う、公開演出のテンポを整えたファンページです。',
          ko: '카운트다운 기간에 맞춰 공개 흐름을 조정한 팬 페이지입니다.',
          fr: 'Une page fan pensée pour le compte à rebours avec un rythme de reveal maîtrisé.',
        })
      : pickLocaleText(locale, {
          en: 'Always-on official homepage for active fans.',
          zh_HANS: '面向活跃粉丝的常驻官方主页。',
          zh_HANT: '面向活躍粉絲的常駐官方主頁。',
          ja: 'アクティブなファン向けに常時公開する公式ホームページです。',
          ko: '활발한 팬을 위한 상시 공개 공식 홈페이지입니다.',
          fr: 'Une page officielle toujours disponible pour les fans actifs.',
        });

  return {
    projectionSchemaVersion: '1.0',
    resolvedRevealPhase: templateId === 'debutReveal' ? 'countdown' : 'always',
    route: {
      canonicalPath: `/preview/${templateId}`,
      legacyPath: null,
      tenantCode: 'fixture',
      talentCode: templateId,
      domainHostname: null,
    },
    metadata: {
      title,
      description,
      canonicalPath: `/preview/${templateId}`,
      ogImage: null,
      ogImageAlt: null,
      locale: null,
    },
    appearance: {
      theme: {
        preset: ThemePreset.SOFT,
        visualStyle: 'flat',
        colors: {
          accent: '#f973a0',
          background: '#fff8fb',
          primary: '#f472b6',
          text: '#3f1d33',
          textSecondary: '#7d4f66',
        },
        background: {
          type: 'gradient',
          value: 'linear-gradient(145deg, #fff7fb 0%, #ffe8f3 50%, #fffdfd 100%)',
        },
        card: {
          background: '#ffffff',
          borderRadius: 'large',
          shadow: 'medium',
        },
        typography: {
          fontFamily: 'noto-sans',
          headingWeight: 'medium',
        },
        animation: {
          enableEntrance: true,
          enableHover: true,
          intensity: 'low',
        },
        decorations: {
          type: 'dots',
          density: 'low',
          color: '#f9a8d4',
          opacity: 0.18,
        },
      },
    },
    sections: [
      {
        id: 'hero',
        kind: 'firstEncounter',
        sectionType: 'hero',
        visibility: 'visible',
        fallbackBehavior: 'safePlaceholder',
        validationIssueIds: [],
        title,
        description,
        timezone: 'Asia/Tokyo',
        avatar: null,
        primaryAction: {
          id: 'cta-1',
          slot: 'launch',
          label:
            templateId === 'debutReveal'
              ? pickLocaleText(locale, {
                  en: 'Open reveal room',
                  zh_HANS: '打开揭晓房间',
                  zh_HANT: '打開揭曉房間',
                  ja: '公開ルームを開く',
                  ko: '리빌 룸 열기',
                  fr: 'Ouvrir la salle de reveal',
                })
              : pickLocaleText(locale, {
                  en: 'Watch stream',
                  zh_HANS: '观看直播',
                  zh_HANT: '觀看直播',
                  ja: '配信を見る',
                  ko: '스트림 보기',
                  fr: 'Regarder le stream',
                }),
          href: 'https://example.com/launch',
          providerId: null,
          category: 'launchUrl',
          phaseVisibility: 'always',
          fallbackBehavior: 'safePlaceholder',
        },
      },
      {
        id: 'channels',
        kind: 'officialChannels',
        sectionType: 'socialLinks',
        visibility: 'visible',
        fallbackBehavior: 'safePlaceholder',
        validationIssueIds: [],
        title: null,
        links: [
          {
            id: 'link-1',
            slot: 'officialChannel',
            label: 'YouTube',
            href: 'https://www.youtube.com/@fixture',
            providerId: 'youtube',
            category: 'officialChannelUrl',
            phaseVisibility: 'always',
            fallbackBehavior: 'safePlaceholder',
          },
        ],
        layout: 'horizontal',
        style: 'pill',
      },
    ],
    actions: [],
    media: [],
  };
}

function buildComponentPreviewProjection(
  componentType: HomepageComponentType,
  locale: string,
): PublicPresencePublicProjection {
  const readableName = componentType.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const sampleTitle = pickLocaleText(locale, {
    en: `${readableName} sample page`,
    zh_HANS: `${readableName} 样例页`,
    zh_HANT: `${readableName} 樣例頁`,
    ja: `${readableName} サンプルページ`,
    ko: `${readableName} 샘플 페이지`,
    fr: `Page exemple ${readableName}`,
  });
  const sampleDescription = pickLocaleText(locale, {
    en: `Use this sample to review how ${readableName} feels on the homepage.`,
    zh_HANS: `用这个样例检查 ${readableName} 放在主页上的观感。`,
    zh_HANT: `用這個樣例檢查 ${readableName} 放在主頁上的觀感。`,
    ja: `${readableName} をホームページに置いたときの見え方をこのサンプルで確認します。`,
    ko: `${readableName}가 홈페이지에 놓였을 때의 인상을 이 샘플로 확인합니다.`,
    fr: `Utilisez cet exemple pour vérifier l’effet de ${readableName} sur la page d’accueil.`,
  });

  return {
    projectionSchemaVersion: '1.0',
    resolvedRevealPhase: 'always',
    route: {
      canonicalPath: `/preview/component/${componentType}`,
      legacyPath: null,
      tenantCode: 'fixture',
      talentCode: componentType,
      domainHostname: null,
    },
    metadata: {
      title: sampleTitle,
      description: sampleDescription,
      canonicalPath: `/preview/component/${componentType}`,
      ogImage: null,
      ogImageAlt: null,
      locale: null,
    },
    appearance: {
      theme: {
        preset: ThemePreset.SOFT,
        visualStyle: 'flat',
        colors: {
          accent: '#38bdf8',
          background: '#f8fcff',
          primary: '#0ea5e9',
          text: '#123247',
          textSecondary: '#4b7189',
        },
        background: {
          type: 'gradient',
          value: 'linear-gradient(145deg, #f8fdff 0%, #ebf8ff 50%, #ffffff 100%)',
        },
        card: {
          background: '#ffffff',
          borderRadius: 'large',
          shadow: 'medium',
        },
        typography: {
          fontFamily: 'noto-sans',
          headingWeight: 'medium',
        },
        animation: {
          enableEntrance: true,
          enableHover: true,
          intensity: 'low',
        },
        decorations: {
          type: 'none',
        },
      },
    },
    sections: [
      {
        id: 'fixture',
        kind: 'legacyCompatibility',
        sectionType: 'fallbackCard',
        visibility: 'visible',
        fallbackBehavior: 'safePlaceholder',
        validationIssueIds: [],
        title: sampleTitle,
        description: sampleDescription,
      },
    ],
    actions: [],
    media: [],
  };
}

function buildTemplateFiles(
  templateId: PublicPresenceTemplateId,
  locale: string,
): VirtualFile[] {
  const definition = PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[templateId];

  return [
    {
      path: 'src/template.tsx',
      kind: 'code',
      language: 'typescript',
      contents: `export function ${templateId}Template() {\n  return {\n    templateId: '${templateId}',\n    locale: '${locale}',\n    sections: ${JSON.stringify(definition.defaultSectionOrder, null, 2)},\n  };\n}\n`,
    },
    {
      path: 'manifest.json',
      kind: 'schema',
      language: 'json',
      contents: JSON.stringify(definition, null, 2),
    },
    {
      path: 'fixtures/default.json',
      kind: 'fixture',
      language: 'json',
      contents: JSON.stringify(
        {
          fixture: 'default',
          locale,
          previewPhase: templateId === 'debutReveal' ? 'countdown' : 'always',
          templateId,
        },
        null,
        2,
      ),
    },
    {
      path: 'validation.md',
      kind: 'doc',
      language: 'markdown',
      contents: `# Validation\n\n- Required sections: ${definition.requiredSections.join(', ')}\n- Persona Kit fields: ${definition.personaKitFields.join(', ')}\n- Layout release note: review before rollout\n`,
    },
  ];
}

function buildComponentFiles(
  componentType: HomepageComponentType,
  locale: string,
): VirtualFile[] {
  const definition = PUBLIC_PRESENCE_COMPONENT_DEFINITIONS[componentType];

  return [
    {
      path: 'src/component.tsx',
      kind: 'code',
      language: 'typescript',
      contents: `export const ${componentType}Definition = {\n  componentType: '${componentType}',\n  locale: '${locale}',\n  visualSupport: '${definition.visualSupport}',\n};\n`,
    },
    {
      path: 'manifest.json',
      kind: 'schema',
      language: 'json',
      contents: JSON.stringify(definition, null, 2),
    },
    {
      path: 'props.schema.json',
      kind: 'schema',
      language: 'json',
      contents: JSON.stringify(
        {
          componentType,
          editableFields: definition.fieldDefinitions
            .filter((field) => field.visualEditable)
            .map((field) => field.fieldKey),
          aiAllowlist: definition.aiPatchAllowlist,
        },
        null,
        2,
      ),
    },
    {
      path: 'fixtures/default.json',
      kind: 'fixture',
      language: 'json',
      contents: JSON.stringify(
        {
          componentType,
          fixture: 'default',
          locale,
          visualSupport: definition.visualSupport,
        },
        null,
        2,
      ),
    },
  ];
}

function resolveFileIcon(file: VirtualFile) {
  if (file.kind === 'doc') {
    return <FileText className="h-4 w-4" aria-hidden="true" />;
  }

  return <FileJson2 className="h-4 w-4" aria-hidden="true" />;
}

function getAuthoringSubjectLabel(
  locale: string,
  target: AuthoringTarget,
  templateId: PublicPresenceTemplateId,
  componentType: HomepageComponentType,
) {
  if (target === 'template') {
    return getPublicPresenceTemplateLabel(locale, PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[templateId]);
  }

  return componentType.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function buildValidationItems(
  locale: string,
  target: AuthoringTarget,
  fixtureMode: FixtureMode,
  viewport: PreviewViewport,
  previewPhase: PublicPresencePhaseVisibility,
) {
  return [
    {
      level: 'pass',
      message:
        target === 'template'
          ? pickLocaleText(locale, {
              en: 'Template structure stays steady while the sample homepage refreshes with your edits.',
              zh_HANS: '模板结构保持稳定，样例主页会随着你的编辑一起刷新。',
              zh_HANT: '模板結構保持穩定，樣例主頁會隨著你的編輯一起刷新。',
              ja: 'テンプレート構成は安定したまま、サンプルホームページだけが編集に合わせて更新されます。',
              ko: '템플릿 구조는 안정적으로 유지되고, 샘플 홈페이지만 편집에 맞춰 새로 고쳐집니다.',
              fr: 'La structure du template reste stable pendant que la page exemple se met à jour avec vos modifications.',
            })
          : pickLocaleText(locale, {
              en: 'This block keeps its homepage role while the sample page refreshes with your edits.',
              zh_HANS: '这个模块会保持自己的主页角色，同时样例页会随着你的编辑刷新。',
              zh_HANT: '這個模組會保持自己的主頁角色，同時樣例頁會隨著你的編輯刷新。',
              ja: 'このブロックはホームページ上の役割を保ったまま、サンプルページだけが編集に合わせて更新されます。',
              ko: '이 블록은 홈페이지 역할을 유지하고, 샘플 페이지만 편집에 맞춰 새로 고쳐집니다.',
              fr: 'Ce bloc garde son rôle sur la page pendant que la page exemple se met à jour avec vos modifications.',
            }),
    },
    {
      level: fixtureMode === 'unsafeFallback' ? 'warn' : 'pass',
      message:
        fixtureMode === 'unsafeFallback'
          ? pickLocaleText(locale, {
              en: 'Safe launch sample is active so you can review the more cautious fan-facing version.',
              zh_HANS: '当前启用了安全上线样例，方便你检查更稳妥的粉丝页版本。',
              zh_HANT: '目前啟用了安全上線樣例，方便你檢查更穩妥的粉絲頁版本。',
              ja: 'より慎重なファン向け表示を確認できるよう、安全寄りの公開サンプルを表示しています。',
              ko: '보다 신중한 팬용 버전을 확인할 수 있도록 안전 런치 샘플이 켜져 있습니다.',
              fr: 'L’échantillon de lancement prudent est actif pour vérifier la version fan la plus sûre.',
            })
          : pickLocaleText(locale, {
              en: 'Everyday sample content is active for this preview.',
              zh_HANS: '当前预览使用的是日常样例内容。',
              zh_HANT: '目前預覽使用的是日常樣例內容。',
              ja: 'このプレビューでは日常向けのサンプル内容を表示しています。',
              ko: '이 미리보기에는 일상용 샘플 콘텐츠가 적용되어 있습니다.',
              fr: 'Le contenu d’exemple du quotidien est actif pour cet aperçu.',
            }),
    },
    {
      level: 'pass',
      message: pickLocaleText(locale, {
        en: `Viewing the ${getPreviewViewportLabel(locale, viewport)} preview in the ${getAuthoringPhaseLabel(locale, previewPhase)} state.`,
        zh_HANS: `当前查看的是 ${getPreviewViewportLabel(locale, viewport)} 预览，状态为 ${getAuthoringPhaseLabel(locale, previewPhase)}。`,
        zh_HANT: `目前查看的是 ${getPreviewViewportLabel(locale, viewport)} 預覽，狀態為 ${getAuthoringPhaseLabel(locale, previewPhase)}。`,
        ja: `現在は ${getPreviewViewportLabel(locale, viewport)} プレビューで、状態は ${getAuthoringPhaseLabel(locale, previewPhase)} です。`,
        ko: `지금은 ${getPreviewViewportLabel(locale, viewport)} 미리보기에서 ${getAuthoringPhaseLabel(locale, previewPhase)} 상태를 보고 있습니다.`,
        fr: `Vous regardez l’aperçu ${getPreviewViewportLabel(locale, viewport)} dans l’état ${getAuthoringPhaseLabel(locale, previewPhase)}.`,
      }),
    },
  ] as const;
}

function getFixtureModeLabel(locale: string, fixtureMode: FixtureMode) {
  return fixtureMode === 'unsafeFallback'
    ? pickLocaleText(locale, {
        en: 'Safe launch sample',
        zh_HANS: '安全上线样例',
        zh_HANT: '安全上線樣例',
        ja: '安全寄りの公開サンプル',
        ko: '안전 런치 샘플',
        fr: 'Échantillon de lancement prudent',
      })
    : pickLocaleText(locale, {
        en: 'Everyday sample',
        zh_HANS: '日常样例',
        zh_HANT: '日常樣例',
        ja: '日常向けサンプル',
        ko: '일상 샘플',
        fr: 'Échantillon du quotidien',
      });
}

function getSampleContentLabel(locale: string) {
  return pickLocaleText(locale, {
    en: 'Sample content',
    zh_HANS: '样例内容',
    zh_HANT: '樣例內容',
    ja: 'サンプル内容',
    ko: '샘플 콘텐츠',
    fr: 'Contenu d’exemple',
  });
}

function getRevealStateLabel(locale: string) {
  return pickLocaleText(locale, {
    en: 'Reveal state',
    zh_HANS: '揭晓状态',
    zh_HANT: '揭曉狀態',
    ja: '公開状態',
    ko: '공개 상태',
    fr: 'État de reveal',
  });
}

function getPreviewViewportLabel(locale: string, viewport: PreviewViewport) {
  return viewport === 'desktop'
    ? pickLocaleText(locale, {
        en: 'Desktop',
        zh_HANS: '桌面端',
        zh_HANT: '桌面端',
        ja: '桌面版',
        ko: '데스크톱',
        fr: 'desktop',
      })
    : pickLocaleText(locale, {
        en: 'Mobile',
        zh_HANS: '移动端',
        zh_HANT: '行動端',
        ja: 'モバイル',
        ko: '모바일',
        fr: 'mobile',
      });
}

function getMobileSurfaceStatusLabel(locale: string, mobileSurface: MobileAuthoringSurface) {
  return mobileSurface === 'preview'
    ? pickLocaleText(locale, {
        en: 'Previewing output',
        zh_HANS: '正在预览输出',
        zh_HANT: '正在預覽輸出',
        ja: '出力をプレビュー中',
        ko: '출력을 미리보는 중',
        fr: 'Aperçu du résultat',
      })
    : pickLocaleText(locale, {
        en: 'Editing code',
        zh_HANS: '正在编辑代码',
        zh_HANT: '正在編輯程式碼',
        ja: 'コードを編集中',
        ko: '코드를 편집하는 중',
        fr: 'Édition du code',
      });
}

function getAuthoringPhaseLabel(
  locale: string,
  previewPhase: PublicPresencePhaseVisibility,
) {
  if (previewPhase === 'preRevealHold') {
    return pickLocaleText(locale, {
      en: 'Before reveal hold',
      zh_HANS: '揭晓前保持',
      zh_HANT: '揭曉前保持',
      ja: '公開前ホールド',
      ko: '공개 전 유지',
      fr: 'Avant la reveal, maintien',
    });
  }

  return getPublicPresencePreviewPhaseLabel(locale, previewPhase);
}

function usePreviewFit(targetWidth: number) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [fitState, setFitState] = useState({
    height: 0,
    scale: 1,
  });

  useEffect(() => {
    const host = hostRef.current;
    const content = contentRef.current;

    if (!host || !content) {
      return undefined;
    }

    const measure = () => {
      const availableWidth = host.clientWidth || targetWidth;
      const scale = availableWidth > 0 ? Math.min(1, availableWidth / targetWidth) : 1;

      setFitState({
        height: content.scrollHeight * scale,
        scale,
      });
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(host);
    observer.observe(content);

    return () => {
      observer.disconnect();
    };
  }, [targetWidth]);

  return {
    contentRef,
    hostRef,
    scaledHeight: fitState.height,
    scale: fitState.scale,
    scaledWidth: targetWidth * fitState.scale,
  };
}

export function PublicPresenceAuthoringIdeScreen({
  componentType,
  target,
  talentId,
  templateId,
  tenantId,
}: Readonly<{
  componentType?: string | null;
  target: AuthoringTarget;
  talentId: string;
  templateId?: string | null;
  tenantId: string;
}>) {
  const { locale } = useUiLocale();
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [fixtureMode, setFixtureMode] = useState<FixtureMode>('default');
  const [previewPhase, setPreviewPhase] = useState<PublicPresencePhaseVisibility>('always');
  const [mobileSurface, setMobileSurface] = useState<MobileAuthoringSurface>('editor');
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [mobilePreviewOptionsOpen, setMobilePreviewOptionsOpen] = useState(false);
  const [utilityPanel, setUtilityPanel] = useState<'files' | 'checks' | null>(null);
  const mobileActionsSheetId = useId();
  const mobilePreviewOptionsSheetId = useId();
  const fileDrawerId = useId();
  const validationDrawerId = useId();
  const effectiveTemplateId = (templateId ?? 'activeTalentHub') as PublicPresenceTemplateId;
  const effectiveComponentType = (componentType ?? 'SocialLinks') as HomepageComponentType;
  const initialFiles = useMemo(
    () =>
      target === 'template'
        ? buildTemplateFiles(effectiveTemplateId, locale)
        : buildComponentFiles(effectiveComponentType, locale),
    [effectiveComponentType, effectiveTemplateId, locale, target],
  );
  const [files, setFiles] = useState<VirtualFile[]>(initialFiles);
  const [activePath, setActivePath] = useState(initialFiles[0]?.path ?? '');
  const [editorDirty, setEditorDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'ready'>('idle');
  const [isWideDesktop, setIsWideDesktop] = useState(false);
  const mobileActionsOverlay = useOverlayFocusManager({
    onClose: () => setMobileActionsOpen(false),
    open: mobileActionsOpen,
  });
  const mobilePreviewOptionsOverlay = useOverlayFocusManager({
    onClose: () => setMobilePreviewOptionsOpen(false),
    open: mobilePreviewOptionsOpen,
  });
  const filesDrawerOverlay = useOverlayFocusManager({
    onClose: () => setUtilityPanel(null),
    open: utilityPanel === 'files',
  });
  const validationDrawerOverlay = useOverlayFocusManager({
    onClose: () => setUtilityPanel(null),
    open: utilityPanel === 'checks',
  });

  const activeFile = files.find((file) => file.path === activePath) ?? files[0];
  const desktopPreviewFit = usePreviewFit(720);
  const authoringSubjectLabel = getAuthoringSubjectLabel(
    locale,
    target,
    effectiveTemplateId,
    effectiveComponentType,
  );
  const mobileSurfaceStatusLabel = getMobileSurfaceStatusLabel(locale, mobileSurface);
  const previewProjection = useMemo<PublicPresencePublicProjection>(
    () =>
      target === 'template'
        ? buildTemplatePreviewProjection(effectiveTemplateId, locale)
        : buildComponentPreviewProjection(effectiveComponentType, locale),
    [effectiveComponentType, effectiveTemplateId, locale, target],
  );
  const validationItems = useMemo(
    () => buildValidationItems(locale, target, fixtureMode, viewport, previewPhase),
    [fixtureMode, locale, previewPhase, target, viewport],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) {
      return;
    }

    setViewport('mobile');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncDesktopLayout = () => {
      setIsWideDesktop(window.innerWidth >= 1280);
    };

    syncDesktopLayout();
    window.addEventListener('resize', syncDesktopLayout);

    return () => {
      window.removeEventListener('resize', syncDesktopLayout);
    };
  }, []);

  useEffect(() => {
    setFiles(initialFiles);
    setActivePath(initialFiles[0]?.path ?? '');
    setEditorDirty(false);
    setLastSavedAt(null);
    setLastValidatedAt(null);
    setSubmitStatus('idle');
  }, [initialFiles]);

  const exitHref =
    target === 'template'
      ? buildPublicPresenceHomepageSurfacePath(tenantId, talentId, 'templates')
      : buildPublicPresenceHomepageSurfacePath(tenantId, talentId, 'components');
  const previewHref =
    target === 'template'
      ? buildPublicPresenceStudioPreviewPath(tenantId, talentId, effectiveTemplateId)
      : buildPublicPresenceStudioPreviewPath(tenantId, talentId);
  const retryAuthoringHref =
    target === 'template'
      ? buildPublicPresenceTemplateAuthoringPath(
          tenantId,
          talentId,
          effectiveTemplateId,
        )
      : buildPublicPresenceComponentAuthoringPath(
          tenantId,
          talentId,
          effectiveComponentType,
        );
  const saveStatusLabel = editorDirty
    ? pickLocaleText(locale, {
        en: 'Unsaved changes',
        zh_HANS: '有未保存更改',
        zh_HANT: '有未儲存變更',
        ja: '未保存の変更あり',
        ko: '저장되지 않은 변경 있음',
        fr: 'Modifications non enregistrées',
      })
    : pickLocaleText(locale, {
        en: 'Draft saved',
        zh_HANS: '草稿已保存',
        zh_HANT: '草稿已儲存',
        ja: 'ドラフト保存済み',
        ko: '드래프트 저장됨',
        fr: 'Brouillon enregistré',
      });
  const validationStatusLabel = lastValidatedAt && !editorDirty
    ? pickLocaleText(locale, {
        en: 'Validation refreshed',
        zh_HANS: '验证已刷新',
        zh_HANT: '驗證已刷新',
        ja: '検証を更新済み',
        ko: '검증 갱신됨',
        fr: 'Validation rafraîchie',
      })
    : pickLocaleText(locale, {
        en: 'Validation needed',
        zh_HANS: '需要验证',
        zh_HANT: '需要驗證',
        ja: '検証が必要',
        ko: '검증 필요',
        fr: 'Validation requise',
      });
  const formattedSavedAt = formatLocaleDateTime(locale, lastSavedAt, pickLocaleText(locale, {
    en: 'Not saved in this session',
    zh_HANS: '本会话尚未保存',
    zh_HANT: '本工作階段尚未儲存',
    ja: 'このセッションではまだ保存していません',
    ko: '이번 세션에서는 아직 저장하지 않았습니다',
    fr: 'Pas encore enregistré dans cette session',
  }));
  const formattedValidatedAt = formatLocaleDateTime(locale, lastValidatedAt, pickLocaleText(locale, {
    en: 'Validation has not run yet',
    zh_HANS: '尚未运行验证',
    zh_HANT: '尚未執行驗證',
    ja: 'まだ検証を実行していません',
    ko: '아직 검증을 실행하지 않았습니다',
    fr: 'La validation n’a pas encore été lancée',
  }));

  const handleSaveDraft = () => {
    setLastSavedAt(new Date().toISOString());
    setEditorDirty(false);
    setSubmitStatus('idle');
  };

  const handleValidate = () => {
    setLastValidatedAt(new Date().toISOString());
    setUtilityPanel('checks');
    setSubmitStatus('idle');
  };

  const handleSubmit = () => {
    if (!lastValidatedAt || editorDirty) {
      setUtilityPanel('checks');
      return;
    }

    setSubmitStatus('ready');
  };

  const ideBadgeLabel = pickLocaleText(locale, {
    en: target === 'template' ? 'Template IDE' : 'Component IDE',
    zh_HANS: target === 'template' ? '模板 IDE' : '组件 IDE',
    zh_HANT: target === 'template' ? '模板 IDE' : '元件 IDE',
    ja: target === 'template' ? 'テンプレート IDE' : 'コンポーネント IDE',
    ko: target === 'template' ? '템플릿 IDE' : '컴포넌트 IDE',
    fr: target === 'template' ? 'IDE Template' : 'IDE Composant',
  });
  const title = authoringSubjectLabel;
  const authoringActions = [
    {
      key: 'save',
      label: pickLocaleText(locale, {
        en: 'Save draft',
        zh_HANS: '保存草稿',
        zh_HANT: '儲存草稿',
        ja: 'ドラフト保存',
        ko: '드래프트 저장',
        fr: 'Enregistrer le brouillon',
      }),
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
      kind: 'button' as const,
    },
    {
      key: 'validate',
      label: pickLocaleText(locale, {
        en: 'Validate',
        zh_HANS: '运行校验',
        zh_HANT: '執行驗證',
        ja: '検証',
        ko: '검증',
        fr: 'Valider',
      }),
      icon: <PlaySquare className="h-4 w-4" aria-hidden="true" />,
      kind: 'button' as const,
    },
    {
      key: 'submit',
      label: pickLocaleText(locale, {
        en: 'Submit',
        zh_HANS: '提交审核',
        zh_HANT: '提交審核',
        ja: 'レビュー提出',
        ko: '검토 제출',
        fr: 'Soumettre',
      }),
      icon: <Upload className="h-4 w-4" aria-hidden="true" />,
      kind: 'button' as const,
    },
    {
      key: 'preview-route',
      label: pickLocaleText(locale, {
        en: 'Preview',
        zh_HANS: '预览',
        zh_HANT: '預覽',
        ja: 'プレビュー',
        ko: '미리보기',
        fr: 'Aperçu',
      }),
      icon: <Eye className="h-4 w-4" aria-hidden="true" />,
      href: previewHref,
      kind: 'link' as const,
    },
    {
      key: 'retry-authoring',
      label:
        target === 'template'
          ? getHomepageSurfaceActionLabel(locale, 'createTemplate')
          : getHomepageSurfaceActionLabel(locale, 'createComponent'),
      icon: <Code2 className="h-4 w-4" aria-hidden="true" />,
      href: retryAuthoringHref,
      kind: 'link' as const,
      tone: 'rose' as const,
    },
    {
      key: 'exit',
      label: pickLocaleText(locale, {
        en: 'Exit',
        zh_HANS: '退出',
        zh_HANT: '離開',
        ja: '戻る',
        ko: '나가기',
        fr: 'Quitter',
      }),
      icon: <ChevronLeft className="h-4 w-4" aria-hidden="true" />,
      href: exitHref,
      kind: 'link' as const,
    },
  ];

  return (
    <PublicPresenceShell
      className="px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-3"
      contentClassName="max-w-none"
      decorationDensity="calm"
    >
      <div className="space-y-2" data-testid="ide-workbench">
        <PublicPresenceSurface
          className="sticky top-2 z-20 px-3 py-2 sm:px-3 sm:py-2 lg:px-3 lg:py-2 shadow-sm backdrop-blur"
          data-testid="ide-topbar"
        >
          <div className="space-y-2 xl:hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <PublicPresenceBadge
                  icon={
                    target === 'template' ? (
                      <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Package2 className="h-4 w-4" aria-hidden="true" />
                    )
                  }
                  tone="rose"
                >
                  {ideBadgeLabel}
                </PublicPresenceBadge>
                <PublicPresenceBadge tone="slate" variant="outline">
                  {title}
                </PublicPresenceBadge>
              </div>
              <button
                type="button"
                data-testid="ide-mobile-actions-button"
                aria-controls={mobileActionsSheetId}
                aria-expanded={mobileActionsOpen}
                aria-haspopup="dialog"
                ref={mobileActionsOverlay.fallbackTriggerRef}
                onClick={(event) => {
                  mobileActionsOverlay.registerTrigger(event.currentTarget);
                  setMobileActionsOpen(true);
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span>{pickLocaleText(locale, {
                  en: 'Actions',
                  zh_HANS: '操作',
                  zh_HANT: '操作',
                  ja: '操作',
                  ko: '작업',
                  fr: 'Actions',
                })}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={mobileSurface === 'editor'}
                onClick={() => {
                  setMobileSurface('editor');
                  setMobilePreviewOptionsOpen(false);
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  mobileSurface === 'editor'
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Code2 className="h-4 w-4" aria-hidden="true" />
                {pickLocaleText(locale, {
                  en: 'Editor view',
                  zh_HANS: '编辑视图',
                  zh_HANT: '編輯視圖',
                  ja: '編集ビュー',
                  ko: '편집 보기',
                  fr: 'Vue éditeur',
                })}
              </button>
              <button
                type="button"
                aria-pressed={mobileSurface === 'preview'}
                onClick={() => setMobileSurface('preview')}
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  mobileSurface === 'preview'
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                {pickLocaleText(locale, {
                  en: 'Preview view',
                  zh_HANS: '预览视图',
                  zh_HANT: '預覽視圖',
                  ja: 'プレビュービュー',
                  ko: '미리보기 보기',
                  fr: 'Vue aperçu',
                })}
              </button>
            </div>
            <div
              className="rounded-2xl border border-slate-200 bg-white/96 px-3 py-2 text-sm font-medium text-slate-700"
              data-testid="ide-mobile-surface-status"
              role="status"
            >
              {mobileSurfaceStatusLabel}
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-2 xl:flex">
            <PublicPresenceBadge
              icon={
                target === 'template' ? (
                  <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Package2 className="h-4 w-4" aria-hidden="true" />
                )
              }
              tone="rose"
            >
              {ideBadgeLabel}
            </PublicPresenceBadge>
            <PublicPresenceBadge tone="slate" variant="outline">
              {title}
            </PublicPresenceBadge>
            <PublicPresenceBadge
              tone={editorDirty ? 'warning' : 'success'}
              variant="outline"
            >
              {saveStatusLabel}
            </PublicPresenceBadge>
            <PublicPresenceBadge
              tone={lastValidatedAt && !editorDirty ? 'success' : 'warning'}
              variant="outline"
            >
              {validationStatusLabel}
            </PublicPresenceBadge>
            <PublicPresenceBadge className="hidden 2xl:inline-flex" tone="slate" variant="outline">
              {activeFile?.path}
            </PublicPresenceBadge>
            <PublicPresenceBadge className="hidden 2xl:inline-flex" tone="slate" variant="outline">
              {activeFile?.language ?? 'text'}
            </PublicPresenceBadge>
            <span className="h-5 w-px shrink-0 bg-slate-200" aria-hidden="true" />
            {authoringActions.map((action) =>
              action.kind === 'button' ? (
                <button
                  key={action.key}
                  type="button"
                  disabled={
                    action.key === 'save'
                      ? !editorDirty
                      : action.key === 'submit'
                        ? editorDirty || !lastValidatedAt
                        : false
                  }
                  onClick={() => {
                    if (action.key === 'save') {
                      handleSaveDraft();
                    } else if (action.key === 'validate') {
                      handleValidate();
                    } else if (action.key === 'submit') {
                      handleSubmit();
                    }
                  }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ) : (
                <Link
                  key={action.key}
                  href={action.href ?? '#'}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    action.tone === 'rose'
                      ? 'border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </Link>
              ),
            )}
          </div>
        </PublicPresenceSurface>

        {mobileActionsOpen ? (
          <PublicPresenceSurface
            aria-label={pickLocaleText(locale, {
              en: 'Authoring actions sheet',
              zh_HANS: '创作操作抽屉',
              zh_HANT: '創作操作抽屜',
              ja: 'オーサリング操作シート',
              ko: '작성 작업 시트',
              fr: 'Feuille actions authoring',
            })}
            aria-modal
            className="!fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl xl:hidden"
            data-testid="ide-mobile-actions-sheet"
            id={mobileActionsSheetId}
            role="dialog"
            variant="inset"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-950">
                  {pickLocaleText(locale, {
                    en: 'Authoring actions',
                    zh_HANS: '创作操作',
                    zh_HANT: '創作操作',
                    ja: 'オーサリング操作',
                    ko: '작성 작업',
                    fr: 'Actions d’authoring',
                  })}
                </h2>
                <p className="text-sm text-slate-600">
                  {pickLocaleText(locale, {
                    en: 'Use this sheet for save, review, preview, and route actions.',
                    zh_HANS: '在这里处理保存、提审、预览与跳转操作。',
                    zh_HANT: '在這裡處理儲存、送審、預覽與跳轉操作。',
                    ja: 'ここで保存、レビュー、プレビュー、移動操作を行います。',
                    ko: '이 시트에서 저장, 검토, 미리보기, 이동 작업을 진행합니다.',
                    fr: 'Utilisez cette feuille pour enregistrer, réviser, prévisualiser ou naviguer.',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileActionsOpen(false)}
                ref={mobileActionsOverlay.mobileInitialFocusRef}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {pickLocaleText(locale, {
                  en: 'Close',
                  zh_HANS: '关闭',
                  zh_HANT: '關閉',
                  ja: '閉じる',
                  ko: '닫기',
                  fr: 'Fermer',
                })}
              </button>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <PublicPresenceBadge tone={editorDirty ? 'warning' : 'success'} variant="outline">
                {saveStatusLabel}
              </PublicPresenceBadge>
              <PublicPresenceBadge tone={lastValidatedAt && !editorDirty ? 'success' : 'warning'} variant="outline">
                {validationStatusLabel}
              </PublicPresenceBadge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {authoringActions.map((action) =>
                action.kind === 'button' ? (
                  <button
                    key={action.key}
                    type="button"
                    disabled={
                      action.key === 'save'
                        ? !editorDirty
                        : action.key === 'submit'
                          ? editorDirty || !lastValidatedAt
                          : false
                    }
                    onClick={() => {
                      if (action.key === 'save') {
                        handleSaveDraft();
                      } else if (action.key === 'validate') {
                        handleValidate();
                      } else if (action.key === 'submit') {
                        handleSubmit();
                      }

                      setMobileActionsOpen(false);
                    }}
                    className="inline-flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-center text-[11px] font-semibold leading-tight text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </button>
                ) : (
                  <Link
                    key={action.key}
                    href={action.href ?? '#'}
                    className={`inline-flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-[11px] font-semibold leading-tight transition ${
                      action.tone === 'rose'
                        ? 'border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </Link>
                ),
              )}
            </div>
          </PublicPresenceSurface>
        ) : null}

        <div className="relative grid min-h-[calc(100vh-4.75rem)] gap-2 xl:grid-cols-[3.5rem_minmax(0,0.95fr)_minmax(34rem,1.05fr)] 2xl:grid-cols-[3.5rem_minmax(0,1.05fr)_minmax(38rem,1fr)]">
          <PublicPresenceSurface
            className="!fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-row items-center gap-2 rounded-full border border-slate-200/90 bg-white/97 px-2 py-2 shadow-lg backdrop-blur md:!static md:bottom-auto md:left-auto md:z-auto md:h-full md:translate-x-0 md:flex-col md:rounded-[2rem] md:border-transparent md:bg-white md:px-1 md:py-2 md:shadow-none md:backdrop-blur-0"
            data-testid="ide-file-rail"
            variant="inset"
          >
            {[
              {
                key: 'files',
                label: pickLocaleText(locale, {
                  en: 'Files',
                  zh_HANS: '文件',
                  zh_HANT: '檔案',
                  ja: 'ファイル',
                  ko: '파일',
                  fr: 'Fichiers',
                }),
                icon: <FileText className="h-4 w-4" aria-hidden="true" />,
              },
              {
                key: 'checks',
                label: pickLocaleText(locale, {
                  en: 'Validation checks',
                  zh_HANS: '校验检查',
                  zh_HANT: '驗證檢查',
                  ja: '検証チェック',
                  ko: '검증 점검',
                  fr: 'Contrôles',
                }),
                icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
              },
            ].map((item) => {
              const isActive = utilityPanel === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  aria-controls={item.key === 'files' ? fileDrawerId : validationDrawerId}
                  aria-expanded={isActive}
                  aria-label={item.label}
                  aria-pressed={isActive}
                  ref={isActive
                    ? item.key === 'files'
                      ? filesDrawerOverlay.fallbackTriggerRef
                      : validationDrawerOverlay.fallbackTriggerRef
                    : undefined}
                  onClick={(event) => {
                    if (item.key === 'files') {
                      filesDrawerOverlay.registerTrigger(event.currentTarget);
                    } else {
                      validationDrawerOverlay.registerTrigger(event.currentTarget);
                    }

                    setUtilityPanel((current) => (current === item.key ? null : item.key as 'files' | 'checks'));
                  }}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-3 transition md:h-11 md:w-11 md:px-0 ${
                    isActive
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  title={item.label}
                >
                  {item.icon}
                  <span className="text-xs font-semibold md:hidden">{item.label}</span>
                </button>
              );
            })}
          </PublicPresenceSurface>

          <div className="flex h-full flex-col">
            <PublicPresenceSurface
              className={`relative h-full min-h-[calc(100vh-4.75rem)] flex-col border border-slate-200/80 bg-white/95 p-0 sm:p-0 lg:p-0 ${
                mobileSurface === 'editor' ? 'flex' : 'hidden'
              } xl:flex`}
              data-testid="ide-editor-surface"
            >
              <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-start">
                <div className="pointer-events-auto flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap rounded-full border border-slate-200/90 bg-white/96 px-3 py-2 text-sm shadow-sm [scrollbar-width:none]">
                  <PublicPresenceBadge tone="rose">
                    {pickLocaleText(locale, {
                      en: 'Editor',
                      zh_HANS: '编辑器',
                      zh_HANT: '編輯器',
                      ja: 'エディタ',
                      ko: '편집기',
                      fr: 'Editeur',
                    })}
                  </PublicPresenceBadge>
                  <PublicPresenceBadge className="hidden sm:inline-flex" tone="slate" variant="outline">
                    {activeFile?.path}
                  </PublicPresenceBadge>
                </div>
              </div>
              <div className="min-h-0 flex-1 px-3 pb-3 pt-14 sm:px-4 sm:pb-4 sm:pt-16">
                <div
                  data-testid="monaco-editor-host"
                  className="h-full overflow-hidden rounded-[1.75rem] border border-slate-200"
                >
                  <MonacoEditor
                    defaultLanguage={activeFile?.language}
                    height="100%"
                    options={{
                      automaticLayout: true,
                      fontSize: 13,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                    }}
                    path={activeFile?.path}
                    theme="vs-dark"
                    value={activeFile?.contents ?? ''}
                    onChange={(value) => {
                      startTransition(() => {
                        setFiles((current) =>
                          current.map((file) =>
                            file.path === activeFile?.path
                              ? { ...file, contents: value ?? '' }
                              : file,
                          ),
                        );
                      });
                      setEditorDirty(true);
                      setSubmitStatus('idle');
                    }}
                  />
                </div>
              </div>
            </PublicPresenceSurface>
          </div>

          <PublicPresenceSurface
            className={`relative h-full min-h-[calc(100vh-4.75rem)] flex-col border border-slate-200/80 bg-white/95 p-0 sm:p-0 lg:p-0 xl:min-w-[28rem] ${
              mobileSurface === 'preview' ? 'flex' : 'hidden'
            } xl:flex`}
            data-testid="ide-preview-surface"
          >
            <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-start sm:inset-x-4">
              {!isWideDesktop ? (
                <div className="pointer-events-auto w-full rounded-[1.5rem] border border-slate-200/90 bg-white/96 px-3 py-2 text-sm shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <PublicPresenceBadge tone="rose">
                      {pickLocaleText(locale, {
                        en: 'Live preview',
                        zh_HANS: '实时预览',
                        zh_HANT: '即時預覽',
                        ja: 'ライブプレビュー',
                        ko: '라이브 프리뷰',
                        fr: 'Aperçu live',
                      })}
                    </PublicPresenceBadge>
                    <button
                      type="button"
                      data-testid="ide-mobile-preview-options-button"
                      aria-controls={mobilePreviewOptionsSheetId}
                      aria-expanded={mobilePreviewOptionsOpen}
                      aria-haspopup="dialog"
                      ref={mobilePreviewOptionsOverlay.fallbackTriggerRef}
                      onClick={(event) => {
                        mobilePreviewOptionsOverlay.registerTrigger(event.currentTarget);
                        setMobilePreviewOptionsOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      {pickLocaleText(locale, {
                        en: 'Preview options',
                        zh_HANS: '预览选项',
                        zh_HANT: '預覽選項',
                        ja: 'プレビュー設定',
                        ko: '미리보기 옵션',
                        fr: 'Options aperçu',
                      })}
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={viewport === 'desktop'}
                      onClick={() => setViewport('desktop')}
                      className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                        viewport === 'desktop'
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <PlaySquare className="h-4 w-4" aria-hidden="true" />
                      {pickLocaleText(locale, {
                        en: 'Desktop',
                        zh_HANS: '桌面端',
                        zh_HANT: '桌面端',
                        ja: 'デスクトップ',
                        ko: '데스크톱',
                        fr: 'Desktop',
                      })}
                    </button>
                    <button
                      type="button"
                      aria-pressed={viewport === 'mobile'}
                      onClick={() => setViewport('mobile')}
                      className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                        viewport === 'mobile'
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Smartphone className="h-4 w-4" aria-hidden="true" />
                      {pickLocaleText(locale, {
                        en: 'Mobile',
                        zh_HANS: '移动端',
                        zh_HANT: '行動端',
                        ja: 'モバイル',
                        ko: '모바일',
                        fr: 'Mobile',
                      })}
                    </button>
                  </div>
                </div>
              ) : null}
              {isWideDesktop ? (
                <div className="pointer-events-auto min-w-0 flex-wrap items-center gap-2 rounded-[1.5rem] border border-slate-200/90 bg-white/96 px-3 py-2 text-sm shadow-sm xl:flex">
                <PublicPresenceBadge tone="rose">
                  {pickLocaleText(locale, {
                    en: 'Live preview',
                    zh_HANS: '实时预览',
                    zh_HANT: '即時預覽',
                    ja: 'ライブプレビュー',
                    ko: '라이브 프리뷰',
                    fr: 'Aperçu live',
                  })}
                </PublicPresenceBadge>
                <button
                  type="button"
                  aria-pressed={viewport === 'desktop'}
                  onClick={() => setViewport('desktop')}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    viewport === 'desktop'
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <PlaySquare className="mr-2 inline-flex h-4 w-4" aria-hidden="true" />
                  {pickLocaleText(locale, {
                    en: 'Desktop',
                    zh_HANS: '桌面端',
                    zh_HANT: '桌面端',
                    ja: 'デスクトップ',
                    ko: '데스크톱',
                    fr: 'Desktop',
                  })}
                </button>
                <button
                  type="button"
                  aria-pressed={viewport === 'mobile'}
                  onClick={() => setViewport('mobile')}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    viewport === 'mobile'
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="mr-2 inline-flex h-4 w-4" aria-hidden="true" />
                  {pickLocaleText(locale, {
                    en: 'Mobile',
                    zh_HANS: '移动端',
                    zh_HANT: '行動端',
                    ja: 'モバイル',
                    ko: '모바일',
                    fr: 'Mobile',
                  })}
                </button>
                <label className="text-sm">
                  <span className="sr-only">
                    {getSampleContentLabel(locale)}
                  </span>
                  <select
                    value={fixtureMode}
                    onChange={(event) => setFixtureMode(event.target.value as FixtureMode)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="default">{getFixtureModeLabel(locale, 'default')}</option>
                    <option value="unsafeFallback">{getFixtureModeLabel(locale, 'unsafeFallback')}</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="sr-only">
                    {getRevealStateLabel(locale)}
                  </span>
                  <select
                    value={previewPhase}
                    onChange={(event) =>
                      setPreviewPhase(event.target.value as PublicPresencePhaseVisibility)
                    }
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    {[
                      'always',
                      'teaser',
                      'countdown',
                      'preRevealHold',
                      'revealed',
                      'liveLaunch',
                      'postLaunch',
                      'expiredFallback',
                    ].map((phase) => (
                      <option key={phase} value={phase}>
                        {getAuthoringPhaseLabel(
                          locale,
                          phase as PublicPresencePhaseVisibility,
                        )}
                      </option>
                    ))}
                  </select>
                </label>
                </div>
              ) : null}
            </div>

            <div
              data-testid="ide-live-preview"
              className={`min-h-0 flex-1 px-3 pb-3 pt-16 sm:px-4 sm:pb-4 sm:pt-20 ${
                viewport === 'mobile' ? 'mx-auto w-full max-w-[24rem]' : ''
              }`}
            >
              <div className="h-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 p-3">
                <div className="h-full overflow-auto rounded-[1.5rem] bg-white px-4 py-5">
                  {viewport === 'mobile' ? (
                    <div className="mx-auto w-full">
                      <PublicHomepageProjectionRenderer
                        projection={previewProjection}
                        responsiveMode="mobile"
                      />
                    </div>
                  ) : (
                    <div ref={desktopPreviewFit.hostRef} className="mx-auto flex w-full justify-center overflow-hidden">
                      <div
                        className="overflow-hidden"
                        style={{
                          height: desktopPreviewFit.scaledHeight || undefined,
                          width: desktopPreviewFit.scaledWidth || undefined,
                        }}
                      >
                        <div
                          ref={desktopPreviewFit.contentRef}
                          className="max-w-none"
                          style={{
                            transform: `scale(${desktopPreviewFit.scale})`,
                            transformOrigin: 'top left',
                            width: '720px',
                          }}
                        >
                          <PublicHomepageProjectionRenderer
                            projection={previewProjection}
                            responsiveMode="desktop"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </PublicPresenceSurface>

          {mobilePreviewOptionsOpen ? (
            <PublicPresenceSurface
              aria-label={pickLocaleText(locale, {
                en: 'Preview options sheet',
                zh_HANS: '预览选项抽屉',
                zh_HANT: '預覽選項抽屜',
                ja: 'プレビュー設定シート',
                ko: '미리보기 옵션 시트',
                fr: 'Feuille options aperçu',
              })}
              aria-modal
              className="!fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl xl:hidden"
              data-testid="ide-mobile-preview-options-sheet"
              id={mobilePreviewOptionsSheetId}
              role="dialog"
              variant="inset"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-950">
                    {pickLocaleText(locale, {
                      en: 'Preview options',
                      zh_HANS: '预览选项',
                      zh_HANT: '預覽選項',
                      ja: 'プレビュー設定',
                      ko: '미리보기 옵션',
                      fr: 'Options aperçu',
                    })}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {pickLocaleText(locale, {
                      en: 'Choose the sample content and reveal state you want to review here.',
                      zh_HANS: '在这里选择要检查的样例内容与揭晓状态。',
                      zh_HANT: '在這裡選擇要檢查的樣例內容與揭曉狀態。',
                      ja: 'ここで確認したいサンプル内容と公開状態を選びます。',
                      ko: '여기에서 확인할 샘플 콘텐츠와 공개 상태를 고릅니다.',
                      fr: 'Choisissez ici le contenu d’exemple et l’état de reveal à vérifier.',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobilePreviewOptionsOpen(false)}
                  ref={mobilePreviewOptionsOverlay.mobileInitialFocusRef}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  {pickLocaleText(locale, {
                    en: 'Close',
                    zh_HANS: '关闭',
                    zh_HANT: '關閉',
                    ja: '閉じる',
                    ko: '닫기',
                    fr: 'Fermer',
                  })}
                </button>
              </div>
              <div className="grid gap-3">
                <label className="text-sm">
                  <span className="mb-2 block font-medium text-slate-700">
                    {getSampleContentLabel(locale)}
                  </span>
                  <select
                    value={fixtureMode}
                    onChange={(event) => setFixtureMode(event.target.value as FixtureMode)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900"
                  >
                    <option value="default">{getFixtureModeLabel(locale, 'default')}</option>
                    <option value="unsafeFallback">{getFixtureModeLabel(locale, 'unsafeFallback')}</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-2 block font-medium text-slate-700">
                    {getRevealStateLabel(locale)}
                  </span>
                  <select
                    value={previewPhase}
                    onChange={(event) =>
                      setPreviewPhase(event.target.value as PublicPresencePhaseVisibility)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900"
                  >
                    {[
                      'always',
                      'teaser',
                      'countdown',
                      'preRevealHold',
                      'revealed',
                      'liveLaunch',
                      'postLaunch',
                      'expiredFallback',
                    ].map((phase) => (
                      <option key={phase} value={phase}>
                        {getAuthoringPhaseLabel(
                          locale,
                          phase as PublicPresencePhaseVisibility,
                        )}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </PublicPresenceSurface>
          ) : null}

          {utilityPanel === 'files' ? (
            <PublicPresenceSurface
              aria-label={pickLocaleText(locale, {
                en: 'Files drawer',
                zh_HANS: '文件抽屉',
                zh_HANT: '檔案抽屜',
                ja: 'ファイルドロワー',
                ko: '파일 드로어',
                fr: 'Tiroir fichiers',
              })}
              aria-modal={false}
              className="!fixed inset-x-3 bottom-3 z-40 max-h-[70vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl lg:!absolute lg:inset-y-3 lg:left-[4.5rem] lg:right-auto lg:w-[20rem]"
              data-testid="ide-file-drawer"
              id={fileDrawerId}
              role="dialog"
              variant="inset"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {pickLocaleText(locale, {
                      en: 'Files',
                      zh_HANS: '文件',
                      zh_HANT: '檔案',
                      ja: 'ファイル',
                      ko: '파일',
                      fr: 'Fichiers',
                    })}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {pickLocaleText(locale, {
                      en: 'Open the working files for this draft, its sample content, and the launch checklist here.',
                      zh_HANS: '这里汇总了这个草稿的工作文件、样例内容与上线检查清单。',
                      zh_HANT: '這裡彙整了這個草稿的工作檔案、樣例內容與上線檢查清單。',
                      ja: 'この草稿の作業ファイル、サンプル内容、公開前チェックをここにまとめています。',
                      ko: '이 초안의 작업 파일, 샘플 콘텐츠, 런치 체크리스트를 여기에서 확인합니다.',
                      fr: 'Retrouvez ici les fichiers de travail du brouillon, son contenu d’exemple et la checklist de lancement.',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUtilityPanel(null)}
                  ref={filesDrawerOverlay.desktopInitialFocusRef}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  {pickLocaleText(locale, {
                    en: 'Close',
                    zh_HANS: '关闭',
                    zh_HANT: '關閉',
                    ja: '閉じる',
                    ko: '닫기',
                    fr: 'Fermer',
                  })}
                </button>
              </div>
              <div className="space-y-2 overflow-auto pr-1">
                {files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    data-testid={`ide-file-${file.path}`}
                    onClick={() => {
                      setActivePath(file.path);
                      setUtilityPanel(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-medium transition ${
                      activePath === file.path
                        ? 'border-rose-300 bg-rose-50 text-rose-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {resolveFileIcon(file)}
                    <span className="truncate">{file.path}</span>
                  </button>
                ))}
              </div>
            </PublicPresenceSurface>
          ) : null}

          {utilityPanel === 'checks' ? (
            <PublicPresenceSurface
              aria-label={pickLocaleText(locale, {
                en: 'Validation checks drawer',
                zh_HANS: '校验检查抽屉',
                zh_HANT: '驗證檢查抽屜',
                ja: '検証チェックドロワー',
                ko: '검증 점검 드로어',
                fr: 'Tiroir contrôles',
              })}
              aria-modal={false}
              className="!fixed inset-x-3 bottom-3 z-40 max-h-[70vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl lg:!absolute lg:inset-y-3 lg:left-[4.5rem] lg:right-auto lg:w-[22rem]"
              data-testid="ide-validation-drawer"
              id={validationDrawerId}
              role="dialog"
              variant="inset"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-950">
                    {pickLocaleText(locale, {
                      en: 'Validation checks',
                      zh_HANS: '校验检查',
                      zh_HANT: '驗證檢查',
                      ja: '検証チェック',
                      ko: '검증 점검',
                      fr: 'Contrôles de validation',
                    })}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {pickLocaleText(locale, {
                      en: 'Keep this drawer lightweight so the editor and preview stay in charge.',
                      zh_HANS: '这里只保留轻量校验，让编辑器和预览保持主工作面。',
                      zh_HANT: '此處只保留輕量檢查，讓編輯器與預覽保持主工作面。',
                      ja: 'この引き出しは軽量に保ち、エディタとプレビューを主作業面にします。',
                      ko: '이 패널은 가볍게 유지해 편집기와 미리보기가 주 작업면이 되도록 합니다.',
                      fr: 'Ce panneau reste léger pour laisser l’éditeur et l’aperçu au premier plan.',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUtilityPanel(null)}
                  ref={validationDrawerOverlay.desktopInitialFocusRef}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  {pickLocaleText(locale, {
                    en: 'Close',
                    zh_HANS: '关闭',
                    zh_HANT: '關閉',
                    ja: '閉じる',
                    ko: '닫기',
                    fr: 'Fermer',
                  })}
                </button>
              </div>
              <div className="mb-4 grid gap-2" data-testid="ide-validation-status">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{saveStatusLabel}</p>
                  <p className="mt-1">{formattedSavedAt}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{validationStatusLabel}</p>
                  <p className="mt-1">{formattedValidatedAt}</p>
                </div>
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    submitStatus === 'ready'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="font-semibold">
                    {submitStatus === 'ready'
                      ? pickLocaleText(locale, {
                          en: 'Ready to submit',
                          zh_HANS: '可提交审核',
                          zh_HANT: '可提交審核',
                          ja: 'レビュー提出の準備完了',
                          ko: '검토 제출 준비 완료',
                          fr: 'Prêt à soumettre',
                        })
                      : pickLocaleText(locale, {
                          en: 'Validate after each edit before submit',
                          zh_HANS: '每次编辑后先验证，再提交审核',
                          zh_HANT: '每次編輯後先驗證，再提交審核',
                          ja: '提出前に編集ごとに検証してください',
                          ko: '제출 전에는 편집마다 먼저 검증하세요',
                          fr: 'Validez après chaque modification avant de soumettre',
                        })}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {validationItems.map((item) => (
                  <div
                    key={item.message}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      item.level === 'warn'
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {item.level === 'warn' ? (
                        <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4" aria-hidden="true" />
                      )}
                      <span>{item.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PublicPresenceSurface>
          ) : null}
        </div>
      </div>
    </PublicPresenceShell>
  );
}
