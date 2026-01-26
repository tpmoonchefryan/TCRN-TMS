// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useTranslations } from 'next-intl';

import { COMPONENT_REGISTRY } from '../lib/component-registry';

import { Button, Input, Label, Switch } from '@/components/ui';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/homepage/editor-store';

export function PropertiesPanel() {
  const t = useTranslations('homepageEditor');
  const { content, selectedComponentId, updateComponent, theme, setTheme, setThemePreset, editingLocale } = useEditorStore();

  const selectedComponent = content.components.find(c => c.id === selectedComponentId);

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
        
        {/* Component Size Control (Grid System) */}
        {!selectedComponent.id.startsWith('profile') && ( // Profile card usually stays full width or special
          <div className="space-y-2 border-b pb-4">
            <Label className="text-xs font-semibold text-muted-foreground">{t('componentSize') || 'Size'}</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: t('sizeFull') || 'Full', value: 6 },
                { label: t('sizeHalf') || 'Half', value: 3 },
                { label: t('sizeSmall') || 'Small', value: 2 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={cn(
                    "text-xs py-1.5 px-2 rounded border transition-colors",
                    (selectedComponent.props as any).colSpan === opt.value || (!('colSpan' in selectedComponent.props) && opt.value === 6)
                      ? "bg-primary/10 border-primary text-primary font-medium"
                      : "bg-background border-border hover:bg-muted"
                  )}
                  onClick={() => {
                    const currentProps = selectedComponent.props;
                    updateComponent(selectedComponent.id, { ...currentProps, colSpan: opt.value });
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Helper to debug props if needed: <pre>{JSON.stringify(props, null, 2)}</pre> */}
        <EditorComponent 
          props={effectiveProps} 
          onChange={(newProps: any) => updateComponent(selectedComponent.id, newProps)} 
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
            {['default', 'dark', 'cute', 'soft', 'minimal'].map(preset => (
              <button
                key={preset}
                className={`px-3 py-2 rounded-md text-xs capitalize min-w-[70px] transition-all border-2 
                  ${theme.preset === preset 
                    ? 'border-primary bg-primary/5 font-medium text-primary' 
                    : 'border-transparent bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-muted-foreground'
                  }`}
                onClick={() => setThemePreset(preset as any)}
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
          value={theme.visual_style || 'simple'}
          onChange={(e) => setTheme({ visual_style: e.target.value as any })}
        >
          {['simple', 'glass', 'neo', 'retro', 'flat'].map(style => (
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
            checked={theme.animation?.enable_entrance ?? true}
            onCheckedChange={(checked) => setTheme({ animation: { ...theme.animation, enable_entrance: checked } })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t('enableHover')}</Label>
          <Switch 
            checked={theme.animation?.enable_hover ?? true}
            onCheckedChange={(checked) => setTheme({ animation: { ...theme.animation, enable_hover: checked } })}
          />
        </div>
         <div className="space-y-1">
          <Label className="text-xs">{t('intensity')}</Label>
          <select 
            className="w-full p-1.5 border rounded text-xs bg-background"
            value={theme.animation?.intensity || 'medium'}
            onChange={(e) => setTheme({ animation: { ...theme.animation, intensity: e.target.value as any } })}
          >
            <option value="low">{t('low')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="high">{t('high')}</option>
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
            onChange={(e) => setTheme({ decorations: { ...theme.decorations, type: e.target.value as any } })}
          >
            <option value="none">{t('none')}</option>
            <option value="dots">{t('dots')}</option>
            <option value="grid">{t('grid')}</option>
            <option value="text">{t('text')}</option>
          </select>
        </div>

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
                  onChange={(e) => setTheme({ decorations: { ...theme.decorations, fontWeight: e.target.value as any } })}
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
      <Tabs defaultValue={selectedComponent ? "component" : "theme"} className="flex-1 flex flex-col min-h-0">
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
