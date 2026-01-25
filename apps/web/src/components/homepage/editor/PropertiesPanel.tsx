// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useTranslations } from 'next-intl';

import { COMPONENT_REGISTRY } from '../lib/component-registry';

import { Input, Label } from '@/components/ui';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEditorStore } from '@/stores/homepage/editor-store';

export function PropertiesPanel() {
  const t = useTranslations('homepageEditor');
  const { content, selectedComponentId, updateComponent, theme, setTheme, setThemePreset } = useEditorStore();

  const selectedComponent = content.components.find(c => c.id === selectedComponentId);

  // Render form based on component type
  const renderComponentForm = () => {
    if (!selectedComponent) return null;

    const { type, props } = selectedComponent;
    const definition = COMPONENT_REGISTRY[type];

    if (!definition || !definition.editor) {
      return (
          <div className="text-sm text-muted-foreground italic">
            {t('notImplemented', { type })}
          </div>
      );
    }

    const EditorComponent = definition.editor;

    return (
      <div className="space-y-4">
        {/* Helper to debug props if needed: <pre>{JSON.stringify(props, null, 2)}</pre> */}
        <EditorComponent 
          props={props} 
          onChange={(newProps: any) => updateComponent(selectedComponent.id, newProps)} 
        />
      </div>
    );
  };

  const renderThemeForm = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('preset')}</Label>
        <div className="grid grid-cols-3 gap-2">
          {['default', 'dark', 'cute'].map(preset => (
            <button
              key={preset}
              className={`p-2 border rounded text-xs capitalize ${theme.preset === preset ? 'ring-2 ring-primary border-primary' : ''}`}
              onClick={() => setThemePreset(preset as any)}
            >
              {t(`preset${preset.charAt(0).toUpperCase() + preset.slice(1)}`)}
            </button>
          ))}
        </div>
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
    </div>
  );

  return (
    <div className="flex flex-col h-full border-l bg-white dark:bg-slate-950 w-80">
      <Tabs defaultValue={selectedComponent ? "component" : "theme"} className="flex-1 flex flex-col">
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
