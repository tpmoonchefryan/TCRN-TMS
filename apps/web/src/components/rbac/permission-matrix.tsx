'use client';

import { ActionType, Permission, ResourceDefinition } from '@tcrn/shared';

import { Card, CardContent, CardHeader, CardTitle, Checkbox } from '@/components/ui';
import { cn } from '@/lib/utils';

interface PermissionMatrixProps {
  resources: ResourceDefinition[];
  selectedPermissionIds: string[];
  permissions: Permission[]; // All available discrete permissions
  onChange: (ids: string[]) => void;
  readOnly?: boolean;
}

export function PermissionMatrix({
  resources,
  selectedPermissionIds,
  permissions,
  onChange,
  readOnly = false
}: PermissionMatrixProps) {

  const togglePermission = (permId: string) => {
    if (readOnly) return;
    
    const newSelected = selectedPermissionIds.includes(permId)
      ? selectedPermissionIds.filter(id => id !== permId)
      : [...selectedPermissionIds, permId];
    
    onChange(newSelected);
  };

  const toggleRow = (resourceCode: string, resourcePerms: Permission[]) => {
    if (readOnly) return;

    const resourcePermIds = resourcePerms.map(p => p.id);
    const allSelected = resourcePermIds.every(id => selectedPermissionIds.includes(id));

    let newSelected = [...selectedPermissionIds];
    if (allSelected) {
      // Deselect all
      newSelected = newSelected.filter(id => !resourcePermIds.includes(id));
    } else {
      // Select all (add missing)
      const missing = resourcePermIds.filter(id => !selectedPermissionIds.includes(id));
      newSelected = [...newSelected, ...missing];
    }
    onChange(newSelected);
  };

  return (
    <div className="space-y-6">
      {resources.map((module) => (
        <Card key={module.module}>
          <CardHeader className="py-3 bg-muted/30">
            <CardTitle className="text-base font-semibold text-primary">
              {module.module_name || module.module}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {module.resources.map((res) => {
                // Find matching permissions for this resource row
                // We match by resource_code and actions defined in the definition
                // The actual Permission objects have 'id' which we need for selection
                const relevantPermissions = permissions.filter(p => p.resource_code === res.code);
                
                return (
                  <div key={res.code} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className="col-span-12 md:col-span-4 lg:col-span-3">
                      <div className="font-medium text-sm">{res.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{res.code}</div>
                    </div>
                    
                    <div className="col-span-12 md:col-span-8 lg:col-span-9 flex flex-wrap gap-2 md:gap-6">
                      {/* Select All for Row */}
                      <div className="flex items-center space-x-2 mr-4 border-r pr-4">
                        <Checkbox 
                          id={`all-${res.code}`}
                          checked={relevantPermissions.every(p => selectedPermissionIds.includes(p.id))}
                          onCheckedChange={() => toggleRow(res.code, relevantPermissions)}
                          disabled={readOnly}
                        />
                        <label
                          htmlFor={`all-${res.code}`}
                          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-muted-foreground"
                        >
                          All
                        </label>
                      </div>

                      {/* Individual Actions */}
                      {res.actions.map(action => {
                        const perm = relevantPermissions.find(p => p.action === action);
                        if (!perm) return null; // Should ideally be configured correctly

                        return (
                          <div key={perm.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={perm.id}
                              checked={selectedPermissionIds.includes(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                              disabled={readOnly}
                            />
                            <label
                              htmlFor={perm.id}
                              className={cn(
                                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
                                action === ActionType.ADMIN && "text-amber-600 font-bold",
                                action === ActionType.DELETE && "text-red-500"
                              )}
                            >
                              {action}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
