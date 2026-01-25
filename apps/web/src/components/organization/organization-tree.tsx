// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
  ChevronRight,
  ChevronDown,
  Building2,
  FolderTree,
  Sparkles,
  Settings,
  Check,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SubsidiaryInfo, TalentInfo } from '@/stores/talent-store';

// Types for tree node
export type ScopeType = 'tenant' | 'subsidiary' | 'talent';

export interface TreeNode {
  id: string;
  code: string;
  displayName: string;
  type: ScopeType;
  path?: string;
  parentId?: string | null;
  children?: TreeNode[];
  avatarUrl?: string;
}

export interface AccessibilityState {
  enabled: boolean;
  includeSubunits?: boolean;
}

// Props for organization tree component
interface OrganizationTreeProps {
  // Data
  tenantName: string;
  tenantId: string;
  subsidiaries: SubsidiaryInfo[];
  directTalents: TalentInfo[];
  
  // Selection mode
  selectable?: boolean;
  selectedNode?: TreeNode | null;
  onNodeSelect?: (node: TreeNode) => void;
  
  // Navigation mode
  navigable?: boolean;
  onNavigate?: (node: TreeNode, action: 'details' | 'settings') => void;
  
  // Accessibility mode (for user role assignment)
  showAccessibility?: boolean;
  accessibilityState?: Record<string, AccessibilityState>;
  onAccessibilityChange?: (nodeId: string, state: AccessibilityState) => void;
  
  // Display options
  showSettings?: boolean;
  compact?: boolean;
  className?: string;
}

// Convert SubsidiaryInfo to TreeNode recursively
function subsidiaryToTreeNode(sub: SubsidiaryInfo): TreeNode {
  return {
    id: sub.id,
    code: sub.code,
    displayName: sub.displayName,
    type: 'subsidiary',
    path: sub.path,
    parentId: sub.parentId,
    children: [
      // Child subsidiaries
      ...sub.children.map(subsidiaryToTreeNode),
      // Talents under this subsidiary
      ...sub.talents.map(talent => ({
        id: talent.id,
        code: talent.code,
        displayName: talent.displayName,
        type: 'talent' as ScopeType,
        path: talent.path,
        parentId: sub.id,
        avatarUrl: talent.avatarUrl,
      })),
    ],
  };
}

// Tree Node Component
interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  selectedId?: string;
  onSelect?: (node: TreeNode) => void;
  onNavigate?: (node: TreeNode, action: 'details' | 'settings') => void;
  showSettings?: boolean;
  showAccessibility?: boolean;
  accessibilityStateMap?: Record<string, AccessibilityState>;
  onAccessibilityChange?: (nodeId: string, state: AccessibilityState) => void;
}

function TreeNodeItem({
  node,
  level,
  selectedId,
  onSelect,
  onNavigate,
  showSettings,
  showAccessibility,
  accessibilityStateMap = {},
  onAccessibilityChange,
}: TreeNodeItemProps) {
  // Get this node's accessibility state from the map
  const accessibilityState = accessibilityStateMap[node.id];
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const getIcon = () => {
    switch (node.type) {
      case 'tenant':
        return <Building2 size={16} className="text-blue-500" />;
      case 'subsidiary':
        return <FolderTree size={16} className="text-amber-500" />;
      case 'talent':
        return <Sparkles size={16} className="text-pink-500" />;
    }
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(node);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate?.(node, 'settings');
  };

  const handleAccessibilityToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAccessibilityChange) {
      const newState = accessibilityState 
        ? { ...accessibilityState, enabled: !accessibilityState.enabled }
        : { enabled: true };
      onAccessibilityChange(node.id, newState);
    }
  };

  const handleIncludeSubunitsToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAccessibilityChange) {
      const newState = accessibilityState 
        ? { ...accessibilityState, includeSubunits: !accessibilityState.includeSubunits }
        : { enabled: true, includeSubunits: true };
      onAccessibilityChange(node.id, newState);
    }
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse Toggle */}
        <button
          onClick={handleToggle}
          className="flex items-center justify-center w-5 h-5 opacity-70 hover:opacity-100 transition-opacity"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span className="w-[14px]" />
          )}
        </button>

        {/* Icon */}
        {node.type === 'talent' && node.avatarUrl ? (
          <img
            src={node.avatarUrl}
            alt={node.displayName}
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : (
          getIcon()
        )}

        {/* Label */}
        <span className="flex-1 truncate text-sm font-medium">{node.displayName}</span>

        {/* Selection indicator */}
        {isSelected && <Check size={14} className="text-primary" />}

        {/* Accessibility Toggle */}
        {showAccessibility && (
          <div className="flex items-center gap-1">
            {/* Accessible toggle */}
            <button
              onClick={handleAccessibilityToggle}
              className={cn(
                'p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
                accessibilityState?.enabled
                  ? 'text-green-600'
                  : 'text-slate-400'
              )}
              title={accessibilityState?.enabled ? 'Can access this level' : 'No access to this level'}
            >
              {accessibilityState?.enabled ? (
                <ToggleRight size={16} />
              ) : (
                <ToggleLeft size={16} />
              )}
            </button>

            {/* Include Subunits (only for tenant/subsidiary when accessibility is on) */}
            {accessibilityState?.enabled && node.type !== 'talent' && (
              <button
                onClick={handleIncludeSubunitsToggle}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border transition-colors',
                  accessibilityState.includeSubunits
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                    : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-600'
                )}
                title={accessibilityState.includeSubunits 
                  ? 'Includes all subunits' 
                  : 'This level only'
                }
              >
                {accessibilityState.includeSubunits ? (
                  <>
                    <ChevronDown size={10} />
                    <span>Incl. Sub</span>
                  </>
                ) : (
                  <span>Only</span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Settings Button */}
        {showSettings && (
          <button
            onClick={handleSettingsClick}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            title="Settings"
          >
            <Settings size={14} className="text-slate-400" />
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onNavigate={onNavigate}
              showSettings={showSettings}
              showAccessibility={showAccessibility}
              accessibilityStateMap={accessibilityStateMap}
              onAccessibilityChange={onAccessibilityChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main Component
export function OrganizationTree({
  tenantName,
  tenantId,
  subsidiaries,
  directTalents,
  selectable = true,
  selectedNode,
  onNodeSelect,
  navigable = false,
  onNavigate,
  showAccessibility = false,
  accessibilityState = {},
  onAccessibilityChange,
  showSettings = false,
  compact = false,
  className,
}: OrganizationTreeProps) {
  // Build tree structure
  const treeData: TreeNode = {
    id: tenantId,
    code: 'TENANT',
    displayName: tenantName,
    type: 'tenant',
    children: [
      // Subsidiaries with nested structure
      ...subsidiaries.map(subsidiaryToTreeNode),
      // Direct talents (not under any subsidiary)
      ...directTalents.map(talent => ({
        id: talent.id,
        code: talent.code,
        displayName: talent.displayName,
        type: 'talent' as ScopeType,
        path: talent.path,
        parentId: null,
        avatarUrl: talent.avatarUrl,
      })),
    ],
  };

  const handleNodeSelect = useCallback(
    (node: TreeNode) => {
      if (selectable && onNodeSelect) {
        onNodeSelect(node);
      }
    },
    [selectable, onNodeSelect]
  );

  return (
    <div
      className={cn(
        'rounded-lg border bg-card',
        compact ? 'p-2' : 'p-4',
        className
      )}
    >
      {!compact && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b">
          <Building2 size={18} className="text-blue-500" />
          <h3 className="font-semibold">Organization Structure</h3>
        </div>
      )}

      <div className={cn('overflow-auto', compact ? 'max-h-64' : 'max-h-96')}>
        <TreeNodeItem
          node={treeData}
          level={0}
          selectedId={selectedNode?.id}
          onSelect={handleNodeSelect}
          onNavigate={onNavigate}
          showSettings={showSettings}
          showAccessibility={showAccessibility}
          accessibilityStateMap={accessibilityState}
          onAccessibilityChange={onAccessibilityChange}
        />
      </div>
    </div>
  );
}

// Simple list view for when tree is too complex
export function OrganizationList({
  subsidiaries,
  directTalents,
  selectedId,
  onSelect,
  className,
}: {
  subsidiaries: SubsidiaryInfo[];
  directTalents: TalentInfo[];
  selectedId?: string;
  onSelect: (type: ScopeType, id: string) => void;
  className?: string;
}) {
  const allNodes: Array<{ id: string; name: string; type: ScopeType; path: string }> = [];

  // Flatten subsidiaries
  const flattenSubsidiaries = (subs: SubsidiaryInfo[], prefix = '') => {
    for (const sub of subs) {
      allNodes.push({
        id: sub.id,
        name: prefix + sub.displayName,
        type: 'subsidiary',
        path: sub.path,
      });
      if (sub.children) {
        flattenSubsidiaries(sub.children, prefix + '  ');
      }
      for (const talent of sub.talents) {
        allNodes.push({
          id: talent.id,
          name: prefix + '  ' + talent.displayName,
          type: 'talent',
          path: talent.path,
        });
      }
    }
  };

  flattenSubsidiaries(subsidiaries);

  // Add direct talents
  for (const talent of directTalents) {
    allNodes.push({
      id: talent.id,
      name: talent.displayName,
      type: 'talent',
      path: talent.path,
    });
  }

  return (
    <div className={cn('space-y-1', className)}>
      {allNodes.map((node) => (
        <button
          key={node.id}
          onClick={() => onSelect(node.type, node.id)}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
            selectedId === node.id
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <div className="flex items-center gap-2">
            {node.type === 'subsidiary' ? (
              <FolderTree size={14} className="text-amber-500" />
            ) : (
              <Sparkles size={14} className="text-pink-500" />
            )}
            <span className="truncate">{node.name}</span>
          </div>
          <span className="text-xs text-muted-foreground truncate block mt-0.5">
            {node.path}
          </span>
        </button>
      ))}
    </div>
  );
}
