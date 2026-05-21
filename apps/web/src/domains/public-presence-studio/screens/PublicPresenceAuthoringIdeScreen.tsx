'use client';

import {
  PUBLIC_PRESENCE_COMPONENT_DEFINITIONS,
  PUBLIC_PRESENCE_SAFETY_POLICY,
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
import {
  readPublicPresenceAuthoringDraft,
  savePublicPresenceAuthoringDraft,
  submitPublicPresenceAuthoringDraft,
  type PublicPresenceAuthoringDraftResponse,
  type PublicPresenceAuthoringFile,
  type PublicPresenceAuthoringValidationSummary,
  validatePublicPresenceAuthoringDraft,
} from '@/domains/public-presence-studio/api/public-presence-studio.api';
import { useOverlayFocusManager } from '@/domains/public-presence-studio/screens/public-presence-studio-overlay';
import {
  getHomepageSurfaceActionLabel,
  getPublicPresencePreviewPhaseLabel,
  getPublicPresenceTemplateLabel,
} from '@/domains/public-presence-studio/screens/public-presence-studio.copy';
import {
  buildPublicPresenceAdvancedIdePath,
  buildPublicPresenceComponentAuthoringPath,
  buildPublicPresenceStudioEditorPath,
  buildPublicPresenceHomepageSurfacePath,
  buildPublicPresenceStudioPreviewPath,
  buildPublicPresenceTemplateAuthoringPath,
} from '@/platform/routing/workspace-paths';
import { formatLocaleDateTime, pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { useSession } from '@/platform/runtime/session/session-provider';

type AuthoringTarget = 'template' | 'component' | 'advanced';
type PreviewViewport = 'desktop' | 'mobile';
type FixtureMode = 'default' | 'unsafeFallback';
type MobileAuthoringSurface = 'editor' | 'preview';
type MobileIdeOverlay = 'actions' | 'previewOptions' | 'files' | 'checks' | null;
type AdvancedPageMode = 'page-source' | 'custom-html' | 'registry-snippets';
type MonacoDisposableLike = {
  dispose: () => void;
};
type MonacoTextModelLike = {
  getValue: () => string;
  onDidChangeContent: (listener: () => void) => MonacoDisposableLike;
};
type MonacoEditorLike = {
  focus?: () => void;
  getModel: () => MonacoTextModelLike | null;
  onDidChangeModelContent?: (listener: () => void) => MonacoDisposableLike;
};
type MonacoEditorProps = {
  defaultLanguage?: string;
  height?: string | number;
  loading?: React.ReactNode;
  onChange?: (value: string | undefined) => void;
  onMount?: (editor: MonacoEditorLike, monaco: unknown) => void;
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

interface ValidationItem {
  level: 'pass' | 'warn';
  message: string;
}

type VirtualFileGroupId = 'docs' | 'sidecars' | 'source' | 'styles' | 'tests';

interface CustomHtmlPreviewState {
  excerpt: string;
  issues: string[];
  srcDoc: string | null;
}

function normalizeAuthoringFileKind(
  kind: string,
): VirtualFile['kind'] {
  return kind === 'doc' || kind === 'fixture' || kind === 'schema'
    ? kind
    : 'code';
}

function normalizeAuthoringFiles(
  draft: PublicPresenceAuthoringDraftResponse | null,
  fallbackFiles: VirtualFile[],
): VirtualFile[] {
  if (!draft?.sourceBundle?.length) {
    return fallbackFiles;
  }

  return draft.sourceBundle.map((file) => ({
    contents: file.contents,
    kind: normalizeAuthoringFileKind(file.kind),
    language: file.language,
    path: file.path,
  }));
}

function buildAuthoringValidationSummary(
  validationItems: readonly ValidationItem[],
): PublicPresenceAuthoringValidationSummary {
  const warnCount = validationItems.filter((item) => item.level === 'warn').length;
  const passCount = validationItems.filter((item) => item.level === 'pass').length;

  return {
    issueCount: warnCount,
    passCount,
    warnCount,
  };
}

const CUSTOM_HTML_URL_BYPASS_PATTERN =
  /(?:href|src)\s*=\s*["']?\s*(?:\/\/|\/\\|https?:\/\/[^"'\s]*@|https?:\/\/[^"'\s]*(?:%2f%2f|%5c%5c))/i;
const CUSTOM_HTML_EXTERNAL_ASSET_PATTERN =
  /^(?:https?:|data:|\/\/|\/\\|%2f%2f|%5c%5c)/i;
const CUSTOM_HTML_CSS_ASSET_PATTERN =
  /@import|url\s*\(\s*['"]?\s*(?:https?:|data:|\/\/|\/\\|%2f%2f|%5c%5c)/i;
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.hasAttribute('disabled') || element.hidden) {
      return false;
    }

    return element.getAttribute('aria-hidden') !== 'true';
  });
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
      path: 'src/slots.ts',
      kind: 'code',
      language: 'typescript',
      contents: `export const ${templateId}Slots = ${JSON.stringify(definition.defaultSectionOrder, null, 2)};\n`,
    },
    {
      path: 'src/theme.css',
      kind: 'code',
      language: 'css',
      contents: `:root {\n  --page-accent: ${templateId === 'debutReveal' ? '#8b5cf6' : '#f472b6'};\n  --page-surface: ${templateId === 'debutReveal' ? '#f5f3ff' : '#fff7fb'};\n}\n\n.hero-shell {\n  border-radius: 2rem;\n  background: var(--page-surface);\n  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);\n}\n`,
    },
    {
      path: 'docs/authoring.md',
      kind: 'doc',
      language: 'markdown',
      contents: `# ${definition.label}\n\n- Use the source files for layout and slot composition.\n- Keep manifests and fixtures as sidecars for registry and preview checks.\n- Validate against the sample fan page before review.\n`,
    },
    {
      path: 'tests/preview.spec.ts',
      kind: 'code',
      language: 'typescript',
      contents: `import { describe, expect, it } from 'vitest';\n\ndescribe('${templateId} preview bundle', () => {\n  it('keeps the registry section order stable', () => {\n    expect(${JSON.stringify(definition.defaultSectionOrder)}.length).toBeGreaterThan(0);\n  });\n});\n`,
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
      path: 'src/component.css',
      kind: 'code',
      language: 'css',
      contents: `.component-frame {\n  border-radius: 1.5rem;\n  border: 1px solid rgba(148, 163, 184, 0.28);\n  background: rgba(255, 255, 255, 0.94);\n}\n`,
    },
    {
      path: 'docs/usage.md',
      kind: 'doc',
      language: 'markdown',
      contents: `# ${componentType}\n\n- Keep this block inside approved homepage slots.\n- Declare visual fields and collection operations in the sidecar contract.\n- Use fixtures to review fan-facing copy before release.\n`,
    },
    {
      path: 'tests/component.spec.ts',
      kind: 'code',
      language: 'typescript',
      contents: `import { describe, expect, it } from 'vitest';\n\ndescribe('${componentType} registry contract', () => {\n  it('keeps visual support declared for Studio', () => {\n    expect('${definition.visualSupport}').toBeTruthy();\n  });\n});\n`,
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

function buildAdvancedFiles(
  mode: AdvancedPageMode,
  templateId: PublicPresenceTemplateId,
  locale: string,
): VirtualFile[] {
  const template = PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[templateId];

  if (mode === 'custom-html') {
    return [
      {
        path: 'src/index.html',
        kind: 'code',
        language: 'html',
        contents: `<main class="fan-page">\n  <section class="hero">\n    <p class="eyebrow">${template.label}</p>\n    <h1>${pickLocaleText(locale, {
          en: 'Design a safe custom fan page',
          zh_HANS: '设计一个安全的定制粉丝页',
          zh_HANT: '設計一個安全的客製粉絲頁',
          ja: '安全なカスタムファンページを設計する',
          ko: '안전한 커스텀 팬 페이지 만들기',
          fr: 'Concevoir une fan page personnalisée et sûre',
        })}</h1>\n    <p>${pickLocaleText(locale, {
          en: 'Use static HTML and CSS only. Scripts, event handlers, unsafe iframes, and hidden tracking are blocked.',
          zh_HANS: '这里只允许静态 HTML 和 CSS。脚本、事件处理器、不安全 iframe 与隐藏追踪都会被阻止。',
          zh_HANT: '這裡只允許靜態 HTML 與 CSS。腳本、事件處理器、不安全 iframe 與隱藏追蹤都會被阻止。',
          ja: 'ここでは静的な HTML と CSS のみ利用できます。スクリプト、イベント属性、危険な iframe、隠れた追跡はブロックされます。',
          ko: '여기서는 정적 HTML과 CSS만 사용할 수 있습니다. 스크립트, 이벤트 핸들러, 위험한 iframe, 숨은 추적은 차단됩니다.',
          fr: 'Ici, seuls le HTML et le CSS statiques sont autorisés. Les scripts, attributs d’événement, iframes non sûres et traqueurs cachés sont bloqués.',
        })}</p>\n  </section>\n</main>\n`,
      },
      {
        path: 'src/styles.css',
        kind: 'code',
        language: 'css',
        contents: `.fan-page {\n  min-height: 100vh;\n  padding: 4rem 1.5rem;\n  background: linear-gradient(180deg, #fffaf4 0%, #fff 48%, #f7fbff 100%);\n  color: #1f2937;\n}\n\n.hero {\n  max-width: 42rem;\n  margin: 0 auto;\n  padding: 2rem;\n  border-radius: 2rem;\n  background: rgba(255,255,255,0.94);\n  box-shadow: 0 20px 60px rgba(15,23,42,0.08);\n}\n\n.eyebrow {\n  font-size: 0.875rem;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: #e11d48;\n}\n`,
      },
      {
        path: 'docs/launch-checklist.md',
        kind: 'doc',
        language: 'markdown',
        contents: `# Launch checklist\n\n- Keep the page static and fan-facing.\n- Move unsafe embeds or scripts into approved registry components instead.\n- Recheck mobile preview before review.\n`,
      },
      {
        path: 'tests/safety.spec.ts',
        kind: 'code',
        language: 'typescript',
        contents: `import { describe, expect, it } from 'vitest';\n\ndescribe('custom html safety', () => {\n  it('stays free from blocked executable tags', () => {\n    expect(['<script', '<iframe']).toContain('<script');\n  });\n});\n`,
      },
      {
        path: 'safety/sanitizer.md',
        kind: 'doc',
        language: 'markdown',
        contents: `# Safety contract\n\n- Allowed: static HTML, CSS, text, images, approved public links.\n- Blocked patterns: ${PUBLIC_PRESENCE_SAFETY_POLICY.htmlRules.forbiddenPatterns.join(', ')}\n- Preview uses the same safety filter as public output.\n`,
      },
      {
        path: 'fixtures/default.json',
        kind: 'fixture',
        language: 'json',
        contents: JSON.stringify({ mode, locale, templateId }, null, 2),
      },
    ];
  }

  if (mode === 'registry-snippets') {
    return [
      {
        path: 'src/snippets.tsx',
        kind: 'code',
        language: 'typescript',
        contents: `export const homepageSnippets = [\n  { kind: 'template', id: '${templateId}', slots: ${JSON.stringify(template.defaultSectionOrder, null, 2)} },\n  { kind: 'component', id: 'SocialLinks' },\n  { kind: 'component', id: 'Schedule' },\n];\n`,
      },
      {
        path: 'src/slot-map.ts',
        kind: 'code',
        language: 'typescript',
        contents: `export const approvedSlotMap = {\n  templateId: '${templateId}',\n  sections: ${JSON.stringify(template.defaultSectionOrder, null, 2)},\n  components: ['SocialLinks', 'Schedule'],\n};\n`,
      },
      {
        path: 'docs/registry-snippets.md',
        kind: 'doc',
        language: 'markdown',
        contents: `# Registry snippets\n\nUse these placeholders to compose approved template slots and registered homepage components.\n`,
      },
      {
        path: 'tests/registry-snippets.spec.ts',
        kind: 'code',
        language: 'typescript',
        contents: `import { describe, expect, it } from 'vitest';\n\ndescribe('registry snippets', () => {\n  it('lists approved homepage blocks', () => {\n    expect(['SocialLinks', 'Schedule']).toContain('Schedule');\n  });\n});\n`,
      },
      {
        path: 'fixtures/default.json',
        kind: 'fixture',
        language: 'json',
        contents: JSON.stringify({ mode, locale, templateId, inserted: ['SocialLinks', 'Schedule'] }, null, 2),
      },
      {
        path: 'manifest.json',
        kind: 'schema',
        language: 'json',
        contents: JSON.stringify({ mode, templateId, type: 'registry-snippets' }, null, 2),
      },
    ];
  }

  return [
    {
      path: 'src/page-source.json',
      kind: 'code',
      language: 'json',
      contents: JSON.stringify(
        {
          templateId,
          schemaVersion: '1.0',
          metadata: {
            title: template.label,
            canonicalPath: `/preview/${templateId}`,
          },
          sections: template.defaultSectionOrder.map((kind, index) => ({
            id: `${kind}-${index + 1}`,
            kind,
          })),
        },
        null,
        2,
      ),
    },
    {
      path: 'validation/source-checks.md',
      kind: 'doc',
      language: 'markdown',
      contents: `# Page source repair\n\nUse this document for schema-level repair, migration review, and structured page validation.\n`,
    },
    {
      path: 'tests/page-source.spec.ts',
      kind: 'code',
      language: 'typescript',
      contents: `import { describe, expect, it } from 'vitest';\n\ndescribe('page source document', () => {\n  it('keeps a structured section list', () => {\n    expect(${JSON.stringify(template.defaultSectionOrder)}.length).toBeGreaterThan(0);\n  });\n});\n`,
    },
    {
      path: 'fixtures/default.json',
      kind: 'fixture',
      language: 'json',
      contents: JSON.stringify({ mode, locale, templateId }, null, 2),
    },
    {
      path: 'manifest.json',
      kind: 'schema',
      language: 'json',
      contents: JSON.stringify({ mode, templateId, sourceShape: 'structured-document' }, null, 2),
    },
  ];
}

function resolveFileIcon(file: VirtualFile) {
  if (file.kind === 'code') {
    return <Code2 className="h-4 w-4" aria-hidden="true" />;
  }

  if (file.kind === 'doc') {
    return <FileText className="h-4 w-4" aria-hidden="true" />;
  }

  return <FileJson2 className="h-4 w-4" aria-hidden="true" />;
}

function getVirtualFileKindLabel(
  locale: string,
  kind: VirtualFile['kind'],
) {
  switch (kind) {
    case 'code':
      return pickLocaleText(locale, {
        en: 'Source',
        zh_HANS: '源文件',
        zh_HANT: '源檔案',
        ja: 'ソース',
        ko: '소스',
        fr: 'Source',
      });
    case 'schema':
      return pickLocaleText(locale, {
        en: 'Sidecar schema',
        zh_HANS: '侧车结构',
        zh_HANT: '側車結構',
        ja: 'サイドカー定義',
        ko: '사이드카 스키마',
        fr: 'Schéma annexe',
      });
    case 'fixture':
      return pickLocaleText(locale, {
        en: 'Fixture',
        zh_HANS: '样例',
        zh_HANT: '樣例',
        ja: 'フィクスチャ',
        ko: '픽스처',
        fr: 'Fixture',
      });
    case 'doc':
      return pickLocaleText(locale, {
        en: 'Notes',
        zh_HANS: '说明',
        zh_HANT: '說明',
        ja: 'メモ',
        ko: '메모',
        fr: 'Notes',
      });
    default:
      return kind;
  }
}

function resolveVirtualFileGroupId(file: VirtualFile): VirtualFileGroupId {
  if (file.path.startsWith('tests/')) {
    return 'tests';
  }

  if (file.path.endsWith('.css') || file.path.includes('/styles')) {
    return 'styles';
  }

  if (file.kind === 'schema' || file.kind === 'fixture' || file.path.endsWith('.json')) {
    return 'sidecars';
  }

  if (file.kind === 'doc' || file.path.startsWith('docs/') || file.path.startsWith('safety/')) {
    return 'docs';
  }

  return 'source';
}

function getVirtualFileGroupLabel(
  locale: string,
  groupId: VirtualFileGroupId,
) {
  switch (groupId) {
    case 'source':
      return pickLocaleText(locale, {
        en: 'Source',
        zh_HANS: '源文件',
        zh_HANT: '源檔案',
        ja: 'ソース',
        ko: '소스',
        fr: 'Source',
      });
    case 'styles':
      return pickLocaleText(locale, {
        en: 'Styles',
        zh_HANS: '样式',
        zh_HANT: '樣式',
        ja: 'スタイル',
        ko: '스타일',
        fr: 'Styles',
      });
    case 'docs':
      return pickLocaleText(locale, {
        en: 'Docs',
        zh_HANS: '说明',
        zh_HANT: '說明',
        ja: 'ドキュメント',
        ko: '문서',
        fr: 'Docs',
      });
    case 'tests':
      return pickLocaleText(locale, {
        en: 'Tests',
        zh_HANS: '测试',
        zh_HANT: '測試',
        ja: 'テスト',
        ko: '테스트',
        fr: 'Tests',
      });
    case 'sidecars':
      return pickLocaleText(locale, {
        en: 'Sidecars',
        zh_HANS: '侧车文件',
        zh_HANT: '側車檔案',
        ja: 'サイドカー',
        ko: '사이드카',
        fr: 'Fichiers annexes',
      });
  }
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

  if (target === 'advanced') {
    return pickLocaleText(locale, {
      en: 'Public page source workspace',
      zh_HANS: '公开页面源稿工作面',
      zh_HANT: '公開頁面源稿工作面',
      ja: '公開ページのソース作業面',
      ko: '공개 페이지 소스 작업면',
      fr: 'Espace source de la page publique',
    });
  }

  return componentType.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function getAdvancedModeLabel(locale: string, mode: AdvancedPageMode) {
  switch (mode) {
    case 'custom-html':
      return pickLocaleText(locale, {
        en: 'Custom HTML',
        zh_HANS: '自定义 HTML',
        zh_HANT: '自訂 HTML',
        ja: 'カスタム HTML',
        ko: '커스텀 HTML',
        fr: 'HTML personnalisé',
      });
    case 'registry-snippets':
      return pickLocaleText(locale, {
        en: 'Registry snippets',
        zh_HANS: '注册片段',
        zh_HANT: '註冊片段',
        ja: '登録スニペット',
        ko: '레지스트리 스니펫',
        fr: 'Snippets registry',
      });
    default:
      return pickLocaleText(locale, {
        en: 'Page source',
        zh_HANS: '页面源稿',
        zh_HANT: '頁面源稿',
        ja: 'ページソース',
        ko: '페이지 소스',
        fr: 'Source de page',
      });
  }
}

function getAdvancedModeDescription(locale: string, mode: AdvancedPageMode) {
  switch (mode) {
    case 'custom-html':
      return pickLocaleText(locale, {
        en: 'Compose a source-owned fan page with safe HTML and CSS only.',
        zh_HANS: '用安全 HTML 与 CSS 编排 source-owned 粉丝页。',
        zh_HANT: '用安全 HTML 與 CSS 編排 source-owned 粉絲頁。',
        ja: '安全な HTML と CSS だけで source-owned のファンページを組み立てます。',
        ko: '안전한 HTML과 CSS만으로 source-owned 팬 페이지를 구성합니다.',
        fr: 'Composez une page fan source-owned avec uniquement du HTML et du CSS sûrs.',
      });
    case 'registry-snippets':
      return pickLocaleText(locale, {
        en: 'Assemble approved template slots and registered homepage blocks.',
        zh_HANS: '组合已批准的模板槽位与已注册主页模块。',
        zh_HANT: '組合已批准的模板槽位與已註冊主頁模組。',
        ja: '承認済みテンプレートのスロットと登録済みホームページブロックを組み合わせます。',
        ko: '승인된 템플릿 슬롯과 등록된 홈페이지 블록을 조합합니다.',
        fr: 'Assemblez des slots de template approuvés et des blocs de homepage enregistrés.',
      });
    default:
      return pickLocaleText(locale, {
        en: 'Repair the structured page document when Visual Studio needs schema-level help.',
        zh_HANS: '当可视化工作台需要结构级修复时，在这里处理页面源稿。',
        zh_HANT: '當視覺工作台需要結構級修復時，在這裡處理頁面源稿。',
        ja: 'Visual Studio だけでは直せない構造レベルの調整をここで行います。',
        ko: '비주얼 스튜디오만으로 어려운 구조 수준 수정을 여기서 진행합니다.',
        fr: 'Réparez ici le document structuré quand le studio visuel a besoin d’une aide au niveau schéma.',
      });
  }
}

function getPreviewSurfaceLabel(
  locale: string,
  target: AuthoringTarget,
  mode: AdvancedPageMode,
) {
  if (target !== 'advanced') {
    return pickLocaleText(locale, {
      en: 'Live preview',
      zh_HANS: '实时预览',
      zh_HANT: '即時預覽',
      ja: 'ライブプレビュー',
      ko: '라이브 프리뷰',
      fr: 'Aperçu live',
    });
  }

  switch (mode) {
    case 'custom-html':
      return pickLocaleText(locale, {
        en: 'Safe custom page preview',
        zh_HANS: '安全自定义页面预览',
        zh_HANT: '安全自訂頁面預覽',
        ja: '安全なカスタムページプレビュー',
        ko: '안전한 커스텀 페이지 미리보기',
        fr: 'Aperçu de page personnalisée sûre',
      });
    case 'registry-snippets':
      return pickLocaleText(locale, {
        en: 'Approved snippet preview',
        zh_HANS: '已批准片段预览',
        zh_HANT: '已批准片段預覽',
        ja: '承認済みスニペットのプレビュー',
        ko: '승인된 스니펫 미리보기',
        fr: 'Aperçu des snippets approuvés',
      });
    default:
      return pickLocaleText(locale, {
        en: 'Structured page preview',
        zh_HANS: '结构化页面预览',
        zh_HANT: '結構化頁面預覽',
        ja: '構造化ページプレビュー',
        ko: '구조화된 페이지 미리보기',
        fr: 'Aperçu de page structurée',
      });
  }
}

function readVirtualFileContents(files: VirtualFile[], path: string) {
  return files.find((file) => file.path === path)?.contents ?? '';
}

function buildCustomHtmlSrcDoc(html: string, css: string) {
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>html,body{margin:0;padding:0;background:#fff;color:#111827;font-family:ui-sans-serif,system-ui,sans-serif;}a{color:#e11d48;}${css}</style></head><body>${html}</body></html>`;
}

function buildCustomHtmlPreviewState(
  html: string,
  css: string,
  locale: string,
): CustomHtmlPreviewState {
  const issues: string[] = [];
  const loweredHtml = html.toLowerCase();
  const blockedPattern = PUBLIC_PRESENCE_SAFETY_POLICY.htmlRules.forbiddenPatterns.find((pattern) =>
    loweredHtml.includes(pattern),
  );

  if (CUSTOM_HTML_URL_BYPASS_PATTERN.test(html)) {
    issues.push(
      pickLocaleText(locale, {
        en: 'Remove protocol-relative, credential, or encoded-host links before preview.',
        zh_HANS: '请先移除协议相对、带凭据或编码主机的链接。',
        zh_HANT: '請先移除協定相對、帶憑證或編碼主機的連結。',
        ja: 'プレビュー前に、プロトコル相対・認証情報付き・エンコード回避のリンクを削除してください。',
        ko: '미리보기 전에 프로토콜 상대, 자격 증명 포함, 인코딩 우회 링크를 제거하세요.',
        fr: 'Supprimez les liens relatifs au protocole, avec identifiants ou hôtes encodés avant l’aperçu.',
      }),
    );
  }

  if (blockedPattern) {
    issues.push(
      pickLocaleText(locale, {
        en: `Blocked source pattern: ${blockedPattern}`,
        zh_HANS: `检测到被阻止的源码片段：${blockedPattern}`,
        zh_HANT: `偵測到被阻止的原始碼片段：${blockedPattern}`,
        ja: `ブロック対象のソース断片を検出しました: ${blockedPattern}`,
        ko: `차단된 소스 패턴을 감지했습니다: ${blockedPattern}`,
        fr: `Motif source bloqué détecté : ${blockedPattern}`,
      }),
    );
  }

  if (CUSTOM_HTML_CSS_ASSET_PATTERN.test(css)) {
    issues.push(
      pickLocaleText(locale, {
        en: 'Keep CSS local to this page. External imports and remote asset URLs are blocked.',
        zh_HANS: '请让 CSS 只服务当前页面；外部导入与远程资源地址会被阻止。',
        zh_HANT: '請讓 CSS 只服務目前頁面；外部匯入與遠端資源網址會被阻止。',
        ja: 'CSS はこのページ内に留めてください。外部 import とリモート資産 URL はブロックされます。',
        ko: 'CSS는 이 페이지 안에서만 사용하세요. 외부 import와 원격 자산 URL은 차단됩니다.',
        fr: 'Gardez le CSS local à cette page. Les imports externes et URLs d’assets distants sont bloqués.',
      }),
    );
  }

  let excerpt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  let sanitizedHtml = html;

  if (typeof DOMParser !== 'undefined') {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const blockedNodes = document.querySelectorAll('script, iframe, object, embed, link, meta[http-equiv], audio, video, source');

    if (blockedNodes.length > 0) {
      issues.push(
        pickLocaleText(locale, {
          en: 'Only static fan-page markup is allowed here. Move embeds and executable media into approved registry components.',
          zh_HANS: '这里只允许静态粉丝页标记；嵌入内容和可执行媒体请移到已批准的注册组件中。',
          zh_HANT: '這裡只允許靜態粉絲頁標記；嵌入內容與可執行媒體請移到已批准的註冊元件中。',
          ja: 'ここで使えるのは静的なファンページ用マークアップのみです。埋め込みや実行可能メディアは承認済みコンポーネントへ移してください。',
          ko: '여기서는 정적인 팬 페이지 마크업만 사용할 수 있습니다. 임베드와 실행 가능한 미디어는 승인된 컴포넌트로 옮기세요.',
          fr: 'Seul un balisage statique de fan page est autorisé ici. Déplacez embeds et médias exécutables vers des composants approuvés.',
        }),
      );
      blockedNodes.forEach((node) => node.remove());
    }

    document.querySelectorAll('*').forEach((element) => {
      [...element.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();

        if (name.startsWith('on') || name === 'style') {
          issues.push(
            pickLocaleText(locale, {
              en: 'Inline event handlers and inline styles are not allowed in this mode.',
              zh_HANS: '这个模式不允许内联事件处理器或内联样式。',
              zh_HANT: '這個模式不允許內聯事件處理器或內聯樣式。',
              ja: 'このモードではインラインイベント属性やインライン style は使えません。',
              ko: '이 모드에서는 인라인 이벤트 핸들러와 인라인 스타일을 사용할 수 없습니다.',
              fr: 'Les gestionnaires d’événement inline et styles inline sont interdits dans ce mode.',
            }),
          );
          element.removeAttribute(attribute.name);
          return;
        }

        if (name === 'src' || name === 'srcset') {
          if (value && CUSTOM_HTML_EXTERNAL_ASSET_PATTERN.test(value) && !value.startsWith('/')) {
            issues.push(
              pickLocaleText(locale, {
                en: 'Remote media assets are blocked here. Use approved managed assets or registry media blocks instead.',
                zh_HANS: '这里会阻止远程媒体资源；请改用已批准的托管资源或注册媒体模块。',
                zh_HANT: '這裡會阻止遠端媒體資源；請改用已批准的託管資源或註冊媒體模組。',
                ja: 'このモードではリモートのメディア資産を使えません。承認済みの管理資産か登録済みメディアブロックを利用してください。',
                ko: '이 모드에서는 원격 미디어 자산을 사용할 수 없습니다. 승인된 관리 자산이나 등록된 미디어 블록을 사용하세요.',
                fr: 'Les médias distants sont bloqués ici. Utilisez des assets gérés approuvés ou des blocs média enregistrés.',
              }),
            );
            element.removeAttribute(attribute.name);
          }
          return;
        }

        if (name === 'href' && CUSTOM_HTML_URL_BYPASS_PATTERN.test(`${name}="${value}"`)) {
          element.removeAttribute(attribute.name);
        }
      });
    });

    excerpt = document.body.textContent?.replace(/\s+/g, ' ').trim() ?? excerpt;
    sanitizedHtml = document.body.innerHTML;
  }

  return {
    excerpt,
    issues: [...new Set(issues)],
    srcDoc: buildCustomHtmlSrcDoc(sanitizedHtml, css),
  };
}

function buildAdvancedPreviewProjection(
  mode: AdvancedPageMode,
  templateId: PublicPresenceTemplateId,
  locale: string,
  files: VirtualFile[],
): PublicPresencePublicProjection {
  const baseProjection = buildTemplatePreviewProjection(templateId, locale);

  if (mode === 'page-source') {
    const sourceContents = readVirtualFileContents(files, 'src/page-source.json');

    try {
      const parsed = JSON.parse(sourceContents) as {
        metadata?: { title?: string };
        sections?: Array<{ kind?: string }>;
      };
      const sectionKinds = (parsed.sections ?? [])
        .map((section) => section.kind)
        .filter((kind): kind is string => Boolean(kind));

      return {
        ...baseProjection,
        metadata: {
          ...baseProjection.metadata,
          title: parsed.metadata?.title || baseProjection.metadata.title,
          description: pickLocaleText(locale, {
            en: `Structured page source with ${sectionKinds.length} planned sections.`,
            zh_HANS: `结构化页面源稿当前规划了 ${sectionKinds.length} 个分区。`,
            zh_HANT: `結構化頁面源稿目前規劃了 ${sectionKinds.length} 個分區。`,
            ja: `構造化ページソースには現在 ${sectionKinds.length} 個のセクションが計画されています。`,
            ko: `구조화된 페이지 소스에는 현재 ${sectionKinds.length}개의 섹션이 계획되어 있습니다.`,
            fr: `La source de page structurée prévoit actuellement ${sectionKinds.length} sections.`,
          }),
        },
      };
    } catch {
      return baseProjection;
    }
  }

  if (mode === 'registry-snippets') {
    const snippetContents = readVirtualFileContents(files, 'src/snippets.tsx');
    const inserted = [...snippetContents.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);

    return {
      ...baseProjection,
      metadata: {
        ...baseProjection.metadata,
        title: pickLocaleText(locale, {
          en: 'Approved homepage snippets',
          zh_HANS: '已批准主页片段',
          zh_HANT: '已批准主頁片段',
          ja: '承認済みホームページスニペット',
          ko: '승인된 홈페이지 스니펫',
          fr: 'Snippets homepage approuvés',
        }),
        description: pickLocaleText(locale, {
          en: 'Preview how approved template slots and registered blocks combine before review.',
          zh_HANS: '先预览已批准模板槽位与注册模块的组合效果，再进入审核。',
          zh_HANT: '先預覽已批准模板槽位與註冊模組的組合效果，再進入審核。',
          ja: '承認済みスロットと登録済みブロックの組み合わせを、レビュー前にここで確認します。',
          ko: '승인된 슬롯과 등록된 블록의 조합을 검토 전에 여기서 확인합니다.',
          fr: 'Prévisualisez ici la combinaison des slots approuvés et blocs enregistrés avant revue.',
        }),
      },
    };
  }

  return baseProjection;
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
  advancedMode,
  componentType,
  target,
  talentId,
  templateId,
  tenantId,
}: Readonly<{
  advancedMode?: AdvancedPageMode | null;
  componentType?: string | null;
  target: AuthoringTarget;
  talentId: string;
  templateId?: string | null;
  tenantId: string;
}>) {
  const { locale } = useUiLocale();
  const { request } = useSession();
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [fixtureMode, setFixtureMode] = useState<FixtureMode>('default');
  const [previewPhase, setPreviewPhase] = useState<PublicPresencePhaseVisibility>('always');
  const [mobileSurface, setMobileSurface] = useState<MobileAuthoringSurface>('editor');
  const [mobileOverlay, setMobileOverlay] = useState<MobileIdeOverlay>(null);
  const [desktopUtilityPanel, setDesktopUtilityPanel] = useState<'files' | 'checks' | null>(null);
  const mobileActionsSheetId = useId();
  const mobilePreviewOptionsSheetId = useId();
  const fileDrawerId = useId();
  const validationDrawerId = useId();
  const effectiveTemplateId = (templateId ?? 'activeTalentHub') as PublicPresenceTemplateId;
  const effectiveComponentType = (componentType ?? 'SocialLinks') as HomepageComponentType;
  const effectiveAdvancedMode = advancedMode ?? 'page-source';
  const [selectedAdvancedMode, setSelectedAdvancedMode] = useState<AdvancedPageMode>(
    effectiveAdvancedMode,
  );
  const initialFiles = useMemo(
    () =>
      target === 'template'
        ? buildTemplateFiles(effectiveTemplateId, locale)
        : target === 'component'
          ? buildComponentFiles(effectiveComponentType, locale)
          : buildAdvancedFiles(selectedAdvancedMode, effectiveTemplateId, locale),
    [effectiveComponentType, effectiveTemplateId, locale, selectedAdvancedMode, target],
  );
  const [files, setFiles] = useState<VirtualFile[]>(initialFiles);
  const [activePath, setActivePath] = useState(initialFiles[0]?.path ?? '');
  const [editorDirty, setEditorDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);
  const [authoringAction, setAuthoringAction] = useState<'idle' | 'save' | 'submit' | 'validate'>('idle');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'ready'>('idle');
  const [isWideDesktop, setIsWideDesktop] = useState(false);
  const [hydratedAuthoringKey, setHydratedAuthoringKey] = useState<string | null>(
    target === 'advanced' ? 'advanced' : null,
  );
  const activePathRef = useRef(activePath);
  const filesRef = useRef(files);
  const editorDirtyRef = useRef(editorDirty);
  const workbenchShellRef = useRef<HTMLDivElement | null>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const mobileActionsSheetPanelRef = useRef<HTMLDivElement | null>(null);
  const mobileUtilitySheetPanelRef = useRef<HTMLDivElement | null>(null);
  const monacoEditorRef = useRef<MonacoEditorLike | null>(null);
  const monacoModelListenerRef = useRef<MonacoDisposableLike | null>(null);
  const skipNextInitialFilesResetRef = useRef(false);
  const syncEditorContentsRef = useRef<(path: string | undefined, value: string | undefined) => void>(
    () => undefined,
  );
  const mobileActionsOpen = mobileOverlay === 'actions';
  const activeMobileUtilityOverlay = mobileOverlay === 'previewOptions'
    || mobileOverlay === 'files'
    || mobileOverlay === 'checks'
    ? mobileOverlay
    : null;
  const mobilePreviewOptionsOpen = activeMobileUtilityOverlay === 'previewOptions';
  const mobileActionsOverlay = useOverlayFocusManager({
    onClose: () => setMobileOverlay((current) => (current === 'actions' ? null : current)),
    open: mobileActionsOpen,
  });
  const mobileUtilityOverlay = useOverlayFocusManager({
    onClose: () =>
      setMobileOverlay((current) =>
        current === 'previewOptions' || current === 'files' || current === 'checks'
          ? null
          : current,
      ),
    open: activeMobileUtilityOverlay !== null,
  });
  const filesDrawerOverlay = useOverlayFocusManager({
    onClose: () => setDesktopUtilityPanel(null),
    open: desktopUtilityPanel === 'files',
  });
  const validationDrawerOverlay = useOverlayFocusManager({
    onClose: () => setDesktopUtilityPanel(null),
    open: desktopUtilityPanel === 'checks',
  });

  const advancedModeOptions: AdvancedPageMode[] = ['page-source', 'custom-html', 'registry-snippets'];
  const authoringSubjectKey = target === 'template'
    ? templateId?.trim() || 'new'
    : target === 'component'
      ? componentType?.trim() || 'new'
      : null;
  const authoringDraftKey = target === 'advanced'
    ? 'advanced'
    : `${target}:${authoringSubjectKey ?? 'new'}`;

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
        : target === 'component'
          ? buildComponentPreviewProjection(effectiveComponentType, locale)
          : buildAdvancedPreviewProjection(
              selectedAdvancedMode,
              effectiveTemplateId,
              locale,
              files,
            ),
    [effectiveComponentType, effectiveTemplateId, files, locale, selectedAdvancedMode, target],
  );
  const customHtmlPreviewState = useMemo(
    () => {
      if (target !== 'advanced' || selectedAdvancedMode !== 'custom-html') {
        return null;
      }

      const html = readVirtualFileContents(files, 'src/index.html');
      const css = readVirtualFileContents(files, 'src/styles.css');
      return buildCustomHtmlPreviewState(html, css, locale);
    },
    [files, locale, selectedAdvancedMode, target],
  );
  const validationItems = useMemo(
    () => buildValidationItems(locale, target, fixtureMode, viewport, previewPhase),
    [fixtureMode, locale, previewPhase, target, viewport],
  );

  filesRef.current = files;
  activePathRef.current = activePath;
  editorDirtyRef.current = editorDirty;
  syncEditorContentsRef.current = (path, value) => {
    if (!path) {
      return;
    }

    const nextContents = value ?? '';
    const currentFile = filesRef.current.find((file) => file.path === path);

    if (!currentFile || currentFile.contents === nextContents) {
      return;
    }

    startTransition(() => {
      setFiles((current) =>
        current.map((file) =>
          file.path === path
            ? { ...file, contents: nextContents }
            : file,
        ),
      );
    });
    setEditorDirty(true);
    setSubmitStatus('idle');
  };

  const syncMonacoModelContents = (fallbackValue?: string) => {
    const modelValue = monacoEditorRef.current?.getModel()?.getValue();

    syncEditorContentsRef.current(
      activePathRef.current,
      modelValue ?? fallbackValue,
    );
  };

  const registerMonacoModelListener = (editor: MonacoEditorLike | null) => {
    monacoModelListenerRef.current?.dispose();
    monacoModelListenerRef.current = null;

    if (!editor) {
      return;
    }

    if (editor.onDidChangeModelContent) {
      monacoModelListenerRef.current = editor.onDidChangeModelContent(() => {
        const model = editor.getModel();

        if (!model) {
          return;
        }

        syncEditorContentsRef.current(
          activePathRef.current,
          model.getValue(),
        );
      });
      return;
    }

    const model = editor.getModel();

    monacoModelListenerRef.current = model?.onDidChangeContent(() => {
      syncEditorContentsRef.current(
        activePathRef.current,
        model.getValue(),
      );
    }) ?? null;
  };

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
    if (skipNextInitialFilesResetRef.current) {
      skipNextInitialFilesResetRef.current = false;
      return;
    }

    if (target !== 'advanced' && hydratedAuthoringKey === authoringDraftKey) {
      return;
    }

    setFiles(initialFiles);
    setActivePath(initialFiles[0]?.path ?? '');
    setEditorDirty(false);
    setLastSavedAt(null);
    setLastValidatedAt(null);
    setSubmitStatus('idle');
  }, [authoringDraftKey, hydratedAuthoringKey, initialFiles, target]);

  useEffect(() => {
    if (target === 'advanced') {
      setHydratedAuthoringKey('advanced');
      return;
    }

    if (!authoringSubjectKey) {
      return;
    }

    let cancelled = false;

    void readPublicPresenceAuthoringDraft(
      request,
      talentId,
      target,
      authoringSubjectKey,
    )
      .then((draft) => {
        if (cancelled) {
          return;
        }

        if (!draft || editorDirtyRef.current) {
          return;
        }

        setHydratedAuthoringKey(authoringDraftKey);
        const nextFiles = normalizeAuthoringFiles(draft, initialFiles);
        setFiles(nextFiles);
        setActivePath((current) =>
          nextFiles.some((file) => file.path === current)
            ? current
            : (nextFiles[0]?.path ?? ''),
        );
        setEditorDirty(false);
        setLastSavedAt(draft?.lastSavedAt ?? null);
        setLastValidatedAt(draft?.lastValidatedAt ?? null);
        setSubmitStatus(
          draft?.artifactStatus === 'validated' || draft?.artifactStatus === 'submitted'
            ? 'ready'
            : 'idle',
        );
      })
      .catch(() => {
        return;
      });

    return () => {
      cancelled = true;
    };
  }, [authoringDraftKey, authoringSubjectKey, initialFiles, request, talentId, target]);

  useEffect(() => () => {
    monacoModelListenerRef.current?.dispose();
    monacoModelListenerRef.current = null;
  }, []);

  const mobileModalOpen = !isWideDesktop && mobileOverlay !== null;

  useEffect(() => {
    const workbench = workbenchShellRef.current;

    if (!workbench) {
      return;
    }

    const scopedElements = Array.from(
      workbench.querySelectorAll<HTMLElement>('[data-overlay-scope="true"]'),
    );

    if (!mobileModalOpen) {
      scopedElements.forEach((element) => {
        element.removeAttribute('aria-hidden');
        element.removeAttribute('data-overlay-inert');
        element.removeAttribute('inert');
      });
      return;
    }

    scopedElements.forEach((element) => {
      element.setAttribute('aria-hidden', 'true');
      element.setAttribute('data-overlay-inert', 'true');
      element.setAttribute('inert', '');
    });

    return () => {
      scopedElements.forEach((element) => {
        element.removeAttribute('aria-hidden');
        element.removeAttribute('data-overlay-inert');
        element.removeAttribute('inert');
      });
    };
  }, [mobileModalOpen]);

  useEffect(() => {
    if (!mobileModalOpen) {
      return;
    }

    const panel = mobileOverlay === 'actions'
      ? mobileActionsSheetPanelRef.current
      : mobileUtilitySheetPanelRef.current;

    if (!panel) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(panel);

      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

      if (!activeElement || !panel.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileModalOpen, mobileOverlay]);

  useEffect(() => {
    const editor = monacoEditorRef.current;

    if (!editor || typeof window === 'undefined') {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      registerMonacoModelListener(editor);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeFile?.path]);

  useEffect(() => {
    const host = editorHostRef.current;

    if (!host || typeof window === 'undefined') {
      return undefined;
    }

    let animationFrame: number | null = null;

    const scheduleModelSync = (fallbackValue?: string) => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        syncMonacoModelContents(fallbackValue);
      });
    };

    const handleEditorEvent = (event: Event) => {
      if (event.target instanceof HTMLTextAreaElement) {
        scheduleModelSync(event.target.value);
        return;
      }

      scheduleModelSync();
    };

    const events: Array<keyof HTMLElementEventMap> = [
      'beforeinput',
      'input',
      'keyup',
      'paste',
      'cut',
      'compositionend',
    ];

    events.forEach((eventName) => {
      host.addEventListener(eventName, handleEditorEvent, true);
    });

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      events.forEach((eventName) => {
        host.removeEventListener(eventName, handleEditorEvent, true);
      });
    };
  }, [activeFile?.path]);

  const buildAuthoringSourceBundle = (): PublicPresenceAuthoringFile[] => {
    const activeEditorContents = monacoEditorRef.current?.getModel()?.getValue();

    return filesRef.current.map((file) => ({
      contents:
        file.path === activePathRef.current && activeEditorContents !== undefined
          ? activeEditorContents
          : file.contents,
      kind: file.kind,
      language: file.language,
      path: file.path,
    }));
  };

  const applyPersistedAuthoringDraft = (
    result: PublicPresenceAuthoringDraftResponse,
    nextSubmitStatus: 'idle' | 'ready',
  ) => {
    const nextFiles = normalizeAuthoringFiles(result, initialFiles);
    setFiles(nextFiles);
    setActivePath((current) =>
      nextFiles.some((file) => file.path === current)
        ? current
        : (nextFiles[0]?.path ?? '')
    );
    setEditorDirty(false);
    setLastSavedAt(result.lastSavedAt);
    setLastValidatedAt(result.lastValidatedAt);
    setSubmitStatus(nextSubmitStatus);
  };

  const exitHref =
    target === 'template'
      ? buildPublicPresenceHomepageSurfacePath(tenantId, talentId, 'templates')
      : target === 'component'
        ? buildPublicPresenceHomepageSurfacePath(tenantId, talentId, 'components')
        : buildPublicPresenceStudioEditorPath(tenantId, talentId, effectiveTemplateId);
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
      : target === 'component'
        ? buildPublicPresenceComponentAuthoringPath(
            tenantId,
            talentId,
            effectiveComponentType,
          )
        : undefined;
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
  const groupedFiles = useMemo(
    () =>
      (['source', 'styles', 'docs', 'tests', 'sidecars'] as const)
        .map((groupId) => ({
          files: files.filter((file) => resolveVirtualFileGroupId(file) === groupId),
          groupId,
        }))
        .filter((group) => group.files.length > 0),
    [files],
  );
  const showDesktopUtilityPanel = isWideDesktop && desktopUtilityPanel !== null;
  const ideGridClass = showDesktopUtilityPanel
    ? 'xl:grid-cols-[3.5rem_minmax(16rem,18rem)_minmax(0,0.88fr)_minmax(30rem,1.12fr)] 2xl:grid-cols-[3.5rem_minmax(18rem,20rem)_minmax(0,0.92fr)_minmax(34rem,1.08fr)]'
    : 'xl:grid-cols-[3.5rem_minmax(0,0.95fr)_minmax(34rem,1.05fr)] 2xl:grid-cols-[3.5rem_minmax(0,1.05fr)_minmax(38rem,1fr)]';

  const handleSaveDraft = async () => {
    if (target === 'advanced' || !authoringSubjectKey) {
      setLastSavedAt(new Date().toISOString());
      setEditorDirty(false);
      setSubmitStatus('idle');
      return;
    }

    setAuthoringAction('save');

    try {
      const result = await savePublicPresenceAuthoringDraft(
        request,
        talentId,
        target,
        {
          sourceBundle: buildAuthoringSourceBundle(),
          subjectKey: authoringSubjectKey,
        },
      );
      applyPersistedAuthoringDraft(result, 'idle');
    } catch {
      return;
    } finally {
      setAuthoringAction('idle');
    }
  };

  const openValidationSurface = () => {
    if (isWideDesktop) {
      setDesktopUtilityPanel('checks');
      return;
    }

    setMobileOverlay('checks');
  };

  const handleValidate = async () => {
    if (target === 'advanced' || !authoringSubjectKey) {
      setLastValidatedAt(new Date().toISOString());
      openValidationSurface();
      setSubmitStatus('idle');
      return;
    }

    setAuthoringAction('validate');

    try {
      const result = await validatePublicPresenceAuthoringDraft(
        request,
        talentId,
        target,
        {
          sourceBundle: buildAuthoringSourceBundle(),
          subjectKey: authoringSubjectKey,
          validationSummary: buildAuthoringValidationSummary(validationItems),
        },
      );
      applyPersistedAuthoringDraft(result, 'ready');
      openValidationSurface();
    } catch {
      return;
    } finally {
      setAuthoringAction('idle');
    }
  };

  const handleSubmit = async () => {
    if (!lastValidatedAt || editorDirty) {
      openValidationSurface();
      return;
    }

    if (target === 'advanced' || !authoringSubjectKey) {
      setSubmitStatus('ready');
      return;
    }

    setAuthoringAction('submit');

    try {
      const result = await submitPublicPresenceAuthoringDraft(
        request,
        talentId,
        target,
        {
          sourceBundle: buildAuthoringSourceBundle(),
          subjectKey: authoringSubjectKey,
          validationSummary: buildAuthoringValidationSummary(validationItems),
        },
      );
      applyPersistedAuthoringDraft(result, 'ready');
      setSubmitStatus('ready');
    } catch {
      return;
    } finally {
      setAuthoringAction('idle');
    }
  };

  const mobileUtilitySheetId = activeMobileUtilityOverlay === 'files'
    ? fileDrawerId
    : activeMobileUtilityOverlay === 'checks'
      ? validationDrawerId
      : mobilePreviewOptionsSheetId;
  const mobileUtilitySheetLabel = activeMobileUtilityOverlay === 'files'
    ? pickLocaleText(locale, {
        en: 'Files sheet',
        zh_HANS: '文件抽屉',
        zh_HANT: '檔案抽屜',
        ja: 'ファイルシート',
        ko: '파일 시트',
        fr: 'Feuille fichiers',
      })
    : activeMobileUtilityOverlay === 'checks'
      ? pickLocaleText(locale, {
          en: 'Validation checks sheet',
          zh_HANS: '校验检查抽屉',
          zh_HANT: '驗證檢查抽屜',
          ja: '検証チェックシート',
          ko: '검증 점검 시트',
          fr: 'Feuille contrôles',
        })
      : pickLocaleText(locale, {
          en: 'Preview options sheet',
          zh_HANS: '预览选项抽屉',
          zh_HANT: '預覽選項抽屜',
          ja: 'プレビュー設定シート',
          ko: '미리보기 옵션 시트',
          fr: 'Feuille options aperçu',
        });
  const mobileUtilitySheetTestId = activeMobileUtilityOverlay === 'files'
    ? 'ide-file-drawer'
    : activeMobileUtilityOverlay === 'checks'
      ? 'ide-validation-drawer'
      : 'ide-mobile-preview-options-sheet';

  const ideBadgeLabel = pickLocaleText(locale, {
    en: target === 'template' ? 'Template IDE' : target === 'component' ? 'Component IDE' : 'Advanced IDE',
    zh_HANS: target === 'template' ? '模板 IDE' : target === 'component' ? '组件 IDE' : '高级 IDE',
    zh_HANT: target === 'template' ? '模板 IDE' : target === 'component' ? '元件 IDE' : '進階 IDE',
    ja: target === 'template' ? 'テンプレート IDE' : target === 'component' ? 'コンポーネント IDE' : '詳細 IDE',
    ko: target === 'template' ? '템플릿 IDE' : target === 'component' ? '컴포넌트 IDE' : '고급 IDE',
    fr: target === 'template' ? 'IDE Template' : target === 'component' ? 'IDE Composant' : 'IDE avancé',
  });
  const title = authoringSubjectLabel;
  const previewSurfaceLabel = getPreviewSurfaceLabel(locale, target, selectedAdvancedMode);
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
          : target === 'component'
            ? getHomepageSurfaceActionLabel(locale, 'createComponent')
            : pickLocaleText(locale, {
                en: 'Open Studio',
                zh_HANS: '打开工作台',
                zh_HANT: '打開工作台',
                ja: 'Studio を開く',
                ko: 'Studio 열기',
                fr: 'Ouvrir le studio',
              }),
      icon: <Code2 className="h-4 w-4" aria-hidden="true" />,
      href: retryAuthoringHref ?? exitHref,
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
      <div className="space-y-2" data-testid="ide-workbench" data-workbench-shell="true" ref={workbenchShellRef}>
        <PublicPresenceSurface
          className="sticky top-2 z-20 px-3 py-2 sm:px-3 sm:py-2 lg:px-3 lg:py-2 shadow-sm backdrop-blur"
          data-overlay-scope="true"
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
                  setMobileOverlay((current) => (current === 'actions' ? null : 'actions'));
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
                  setMobileOverlay(null);
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
                onClick={() => {
                  setMobileSurface('preview');
                  setMobileOverlay(null);
                }}
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
            {target === 'advanced' ? (
              <PublicPresenceBadge tone="slate" variant="outline">
                    {getAdvancedModeLabel(locale, selectedAdvancedMode)}
              </PublicPresenceBadge>
            ) : null}
            <span className="h-5 w-px shrink-0 bg-slate-200" aria-hidden="true" />
            {authoringActions.map((action) =>
              action.kind === 'button' ? (
                <button
                  key={action.key}
                  type="button"
                  disabled={
                    authoringAction !== 'idle'
                    || (action.key === 'save'
                      ? !editorDirty
                      : action.key === 'submit'
                        ? editorDirty || !lastValidatedAt
                        : false)
                  }
                  onClick={() => {
                    if (action.key === 'save') {
                      void handleSaveDraft();
                    } else if (action.key === 'validate') {
                      void handleValidate();
                    } else if (action.key === 'submit') {
                      void handleSubmit();
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
            <div ref={mobileActionsSheetPanelRef} tabIndex={-1}>
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
                onClick={() => setMobileOverlay(null)}
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
                      authoringAction !== 'idle'
                      || (action.key === 'save'
                        ? !editorDirty
                        : action.key === 'submit'
                          ? editorDirty || !lastValidatedAt
                          : false)
                    }
                    onClick={() => {
                      if (action.key === 'save') {
                        void handleSaveDraft();
                      } else if (action.key === 'validate') {
                        void handleValidate();
                      } else if (action.key === 'submit') {
                        void handleSubmit();
                      }

                      setMobileOverlay((current) => (current === 'actions' ? null : current));
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
            </div>
          </PublicPresenceSurface>
        ) : null}

        <div className={`relative grid min-h-[calc(100vh-4.75rem)] gap-2 ${ideGridClass}`}>
          <PublicPresenceSurface
            className="!fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-row items-center gap-2 rounded-full border border-slate-200/90 bg-white/97 px-2 py-2 shadow-lg backdrop-blur md:!static md:bottom-auto md:left-auto md:z-auto md:h-full md:translate-x-0 md:flex-col md:rounded-[2rem] md:border-transparent md:bg-white md:px-1 md:py-2 md:shadow-none md:backdrop-blur-0"
            data-overlay-scope="true"
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
              const isActive = isWideDesktop
                ? desktopUtilityPanel === item.key
                : mobileOverlay === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  aria-controls={item.key === 'files' ? fileDrawerId : validationDrawerId}
                  aria-expanded={isActive}
                  aria-label={item.label}
                  aria-pressed={isActive}
                  ref={isActive
                    ? isWideDesktop
                      ? item.key === 'files'
                        ? filesDrawerOverlay.fallbackTriggerRef
                        : validationDrawerOverlay.fallbackTriggerRef
                      : mobileUtilityOverlay.fallbackTriggerRef
                    : undefined}
                  onClick={(event) => {
                    if (isWideDesktop) {
                      if (item.key === 'files') {
                        filesDrawerOverlay.registerTrigger(event.currentTarget);
                      } else {
                        validationDrawerOverlay.registerTrigger(event.currentTarget);
                      }

                      setDesktopUtilityPanel((current) =>
                        current === item.key ? null : item.key as 'files' | 'checks',
                      );
                      return;
                    }

                    mobileUtilityOverlay.registerTrigger(event.currentTarget);
                    setMobileOverlay((current) =>
                      current === item.key ? null : item.key as 'files' | 'checks',
                    );
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

          {showDesktopUtilityPanel && desktopUtilityPanel === 'files' ? (
            <div
              aria-label={pickLocaleText(locale, {
                en: 'Files panel',
                zh_HANS: '文件面板',
                zh_HANT: '檔案面板',
                ja: 'ファイルパネル',
                ko: '파일 패널',
                fr: 'Panneau fichiers',
              })}
              className="hidden min-h-0 overflow-hidden xl:block"
              data-overlay-scope="true"
              data-testid="ide-file-drawer"
              id={fileDrawerId}
              role="region"
            >
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4">
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
                        en: 'Browse the source bundle, sample content, and sidecars for this draft.',
                        zh_HANS: '在这里浏览当前草稿的源文件、样例内容和侧车文件。',
                        zh_HANT: '在這裡瀏覽目前草稿的源檔案、樣例內容與側車檔案。',
                        ja: 'このドラフトのソース、サンプル内容、サイドカーをここで確認します。',
                        ko: '이 초안의 소스, 샘플 콘텐츠, 사이드카 파일을 여기에서 살펴봅니다.',
                        fr: 'Parcourez ici les sources, le contenu d’exemple et les fichiers annexes de ce brouillon.',
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDesktopUtilityPanel(null)}
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
                <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
                  <div className="space-y-4">
                    {groupedFiles.map((group) => (
                      <div key={group.groupId} className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {getVirtualFileGroupLabel(locale, group.groupId)}
                        </p>
                        <div className="space-y-2">
                          {group.files.map((file) => (
                            <button
                              key={file.path}
                              type="button"
                              data-testid={`ide-file-${file.path}`}
                              onClick={() => {
                                setActivePath(file.path);
                                setDesktopUtilityPanel(null);
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
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {showDesktopUtilityPanel && desktopUtilityPanel === 'checks' ? (
            <div
              aria-label={pickLocaleText(locale, {
                en: 'Validation panel',
                zh_HANS: '校验面板',
                zh_HANT: '驗證面板',
                ja: '検証パネル',
                ko: '검증 패널',
                fr: 'Panneau validation',
              })}
              className="hidden min-h-0 overflow-hidden xl:block"
              data-overlay-scope="true"
              data-testid="ide-validation-drawer"
              id={validationDrawerId}
              role="region"
            >
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-950">
                      {pickLocaleText(locale, {
                        en: 'Validation',
                        zh_HANS: '校验',
                        zh_HANT: '驗證',
                        ja: '検証',
                        ko: '검증',
                        fr: 'Validation',
                      })}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {pickLocaleText(locale, {
                        en: 'Review save state, last validation time, and open checks for this draft.',
                        zh_HANS: '在这里查看当前草稿的保存状态、最近校验时间和待处理检查项。',
                        zh_HANT: '在這裡查看目前草稿的儲存狀態、最近驗證時間與待處理檢查項。',
                        ja: 'このドラフトの保存状態、直近の検証時刻、未解決チェックをここで確認します。',
                        ko: '이 초안의 저장 상태, 최근 검증 시각, 열린 확인 항목을 여기에서 검토합니다.',
                        fr: 'Vérifiez ici l’état d’enregistrement, la dernière validation et les contrôles ouverts de ce brouillon.',
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDesktopUtilityPanel(null)}
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
                <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
                  <div className="mb-4 grid gap-2" data-testid="ide-validation-status">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{saveStatusLabel}</p>
                      <p className="mt-1">{formattedSavedAt}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{validationStatusLabel}</p>
                      <p className="mt-1">{formattedValidatedAt}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {validationItems.map((item) => (
                      <div
                        key={`${item.level}-${item.message}`}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="flex items-start gap-3">
                          {item.level === 'pass' ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
                          ) : (
                            <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
                          )}
                          <p className="text-sm leading-6 text-slate-700">{item.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex h-full flex-col">
            <PublicPresenceSurface
              className={`relative h-full min-h-[calc(100vh-4.75rem)] flex-col border border-slate-200/80 bg-white/95 p-0 sm:p-0 lg:p-0 ${
                mobileSurface === 'editor' ? 'flex' : 'hidden'
              } xl:flex`}
              data-overlay-scope="true"
              data-testid="ide-editor-surface"
            >
              <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-start sm:inset-x-4">
                <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-2 overflow-x-auto whitespace-nowrap rounded-full border border-slate-200/90 bg-white/96 px-3 py-2 text-sm shadow-sm [scrollbar-width:none]">
                  <PublicPresenceBadge tone="rose">
                    {target === 'advanced'
                      ? getAdvancedModeLabel(locale, selectedAdvancedMode)
                      : pickLocaleText(locale, {
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
                  <PublicPresenceBadge className="hidden lg:inline-flex" tone="slate" variant="outline">
                    {getVirtualFileKindLabel(locale, activeFile?.kind ?? 'code')}
                  </PublicPresenceBadge>
                  {target === 'advanced' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {advancedModeOptions.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          aria-pressed={selectedAdvancedMode === mode}
                          onClick={() => {
                            if (mode === selectedAdvancedMode) {
                              return;
                            }

                            const nextFiles = buildAdvancedFiles(mode, effectiveTemplateId, locale);
                            const nextHref = buildPublicPresenceAdvancedIdePath(
                              tenantId,
                              talentId,
                              {
                                mode,
                                templateId: effectiveTemplateId,
                              },
                            );
                            skipNextInitialFilesResetRef.current = true;
                            window.history.replaceState({}, '', nextHref);
                            setSelectedAdvancedMode(mode);
                            setFiles(nextFiles);
                            setActivePath(nextFiles[0]?.path ?? '');
                            setEditorDirty(false);
                            setLastSavedAt(null);
                            setLastValidatedAt(null);
                            setSubmitStatus('idle');
                          }}
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            selectedAdvancedMode === mode
                              ? 'border-rose-300 bg-rose-50 text-rose-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {getAdvancedModeLabel(locale, mode)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="min-h-0 flex-1 px-3 pb-3 pt-14 sm:px-4 sm:pb-4 sm:pt-16">
                <div
                  data-testid="monaco-editor-host"
                  ref={editorHostRef}
                  onMouseDownCapture={() => {
                    monacoEditorRef.current?.focus?.();
                  }}
                  className="h-full overflow-hidden rounded-[1.75rem] border border-slate-200"
                >
                  <MonacoEditor
                    key={`${target}:${selectedAdvancedMode}:${activeFile?.path ?? 'none'}`}
                    defaultLanguage={activeFile?.language}
                    height="100%"
                    onMount={(editor) => {
                      monacoEditorRef.current = editor;
                      registerMonacoModelListener(editor);

                      const model = editor.getModel();

                      if (model) {
                        syncEditorContentsRef.current(activeFile?.path, model.getValue());
                      }
                    }}
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
                      syncEditorContentsRef.current(activeFile?.path, value);
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
            data-overlay-scope="true"
            data-testid="ide-preview-surface"
          >
            <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-start sm:inset-x-4">
              {!isWideDesktop ? (
                <div className="pointer-events-auto w-full rounded-[1.5rem] border border-slate-200/90 bg-white/96 px-3 py-2 text-sm shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <PublicPresenceBadge tone="rose">
                      {previewSurfaceLabel}
                    </PublicPresenceBadge>
                    <button
                      type="button"
                      data-testid="ide-mobile-preview-options-button"
                      aria-controls={mobilePreviewOptionsSheetId}
                      aria-expanded={mobilePreviewOptionsOpen}
                      aria-haspopup="dialog"
                      ref={mobileUtilityOverlay.fallbackTriggerRef}
                      onClick={(event) => {
                        mobileUtilityOverlay.registerTrigger(event.currentTarget);
                        setMobileOverlay((current) =>
                          current === 'previewOptions' ? null : 'previewOptions',
                        );
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
                  {previewSurfaceLabel}
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
                  {target === 'advanced' && selectedAdvancedMode === 'custom-html' ? (
                    <div className="space-y-4">
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <p className="font-semibold text-slate-950">
                          {pickLocaleText(locale, {
                            en: 'Custom HTML safety',
                            zh_HANS: '自定义 HTML 安全',
                            zh_HANT: '自訂 HTML 安全',
                            ja: 'カスタム HTML の安全性',
                            ko: '커스텀 HTML 안전성',
                            fr: 'Sécurité HTML personnalisée',
                          })}
                        </p>
                        <p className="mt-1">{customHtmlPreviewState?.issues.length ? customHtmlPreviewState.issues[0] : pickLocaleText(locale, {
                          en: 'Static HTML and CSS preview are ready.',
                          zh_HANS: '静态 HTML 与 CSS 预览已就绪。',
                          zh_HANT: '靜態 HTML 與 CSS 預覽已就緒。',
                          ja: '静的 HTML と CSS のプレビューが準備できました。',
                          ko: '정적 HTML 및 CSS 미리보기가 준비되었습니다.',
                          fr: 'L’aperçu HTML et CSS statique est prêt.',
                        })}</p>
                      </div>
                      <iframe
                        title={previewSurfaceLabel}
                        data-testid="ide-custom-html-preview"
                        srcDoc={customHtmlPreviewState?.srcDoc ?? buildCustomHtmlSrcDoc(
                          readVirtualFileContents(files, 'src/index.html'),
                          readVirtualFileContents(files, 'src/styles.css'),
                        )}
                        className="min-h-[34rem] w-full rounded-[1.5rem] border border-slate-200 bg-white"
                      />
                    </div>
                  ) : viewport === 'mobile' ? (
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

          {activeMobileUtilityOverlay ? (
            <PublicPresenceSurface
              aria-label={mobileUtilitySheetLabel}
              aria-modal
              className="!fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl xl:hidden"
              data-testid={mobileUtilitySheetTestId}
              id={mobileUtilitySheetId}
              role="dialog"
              variant="inset"
            >
              <div ref={mobileUtilitySheetPanelRef} tabIndex={-1}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-950">
                      {activeMobileUtilityOverlay === 'files'
                        ? pickLocaleText(locale, {
                            en: 'Files',
                            zh_HANS: '文件',
                            zh_HANT: '檔案',
                            ja: 'ファイル',
                            ko: '파일',
                            fr: 'Fichiers',
                          })
                        : activeMobileUtilityOverlay === 'checks'
                          ? pickLocaleText(locale, {
                              en: 'Validation checks',
                              zh_HANS: '校验检查',
                              zh_HANT: '驗證檢查',
                              ja: '検証チェック',
                              ko: '검증 점검',
                              fr: 'Contrôles',
                            })
                          : pickLocaleText(locale, {
                              en: 'Preview options',
                              zh_HANS: '预览选项',
                              zh_HANT: '預覽選項',
                              ja: 'プレビュー設定',
                              ko: '미리보기 옵션',
                              fr: 'Options aperçu',
                            })}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {activeMobileUtilityOverlay === 'files'
                        ? pickLocaleText(locale, {
                            en: 'Browse the source bundle, sample content, and sidecars for this draft.',
                            zh_HANS: '在这里浏览当前草稿的源文件、样例内容和侧车文件。',
                            zh_HANT: '在這裡瀏覽目前草稿的源檔案、樣例內容與側車檔案。',
                            ja: 'このドラフトのソース、サンプル内容、サイドカーをここで確認します。',
                            ko: '이 초안의 소스, 샘플 콘텐츠, 사이드카 파일을 여기에서 살펴봅니다.',
                            fr: 'Parcourez ici les sources, le contenu d’exemple et les fichiers annexes de ce brouillon.',
                          })
                        : activeMobileUtilityOverlay === 'checks'
                          ? pickLocaleText(locale, {
                              en: 'Review save state, last validation time, and open checks for this draft.',
                              zh_HANS: '在这里查看当前草稿的保存状态、最近校验时间和待处理检查项。',
                              zh_HANT: '在這裡查看目前草稿的儲存狀態、最近驗證時間與待處理檢查項。',
                              ja: 'このドラフトの保存状態、直近の検証時刻、未解決チェックをここで確認します。',
                              ko: '이 초안의 저장 상태, 최근 검증 시각, 열린 확인 항목을 여기에서 검토합니다.',
                              fr: 'Vérifiez ici l’état d’enregistrement, la dernière validation et les contrôles ouverts de ce brouillon.',
                            })
                          : pickLocaleText(locale, {
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
                    onClick={() => setMobileOverlay(null)}
                    ref={mobileUtilityOverlay.mobileInitialFocusRef}
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
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {[
                    {
                      key: 'previewOptions',
                      label: pickLocaleText(locale, {
                        en: 'Preview options',
                        zh_HANS: '预览选项',
                        zh_HANT: '預覽選項',
                        ja: 'プレビュー設定',
                        ko: '미리보기 옵션',
                        fr: 'Options aperçu',
                      }),
                    },
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
                    },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      aria-controls={item.key === 'previewOptions'
                        ? mobilePreviewOptionsSheetId
                        : item.key === 'files'
                          ? fileDrawerId
                          : validationDrawerId}
                      aria-expanded={activeMobileUtilityOverlay === item.key}
                      aria-pressed={activeMobileUtilityOverlay === item.key}
                      onClick={(event) => {
                        mobileUtilityOverlay.registerTrigger(event.currentTarget);
                        setMobileOverlay(item.key as Exclude<MobileIdeOverlay, 'actions' | null>);
                      }}
                      className={`inline-flex min-h-12 items-center justify-center rounded-2xl border px-3 py-2 text-center text-xs font-semibold leading-tight transition ${
                        activeMobileUtilityOverlay === item.key
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {activeMobileUtilityOverlay === 'previewOptions' ? (
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
                ) : activeMobileUtilityOverlay === 'files' ? (
                  <div className="space-y-4 overflow-auto pr-1">
                    {groupedFiles.map((group) => (
                      <div key={group.groupId} className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {getVirtualFileGroupLabel(locale, group.groupId)}
                        </p>
                        <div className="space-y-2">
                          {group.files.map((file) => (
                            <button
                              key={file.path}
                              type="button"
                              data-testid={`ide-file-${file.path}`}
                              onClick={() => {
                                setActivePath(file.path);
                                setMobileOverlay(null);
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </PublicPresenceSurface>
          ) : null}
        </div>
        {mobileModalOpen ? (
          <button
            type="button"
            aria-label={pickLocaleText(locale, {
              en: 'Close active sheet',
              zh_HANS: '关闭当前抽屉',
              zh_HANT: '關閉目前抽屜',
              ja: '現在のシートを閉じる',
              ko: '현재 시트 닫기',
              fr: 'Fermer la feuille active',
            })}
            className="fixed inset-0 z-30 cursor-default bg-slate-950/10 backdrop-blur-[1px] xl:hidden"
            data-testid="ide-mobile-overlay-backdrop"
            onClick={() => setMobileOverlay(null)}
          />
        ) : null}
      </div>
    </PublicPresenceShell>
  );
}
