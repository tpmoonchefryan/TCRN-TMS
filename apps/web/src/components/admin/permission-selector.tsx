import type { PermissionAction, RbacRolePolicyEffect, ResourceDefinition, RolePermissionInput } from '@tcrn/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { permissionApi } from '@/lib/api/modules/permission';

interface PermissionSelectorLabels {
  grant: string;
  deny: string;
  unset: string;
}

interface PermissionSelectorProps {
  value: RolePermissionInput[];
  onChange: (value: RolePermissionInput[]) => void;
  labels: PermissionSelectorLabels;
  disabled?: boolean;
}

export function PermissionSelector({ value, onChange, labels, disabled }: PermissionSelectorProps) {
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
        setResources([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  const getPermissionEffect = (
    resource: RolePermissionInput['resource'],
    action: PermissionAction,
  ): RbacRolePolicyEffect | 'unset' => {
    const permission = value.find((entry) => entry.resource === resource && entry.action === action);

    if (!permission) {
      return 'unset';
    }

    return permission.effect === 'deny' ? 'deny' : 'grant';
  };

  const setPermissionEffect = (
    resource: RolePermissionInput['resource'],
    action: PermissionAction,
    effect: RbacRolePolicyEffect | 'unset',
  ) => {
    const existingIndex = value.findIndex((entry) => entry.resource === resource && entry.action === action);

    if (effect === 'unset') {
      if (existingIndex === -1) {
        return;
      }

      onChange(value.filter((_, index) => index !== existingIndex));
      return;
    }

    if (existingIndex === -1) {
      onChange([...value, { resource, action, effect }]);
      return;
    }

    const nextValue = [...value];
    nextValue[existingIndex] = {
      resource,
      action,
      effect,
    };
    onChange(nextValue);
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
                      <div className="flex flex-col">
                        <Label className="text-sm font-medium">
                          {resource.name}
                        </Label>
                        <span className="text-xs text-muted-foreground font-mono mt-1">{resource.code}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 pl-9">
                      <div className="space-y-2">
                        {resource.actions.map((action) => (
                          <div key={`${resource.code}-${action}`} className="flex items-center justify-between gap-3">
                            <span className="text-sm capitalize">{action}</span>
                            <div className="flex gap-1">
                              {(['grant', 'deny', 'unset'] as const).map((effect) => {
                                const activeEffect = getPermissionEffect(resource.code, action);
                                const isActive = activeEffect === effect;
                                const label = labels[effect];
                                const activeClassName = effect === 'grant'
                                  ? 'bg-green-500 text-white'
                                  : effect === 'deny'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-400 text-white';

                                return (
                                  <button
                                    key={effect}
                                    type="button"
                                    data-testid={`perm-${resource.code}-${action}-${effect}`}
                                    aria-pressed={isActive}
                                    onClick={() => setPermissionEffect(resource.code, action, effect)}
                                    disabled={disabled}
                                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                      isActive
                                        ? activeClassName
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
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
