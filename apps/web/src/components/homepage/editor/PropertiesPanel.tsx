// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import type { ThemeConfig } from '@tcrn/shared';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button, Input, Label, Switch } from '@/components/ui';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEditorStore } from '@/stores/homepage/editor-store';

import { COMPONENT_REGISTRY } from '../lib/component-registry';

const THEME_PRESETS = ['default', 'dark', 'cute', 'soft', 'minimal'] as const;
const VISUAL_STYLES = ['simple', 'glass', 'neo', 'retro', 'flat'] as const satisfies readonly ThemeConfig['visualStyle'][];
const ANIMATION_INTENSITIES = ['low', 'medium', 'high'] as const satisfies readonly ThemeConfig['animation']['intensity'][];
const DECORATION_TYPES = ['none', 'dots', 'grid', 'text'] as const satisfies readonly ThemeConfig['decorations']['type'][];
const DECORATION_DENSITIES = ['low', 'medium', 'high'] as const satisfies readonly NonNullable<ThemeConfig['decorations']['density']>[];
const DECORATION_SPEEDS = ['slow', 'normal', 'fast'] as const satisfies readonly NonNullable<ThemeConfig['decorations']['speed']>[];
const DECORATION_SCROLL_MODES = ['parallel', 'alternate'] as const satisfies readonly NonNullable<ThemeConfig['decorations']['scrollMode']>[];
type ThemeFontWeightOption = Extract<NonNullable<ThemeConfig['decorations']['fontWeight']>, string>;
const FONT_WEIGHT_OPTIONS = ['normal', 'bold', 'lighter'] as const satisfies readonly ThemeFontWeightOption[];

function isOptionValue<T extends string>(options: readonly T[], value: string): value is T {
  return (options as readonly string[]).includes(value);
}

export function PropertiesPanel() {
  const t = useTranslations('homepageEditor');
  const { content, selectedComponentId, updateComponent, theme, setTheme, setThemePreset, editingLocale } = useEditorStore();
  const [activeTab, setActiveTab] = React.useState("theme");

  const selectedComponent = content.components.find(c => c.id === selectedComponentId);

  // Auto-switch to component tab when a component is selected
  React.useEffect(() => {
    if (selectedComponentId) {
      setActiveTab("component");
    }
  }, [selectedComponentId]);

  const updateDecorations = (patch: Partial<ThemeConfig['decorations']>) => {
    setTheme({
      decorations: {
        ...theme.decorations,
        ...patch,
      },
    });
  };

  // Render form based on component type
  const renderComponentForm = () => {
    if (!selectedComponent) return null;

    const { type, props, i18n } = selectedComponent;
    const definition = COMPONENT_REGISTRY[type];

    if (!definition || !definition.editor) {
      return (
          <div className="text-sm text-muted-foreground italic">
            {t('notImplemented', { type })}
          </div>
      );
    }

    const EditorComponent = definition.editor;

    // Resolve effective props based on editing locale
    let effectiveProps = props;
    if (editingLocale && editingLocale !== 'default') {
      effectiveProps = { ...props, ...(i18n?.[editingLocale] || {}) };
    }

    return (
      <div className="space-y-4">
        {editingLocale && editingLocale !== 'default' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs px-3 py-2 rounded-md border border-blue-100 dark:border-blue-800">
            Editing <strong>{editingLocale.toUpperCase()}</strong> localization.
            <br/>Changes will override default content for this language.
          </div>
        )}
        
        {/* Helper to debug props if needed: <pre>{JSON.stringify(props, null, 2)}</pre> */}
        <EditorComponent 
          props={effectiveProps}
          onChange={(newProps: Record<string, unknown>) => updateComponent(selectedComponent.id, newProps)}
        />
      </div>
    );
  };

  const renderThemeForm = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('preset')}</Label>
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex w-max space-x-2">
            {THEME_PRESETS.map(preset => (
              <button
                key={preset}
                className={`px-3 py-2 rounded-md text-xs capitalize min-w-[70px] transition-all border-2 
                  ${theme.preset === preset 
                    ? 'border-primary bg-primary/5 font-medium text-primary' 
                    : 'border-transparent bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-muted-foreground'
                  }`}
                onClick={() => setThemePreset(preset)}
              >
                {t(`preset${preset.charAt(0).toUpperCase() + preset.slice(1)}`)}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="space-y-2">
        <Label>{t('visualStyle')}</Label>
        <select 
          className="w-full p-2 border rounded text-sm bg-background"
          value={theme.visualStyle || 'simple'}
          onChange={(e) => {
            const nextStyle = e.target.value;
            if (isOptionValue(VISUAL_STYLES, nextStyle)) {
              setTheme({ visualStyle: nextStyle });
            }
          }}
        >
          {VISUAL_STYLES.map(style => (
            <option key={style} value={style}>{t(`style_${style}`)}</option>
          ))}
        </select>
      </div>
      
      <div className="space-y-2">
        <Label>{t('primaryColor')}</Label>
        <div className="flex gap-2">
          <Input 
            type="color" 
            className="w-10 h-10 p-1 cursor-pointer"
            value={theme.colors.primary}
            onChange={(e) => setTheme({ colors: { ...theme.colors, primary: e.target.value } })}
          />
          <Input 
            value={theme.colors.primary}
            onChange={(e) => setTheme({ colors: { ...theme.colors, primary: e.target.value } })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('backgroundColor')}</Label>
        <div className="flex gap-2">
          <Input 
            type="color" 
            className="w-10 h-10 p-1 cursor-pointer"
            value={theme.background.value}
            onChange={(e) => setTheme({ background: { ...theme.background, value: e.target.value } })}
          />
          <Input 
            value={theme.background.value}
            onChange={(e) => setTheme({ background: { ...theme.background, value: e.target.value } })}
          />
        </div>
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="font-semibold text-sm">{t('animations')}</h4>
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t('enableEntrance')}</Label>
          <Switch 
            checked={theme.animation?.enableEntrance ?? true}
            onCheckedChange={(checked) => setTheme({ animation: { ...theme.animation, enableEntrance: checked } })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t('enableHover')}</Label>
          <Switch 
            checked={theme.animation?.enableHover ?? true}
            onCheckedChange={(checked) => setTheme({ animation: { ...theme.animation, enableHover: checked } })}
          />
        </div>
         <div className="space-y-1">
          <Label className="text-xs">{t('intensity')}</Label>
          <select 
            className="w-full p-1.5 border rounded text-xs bg-background"
            value={theme.animation?.intensity || 'medium'}
            onChange={(e) => {
              const nextIntensity = e.target.value;
              if (isOptionValue(ANIMATION_INTENSITIES, nextIntensity)) {
                setTheme({ animation: { ...theme.animation, intensity: nextIntensity } });
              }
            }}
          >
            {ANIMATION_INTENSITIES.map(intensity => (
              <option key={intensity} value={intensity}>{t(intensity)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="font-semibold text-sm">{t('decorations')}</h4>
        <div className="space-y-1">
          <Label className="text-xs">{t('type')}</Label>
          <select 
            className="w-full p-1.5 border rounded text-xs bg-background"
            value={theme.decorations?.type || 'none'}
            onChange={(e) => {
              const nextType = e.target.value;
              if (isOptionValue(DECORATION_TYPES, nextType)) {
                updateDecorations({ type: nextType });
              }
            }}
          >
            {DECORATION_TYPES.map(type => (
              <option key={type} value={type}>{t(type)}</option>
            ))}
          </select>
        </div>

        {theme.decorations?.type !== 'none' && (
          <div className="grid grid-cols-2 gap-2">
             <div className="space-y-1">
              <Label className="text-xs">{t('density')}</Label>
              <select 
                className="w-full p-1.5 border rounded text-xs bg-background h-8"
                value={theme.decorations.density || 'medium'}
                onChange={(e) => {
                  const nextDensity = e.target.value;
                  if (isOptionValue(DECORATION_DENSITIES, nextDensity)) {
                    updateDecorations({ density: nextDensity });
                  }
                }}
              >
                {DECORATION_DENSITIES.map(density => (
                  <option key={density} value={density}>{t(density)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('speed')}</Label>
              <select 
                className="w-full p-1.5 border rounded text-xs bg-background h-8"
                value={theme.decorations.speed || 'normal'}
                onChange={(e) => {
                  const nextSpeed = e.target.value;
                  if (isOptionValue(DECORATION_SPEEDS, nextSpeed)) {
                    updateDecorations({ speed: nextSpeed });
                  }
                }}
              >
                {DECORATION_SPEEDS.map(speed => (
                  <option key={speed} value={speed}>{t(speed)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('scrollMode')}</Label>
              <select 
                className="w-full p-1.5 border rounded text-xs bg-background h-8"
                value={theme.decorations.scrollMode || 'parallel'}
                onChange={(e) => {
                  const nextMode = e.target.value;
                  if (isOptionValue(DECORATION_SCROLL_MODES, nextMode)) {
                    updateDecorations({ scrollMode: nextMode });
                  }
                }}
              >
                {DECORATION_SCROLL_MODES.map(mode => (
                  <option key={mode} value={mode}>{t(mode)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('scrollDirection')}</Label>
              <select 
                className="w-full p-1.5 border rounded text-xs bg-background h-8"
                value={theme.decorations.scrollAngle ?? 135}
                onChange={(e) => setTheme({ decorations: { ...theme.decorations, scrollAngle: Number(e.target.value) } })}
              >
                <option value={0}>⬆️ {t('scrollUp')}</option>
                <option value={45}>↗️ {t('upRight')}</option>
                <option value={90}>➡️ {t('scrollRight')}</option>
                <option value={135}>↘️ {t('downRight')}</option>
                <option value={180}>⬇️ {t('scrollDown')}</option>
                <option value={225}>↙️ {t('downLeft')}</option>
                <option value={270}>⬅️ {t('scrollLeft')}</option>
                <option value={315}>↖️ {t('upLeft')}</option>
              </select>
            </div>
          </div>
        )}

        {/* Text Decoration Controls */}
        {theme.decorations?.type === 'text' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">{t('content')}</Label>
              <Input 
                value={theme.decorations.text || ''}
                onChange={(e) => setTheme({ decorations: { ...theme.decorations, text: e.target.value } })}
                placeholder="Watermark text"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('fontFamily')}</Label>
              <select 
                className="w-full p-1.5 border rounded text-xs bg-background"
                value={theme.decorations.fontFamily || 'system'}
                onChange={(e) => setTheme({ decorations: { ...theme.decorations, fontFamily: e.target.value } })}
              >
                <option value="system">System UI</option>
                <option value="inter">Inter</option>
                <option value="noto-sans">Noto Sans</option>
                <option value="outfit">Outfit</option>
                <option value="space-grotesk">Space Grotesk</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
               <div className="space-y-1">
                <Label className="text-xs">{t('fontSize')}</Label>
                <Input 
                  type="number"
                  min={12}
                  max={200}
                  value={theme.decorations.fontSize || 24}
                  onChange={(e) => setTheme({ decorations: { ...theme.decorations, fontSize: Number(e.target.value) } })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('fontWeight')}</Label>
                <select 
                  className="w-full p-1.5 border rounded text-xs bg-background h-8"
                  value={theme.decorations.fontWeight || 'normal'}
                  onChange={(e) => {
                    const nextWeight = e.target.value;
                    if (isOptionValue(FONT_WEIGHT_OPTIONS, nextWeight)) {
                      updateDecorations({ fontWeight: nextWeight });
                    }
                  }}
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="lighter">Light</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('style')}</Label>
              <div className="flex gap-2">
                 <Button
                   variant={theme.decorations.textDecoration === 'underline' ? 'secondary' : 'outline'}
                   size="sm"
                   className="flex-1 h-8 text-xs"
                   onClick={() => setTheme({ decorations: { ...theme.decorations, textDecoration: theme.decorations.textDecoration === 'underline' ? 'none' : 'underline' } })}
                 >
                   Underline
                 </Button>
                 <Button
                   variant={theme.decorations.textDecoration === 'line-through' ? 'secondary' : 'outline'}
                   size="sm"
                   className="flex-1 h-8 text-xs"
                   onClick={() => setTheme({ decorations: { ...theme.decorations, textDecoration: theme.decorations.textDecoration === 'line-through' ? 'none' : 'line-through' } })}
                 >
                   Strikethrough
                 </Button>
              </div>
            </div>

             <div className="space-y-1">
              <Label className="text-xs">{t('rotation')}</Label>
              <Input 
                type="number"
                min={-180}
                max={180}
                value={theme.decorations.rotation ?? -45}
                onChange={(e) => setTheme({ decorations: { ...theme.decorations, rotation: Number(e.target.value) } })}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
         <div className="space-y-1">
          <Label className="text-xs">{t('color')}</Label>
          <div className="flex gap-2">
            <Input 
              type="color" 
              className="w-8 h-8 p-1 cursor-pointer"
              value={theme.decorations?.color || '#000000'}
              onChange={(e) => setTheme({ decorations: { ...theme.decorations, color: e.target.value } })}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full border-l bg-white dark:bg-slate-950 w-80 overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4">
          <TabsList className="w-full mt-2">
            <TabsTrigger value="component" disabled={!selectedComponent} className="flex-1">{t('component')}</TabsTrigger>
            <TabsTrigger value="theme" className="flex-1">{t('theme')}</TabsTrigger>
          </TabsList>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <TabsContent value="component" className="m-0">
            {selectedComponent ? (
              <>
                <div className="mb-4 pb-4 border-b">
                  <h3 className="font-semibold">{selectedComponent.type}</h3>
                  <p className="text-xs text-muted-foreground">{t('componentId')}: {selectedComponent.id.slice(0, 8)}</p>
                </div>
                {renderComponentForm()}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {t('selectComponent')}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="theme" className="m-0">
            {renderThemeForm()}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
