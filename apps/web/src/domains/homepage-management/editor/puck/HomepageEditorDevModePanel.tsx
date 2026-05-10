'use client';

import { type ThemeConfig } from '@tcrn/shared';
import { type ReactNode, useMemo } from 'react';

import {
  type HomepageDraftComponentRecord,
  type HomepageDraftContent,
} from '@/domains/homepage-management/api/homepage.api';
import {
  normalizeHomepageLayoutProps,
  resolveHomepageLayoutSurfaceStyle,
  resolveHomepageLayoutWrapperStyle,
} from '@/domains/homepage-management/editor/puck/homepage-layout-presets';
import { isHomepagePuckSupportedType } from '@/domains/homepage-management/editor/puck/homepage-puck-mappers';
import {
  buildHomepageSourceDocument,
} from '@/domains/homepage-management/editor/source/homepage-source-dsl';
import { type HomepageEditorCopy } from '@/domains/homepage-management/screens/homepage-editor.copy';
import { GlassSurface } from '@/platform/ui';

function asPrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function buildWarnings(input: {
  content: HomepageDraftContent;
  copy: HomepageEditorCopy;
  isAdvancedEjected: boolean;
  selectedComponent: HomepageDraftComponentRecord | null;
}) {
  const warnings: string[] = [];
  const unsupportedCount = input.content.components.filter(
    (component) => !isHomepagePuckSupportedType(component.type),
  ).length;

  if (!input.selectedComponent) {
    warnings.push(
      `${input.copy.sections.devModeSelectedBlockTitle}: ${input.copy.structured.options.none}`,
    );
  }

  if (unsupportedCount > 0) {
    warnings.push(`${input.copy.structured.unsupportedCategory}: ${unsupportedCount}`);
  }

  if (input.isAdvancedEjected) {
    warnings.push(input.copy.state.visualLockedAfterEject);
  }

  return warnings;
}

function SectionCard({
  title,
  children,
  className = '',
}: Readonly<{
  title: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <GlassSurface className={`p-4 ${className}`}>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {children}
      </div>
    </GlassSurface>
  );
}

export function HomepageEditorDevModePanel({
  content,
  copy,
  isAdvancedEjected,
  selectedComponent,
  theme,
}: Readonly<{
  content: HomepageDraftContent;
  copy: HomepageEditorCopy;
  isAdvancedEjected: boolean;
  selectedComponent: HomepageDraftComponentRecord | null;
  theme: ThemeConfig;
}>) {
  const schemaJson = useMemo(
    () => asPrettyJson(buildHomepageSourceDocument(content, theme)),
    [content, theme],
  );
  const selectedProps = selectedComponent?.props ?? {};
  const layout = useMemo(() => normalizeHomepageLayoutProps(selectedProps), [selectedProps]);
  const resolvedLayout = useMemo(
    () => ({
      layout,
      resolvedSurfaceStyle: resolveHomepageLayoutSurfaceStyle(layout),
      resolvedWrapperStyle: resolveHomepageLayoutWrapperStyle(layout),
    }),
    [layout],
  );
  const themeSummary = useMemo(
    () => ({
      accent: theme.colors.accent,
      background: theme.colors.background,
      cardBackground: theme.card.background,
      primary: theme.colors.primary,
      text: theme.colors.text,
      textSecondary: theme.colors.textSecondary,
    }),
    [
      theme.card.background,
      theme.colors.accent,
      theme.colors.background,
      theme.colors.primary,
      theme.colors.text,
      theme.colors.textSecondary,
    ],
  );
  const warnings = useMemo(
    () => buildWarnings({ content, copy, isAdvancedEjected, selectedComponent }),
    [content, copy, isAdvancedEjected, selectedComponent],
  );

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-auto">
      <SectionCard title={copy.sections.devModeSelectedBlockTitle}>
        {selectedComponent ? (
          <>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                {selectedComponent.type}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-xs text-slate-600">
                {selectedComponent.id}
              </span>
            </div>
            <pre className="overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">
              {asPrettyJson(selectedComponent.props)}
            </pre>
          </>
        ) : (
          <p className="text-sm text-slate-500">{copy.structured.options.none}</p>
        )}
      </SectionCard>

      <SectionCard title={copy.sections.devModeLayoutTitle}>
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">
          {asPrettyJson(resolvedLayout)}
        </pre>
      </SectionCard>

      <SectionCard title={copy.sections.devModeThemeTitle}>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(themeSummary).map(([token, value]) => (
            <div
              key={token}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-3 py-2"
            >
              <span className="font-mono text-xs text-slate-600">{token}</span>
              <span className="flex items-center gap-2 font-mono text-xs text-slate-900">
                <span
                  className="h-4 w-4 rounded-full border border-slate-200"
                  style={{ backgroundColor: value }}
                />
                {value}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={copy.sections.devModeSchemaTitle} className="flex min-h-[280px] flex-1 flex-col">
        <textarea
          readOnly
          value={schemaJson}
          className="min-h-[220px] flex-1 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-slate-50 outline-none"
          spellCheck={false}
        />
      </SectionCard>

      <SectionCard title={copy.sections.devModeWarningsTitle}>
        {warnings.length > 0 ? (
          <ul className="space-y-2 text-sm text-slate-700">
            {warnings.map((warning) => (
              <li key={warning} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                {warning}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{copy.structured.options.none}</p>
        )}
      </SectionCard>
    </div>
  );
}
