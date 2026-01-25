import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { permissionApi } from '@/lib/api/client';

interface ResourceDefinition {
  module: string;
  moduleName: string;
  resources: Array<{
    code: string;
    name: string;
    actions: string[];
  }>;
}

interface PermissionSelectorProps {
  value: Array<{ resource: string; action: string }>;
  onChange: (value: Array<{ resource: string; action: string }>) => void;
  disabled?: boolean;
}

export function PermissionSelector({ value, onChange, disabled }: PermissionSelectorProps) {
  // const t = useTranslations('adminConsole.roles'); 
  const [resources, setResources] = useState<ResourceDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await permissionApi.getResources();
        if (response.success && response.data) {
          setResources(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch resources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  const handleToggle = (resource: string, action: string, checked: boolean) => {
    if (checked) {
      if (!value.some(p => p.resource === resource && p.action === action)) {
        onChange([...value, { resource, action }]);
      }
    } else {
      onChange(value.filter(p => !(p.resource === resource && p.action === action)));
    }
  };

  const handleToggleResource = (resource: string, actions: string[], checked: boolean) => {
    let newValue = [...value];
    
    actions.forEach(action => {
      if (checked) {
        if (!newValue.some(p => p.resource === resource && p.action === action)) {
          newValue.push({ resource, action });
        }
      } else {
        newValue = newValue.filter(p => !(p.resource === resource && p.action === action));
      }
    });

    onChange(newValue);
  };

  const isSelected = (resource: string, action: string) => {
    return value.some(p => p.resource === resource && p.action === action);
  };

  const isResourceFullySelected = (resource: string, actions: string[]) => {
    return actions.every(action => isSelected(resource, action));
  };

  const isResourcePartiallySelected = (resource: string, actions: string[]) => {
    const selectedCount = actions.filter(action => isSelected(resource, action)).length;
    return selectedCount > 0 && selectedCount < actions.length;
  };

  if (loading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={resources.map(r => r.module)} className="w-full">
        {resources.map((module) => (
          <AccordionItem key={module.module} value={module.module} className="border rounded-md px-4 mb-2">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">{module.moduleName}</span>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="space-y-4">
                {module.resources.map((resource) => (
                  <Card key={resource.code} className="shadow-none border-dashed">
                    <CardHeader className="p-3 pb-2">
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id={`res-${resource.code}`}
                                checked={isResourceFullySelected(resource.code, resource.actions) || (isResourcePartiallySelected(resource.code, resource.actions) ? 'indeterminate' : false)}
                                onCheckedChange={(checked) => handleToggleResource(resource.code, resource.actions, checked as boolean)}
                                disabled={disabled}
                            />
                            <Label htmlFor={`res-${resource.code}`} className="text-sm font-medium cursor-pointer">
                                {resource.name}
                            </Label>
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 pl-9">
                      <div className="flex flex-wrap gap-4">
                        {resource.actions.map((action) => (
                          <div key={`${resource.code}-${action}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${resource.code}-${action}`}
                              checked={isSelected(resource.code, action)}
                              onCheckedChange={(checked) => handleToggle(resource.code, action, checked as boolean)}
                              disabled={disabled}
                            />
                            <Label htmlFor={`${resource.code}-${action}`} className="text-sm cursor-pointer capitalize">
                              {action}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
