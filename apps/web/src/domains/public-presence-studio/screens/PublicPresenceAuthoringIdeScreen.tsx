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
} from '@/domains/public-presence-studio/screens/public-presence-studio.copy';
import {
  buildPublicPresenceComponentAuthoringPath,
  buildPublicPresenceHomepageSurfacePath,
  buildPublicPresenceStudioPreviewPath,
  buildPublicPresenceTemplateAuthoringPath,
} from '@/platform/routing/workspace-paths';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
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
): PublicPresencePublicProjection {
  const title =
    templateId === 'debutReveal'
      ? 'Mika Debut Countdown'
      : 'Aki Rosenthal Official Hub';
  const description =
    templateId === 'debutReveal'
      ? 'Countdown-safe fan page with reveal controls.'
      : 'Always-on official public presence for active fans.';

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
            templateId === 'debutReveal' ? 'Open reveal room' : 'Watch stream',
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
): PublicPresencePublicProjection {
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
      title: `${componentType} fixture`,
      description: `Fixture preview for ${componentType}.`,
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
        title: `${componentType} fixture`,
        description: `Preview sample for ${componentType}.`,
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

function buildValidationItems(
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
          ? 'Layout order and slots stay in code while Studio edits only the approved fields.'
          : 'Component behavior stays inside its approved editing range from this workbench.',
    },
    {
      level: fixtureMode === 'unsafeFallback' ? 'warn' : 'pass',
      message:
        fixtureMode === 'unsafeFallback'
          ? 'Protected fallback sample is selected so the preview shows the safe fan-facing state.'
          : 'Default sample is active for the current preview pass.',
    },
    {
      level: 'pass',
      message: `Preview controls are running in ${viewport} mode at the ${previewPhase} phase in this workspace.`,
    },
  ] as const;
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
  const previewProjection = useMemo<PublicPresencePublicProjection>(
    () =>
      target === 'template'
        ? buildTemplatePreviewProjection(effectiveTemplateId)
        : buildComponentPreviewProjection(effectiveComponentType),
    [effectiveComponentType, effectiveTemplateId, target],
  );
  const validationItems = useMemo(
    () => buildValidationItems(target, fixtureMode, viewport, previewPhase),
    [fixtureMode, previewPhase, target, viewport],
  );
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

  const ideBadgeLabel = pickLocaleText(locale, {
    en: target === 'template' ? 'Template IDE' : 'Component IDE',
    zh_HANS: target === 'template' ? '模板 IDE' : '组件 IDE',
    zh_HANT: target === 'template' ? '模板 IDE' : '元件 IDE',
    ja: target === 'template' ? 'テンプレート IDE' : 'コンポーネント IDE',
    ko: target === 'template' ? '템플릿 IDE' : '컴포넌트 IDE',
    fr: target === 'template' ? 'IDE Template' : 'IDE Composant',
  });
  const title = pickLocaleText(locale, {
    en: target === 'template' ? 'Add Template' : 'Add Component',
    zh_HANS: target === 'template' ? '新增模板' : '新增组件',
    zh_HANT: target === 'template' ? '新增模板' : '新增元件',
    ja: target === 'template' ? 'テンプレートを追加' : 'コンポーネントを追加',
    ko: target === 'template' ? '템플릿 추가' : '컴포넌트 추가',
    fr: target === 'template' ? 'Ajouter un template' : 'Ajouter un composant',
  });
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
          ? getHomepageSurfaceActionLabel(locale, 'addTemplate')
          : getHomepageSurfaceActionLabel(locale, 'addComponent'),
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
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
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
            <div className="grid grid-cols-2 gap-2">
              {authoringActions.map((action) =>
                action.kind === 'button' ? (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => setMobileActionsOpen(false)}
                    className="inline-flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-center text-[11px] font-semibold leading-tight text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
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
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                    isActive
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  title={item.label}
                >
                  {item.icon}
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
              <div className="pointer-events-auto w-full rounded-[1.5rem] border border-slate-200/90 bg-white/96 px-3 py-2 text-sm shadow-sm xl:hidden">
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
              <div className="pointer-events-auto hidden min-w-0 flex-wrap items-center gap-2 rounded-[1.5rem] border border-slate-200/90 bg-white/96 px-3 py-2 text-sm shadow-sm xl:flex">
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
                    {pickLocaleText(locale, {
                      en: 'Fixture',
                      zh_HANS: '夹具',
                      zh_HANT: '夾具',
                      ja: 'フィクスチャ',
                      ko: '픽스처',
                      fr: 'Fixture',
                    })}
                  </span>
                  <select
                    value={fixtureMode}
                    onChange={(event) => setFixtureMode(event.target.value as FixtureMode)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="default">default</option>
                    <option value="unsafeFallback">unsafeFallback</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="sr-only">
                    {pickLocaleText(locale, {
                      en: 'Phase',
                      zh_HANS: '阶段',
                      zh_HANT: '階段',
                      ja: 'フェーズ',
                      ko: '단계',
                      fr: 'Phase',
                    })}
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
                        {phase}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
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
                      en: 'Choose fixture, phase, and viewport options here.',
                      zh_HANS: '在这里选择夹具、阶段和视口选项。',
                      zh_HANT: '在這裡選擇夾具、階段與視口選項。',
                      ja: 'ここでフィクスチャ、フェーズ、ビューポート設定を選びます。',
                      ko: '여기에서 픽스처, 단계, 뷰포트 옵션을 선택합니다.',
                      fr: 'Choisissez ici les options de fixture, phase et viewport.',
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
                    {pickLocaleText(locale, {
                      en: 'Fixture',
                      zh_HANS: '夹具',
                      zh_HANT: '夾具',
                      ja: 'フィクスチャ',
                      ko: '픽스처',
                      fr: 'Fixture',
                    })}
                  </span>
                  <select
                    value={fixtureMode}
                    onChange={(event) => setFixtureMode(event.target.value as FixtureMode)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900"
                  >
                    <option value="default">default</option>
                    <option value="unsafeFallback">unsafeFallback</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-2 block font-medium text-slate-700">
                    {pickLocaleText(locale, {
                      en: 'Phase',
                      zh_HANS: '阶段',
                      zh_HANT: '階段',
                      ja: 'フェーズ',
                      ko: '단계',
                      fr: 'Phase',
                    })}
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
                        {phase}
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
                      en: 'Code, manifest, schema, fixture, and validation notes stay together here.',
                      zh_HANS: '代码、manifest、schema、fixture 与校验说明都集中在这里。',
                      zh_HANT: '程式碼、manifest、schema、fixture 與驗證說明都集中在這裡。',
                      ja: 'コード、manifest、schema、fixture、検証メモをここにまとめます。',
                      ko: '코드, 매니페스트, 스키마, 픽스처, 검증 메모가 여기에 함께 있습니다.',
                      fr: 'Le code, les manifests, schemas, fixtures et notes de validation restent ici.',
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
