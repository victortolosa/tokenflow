'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTokenStore } from '@/store/useTokenStore';
import { toCssValue, isTokenLeaf, isHexColor } from '@/utils/token-format';
import { areTokenValuesEqual, getTokenLeafAtPath } from '@/utils/token-diff';
import type { TokenLeaf } from '@/utils/token-types';
import { RotateCcw } from 'lucide-react';
import { TypographyRamp } from '@/components/TypographyRamp';

function TokenValueRow({ name, token }: { name: string; token: TokenLeaf }) {
  const { updateToken, resetToken, baselineResolvedTokens } = useTokenStore();
  const label = name;
  const rawValue = token.value;
  const displayValue = toCssValue(token);
  const isEditable = typeof rawValue === 'string' || typeof rawValue === 'number';
  const showColor =
    token.type === 'color' &&
    typeof rawValue === 'string' &&
    isHexColor(rawValue);
  const baselineToken = getTokenLeafAtPath(baselineResolvedTokens, name);
  const isDirty = baselineToken ? !areTokenValuesEqual(baselineToken.value, rawValue) : false;

  return (
    <div className="flex items-start justify-between gap-3 p-2 border-b border-gray-100 last:border-0">
      <div className="w-1/2 min-w-0">
        <div className="text-xs text-gray-700 font-mono whitespace-normal break-words" title={name}>
          {label}
        </div>
        {token.type && (
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">{token.type}</div>
        )}
      </div>
      <div className="w-1/2 flex items-center gap-2 justify-end">
        {isEditable ? (
          <input
            type="text"
            value={displayValue}
            onChange={(e) => updateToken(name, e.target.value)}
            className="flex-1 min-w-0 text-xs p-1 border rounded bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-500 focus:outline-none font-mono"
          />
        ) : (
          <div className="flex-1 min-w-0 text-[10px] font-mono text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1 break-all">
            {displayValue}
          </div>
        )}
        {showColor && (
          <input
            type="color"
            value={rawValue as string}
            onChange={(e) => updateToken(name, e.target.value)}
            className="h-7 w-7 p-0 border-0 rounded cursor-pointer shrink-0"
            aria-label={`${label} color`}
          />
        )}
        <button
          type="button"
          onClick={() => resetToken(name)}
          disabled={!isDirty}
          className={`h-7 w-7 flex items-center justify-center rounded border text-gray-400 transition-colors shrink-0 ${
            isDirty
              ? 'border-gray-200 hover:text-gray-700 hover:bg-gray-100'
              : 'border-gray-100 text-gray-300 cursor-not-allowed'
          }`}
          aria-label={`Reset ${label}`}
          title={`Reset ${label}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function TokenGroup({
  name,
  tokens,
  path,
  expandAll = false,
  depth = 0,
  groupRootTokens = true,
}: {
  name: string;
  tokens: unknown;
  path: string;
  expandAll?: boolean;
  depth?: number;
  groupRootTokens?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (expandAll) setIsOpen(true);
  }, [expandAll]);

  return (
    <details
      open={expandAll ? true : isOpen}
      onToggle={(event) => {
        const open = (event.currentTarget as HTMLDetailsElement).open;
        setIsOpen(open);
      }}
      className="group border border-gray-200 rounded-md bg-white"
    >
      <summary className="cursor-pointer select-none px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 rounded-md flex items-center justify-between">
        <span>{name}</span>
        <span className="text-[9px] text-gray-400 group-open:hidden">Expand</span>
        <span className="text-[9px] text-gray-400 hidden group-open:inline">Collapse</span>
      </summary>
      <div className="p-2">
        <TokenTree tokens={tokens} path={path} expandAll={expandAll} depth={depth + 1} groupRootTokens={groupRootTokens} />
      </div>
    </details>
  );
}

function TokenTree({
  tokens,
  path,
  expandAll = false,
  depth = 0,
  groupRootTokens = true,
}: {
  tokens: unknown;
  path: string;
  expandAll?: boolean;
  depth?: number;
  groupRootTokens?: boolean;
}) {
  if (!tokens || typeof tokens !== 'object') return null;

  if (isTokenLeaf(tokens)) {
    return <TokenValueRow name={path} token={tokens} />;
  }

  const entries = Object.entries(tokens as Record<string, unknown>);
  const containerClassName =
    depth === 0 ? 'space-y-2' : 'space-y-2 pl-3 border-l border-gray-100';
  const isRootPath = path.split('.').pop() === 'Root';

  if (isRootPath && groupRootTokens) {
    const grouped = new Map<string, Array<[string, unknown]>>();
    const ungrouped: Array<[string, unknown]> = [];

    const getRootGroupLabel = (name: string) => {
      const trimmed = name.startsWith('--') ? name.slice(2) : name;
      const parts = trimmed.split('-').filter(Boolean);
      if (parts.length === 0) return 'Other';
      if (parts.length === 1) return parts[0];
      return parts.slice(0, -1).join('-');
    };

    entries.forEach(([key, child]) => {
      if (!isTokenLeaf(child)) {
        ungrouped.push([key, child]);
        return;
      }
      const groupName = getRootGroupLabel(key);
      const list = grouped.get(groupName);
      if (list) {
        list.push([key, child]);
      } else {
        grouped.set(groupName, [[key, child]]);
      }
    });

    return (
      <div className={containerClassName}>
        {Array.from(grouped.entries()).map(([groupName, groupEntries]) => (
          <TokenGroup
            key={`${path}-${groupName}`}
            name={groupName}
            tokens={Object.fromEntries(groupEntries)}
            path={path}
            expandAll={expandAll}
            depth={depth}
            groupRootTokens={false}
          />
        ))}
        {ungrouped.map(([key, child]) => {
          const nextPath = `${path}.${key}`;
          if (isTokenLeaf(child)) {
            return <TokenValueRow key={nextPath} name={nextPath} token={child} />;
          }
          return (
            <TokenGroup
              key={nextPath}
              name={key}
              tokens={child}
              path={nextPath}
              expandAll={expandAll}
              depth={depth}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      {entries.map(([key, child]) => {
        const nextPath = `${path}.${key}`;
        if (isTokenLeaf(child)) {
          return <TokenValueRow key={nextPath} name={nextPath} token={child} />;
        }
        return (
          <TokenGroup
            key={nextPath}
            name={key}
            tokens={child}
            path={nextPath}
            expandAll={expandAll}
            depth={depth}
          />
        );
      })}
    </div>
  );
}

const COLOR_GROUP_ORDER = [
  'Palette',
  'Neutral',
  'Pallet',
  'Primary',
  'Secondary',
  'Tertiary',
  'Quaternary',
  'Quarternary',
  'Semantic',
];

export function TokenAccordion({
  expandAll = false,
  onSectionToggle,
  onPreviewToggle,
  searchQuery = '',
  searchScope = 'expanded',
  expandedSections = [],
  previewSections = [],
  showStoryComponentsOnly = false,
  componentStorySet,
  showTypographyPreview = false,
  onTypographyPreviewToggle,
  typographyPreviewTab = 'standard',
  onTypographyPreviewTabChange,
}: {
  expandAll?: boolean;
  onSectionToggle?: (name: string, isOpen: boolean) => void;
  onPreviewToggle?: (name: string, isVisible: boolean) => void;
  searchQuery?: string;
  searchScope?: 'all' | 'expanded';
  expandedSections?: string[];
  previewSections?: string[];
  showStoryComponentsOnly?: boolean;
  componentStorySet?: Set<string>;
  showTypographyPreview?: boolean;
  onTypographyPreviewToggle?: (next: boolean) => void;
  typographyPreviewTab?: 'standard' | 'special';
  onTypographyPreviewTabChange?: (tab: 'standard' | 'special') => void;
} = {}) {
  const { resolvedTokens, globalTokens, isLoadingTokens } = useTokenStore();
  const [isGlobalOpen, setIsGlobalOpen] = useState(false);
  const [isComponentsOpen, setIsComponentsOpen] = useState(false);
  const hasTypographyTokens = useMemo(() => {
    const rootTokens = resolvedTokens?.Root;
    if (!rootTokens || typeof rootTokens !== 'object') return false;
    return Object.entries(rootTokens as Record<string, unknown>).some(([tokenName, tokenValue]) => {
      if (!tokenName.includes('font-size')) return false;
      if (!isTokenLeaf(tokenValue)) return false;
      return (tokenValue as TokenLeaf).type === 'fontSizes';
    });
  }, [resolvedTokens]);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchTokens = useMemo(() => {
    if (!normalizedQuery) return [];
    return normalizedQuery
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0 && /[a-z0-9]/i.test(token));
  }, [normalizedQuery]);
  const isFiltering = searchTokens.length > 0;
  const expandedSectionSet = useMemo(() => new Set(expandedSections), [expandedSections]);
  const previewSectionSet = useMemo(() => new Set(previewSections), [previewSections]);
  const resolvedEntries = useMemo(() => Object.entries(resolvedTokens ?? {}), [resolvedTokens]);
  const globalKeySet = useMemo(() => new Set(Object.keys(globalTokens ?? {})), [globalTokens]);
  const globalEntries = useMemo(
    () => resolvedEntries.filter(([name]) => globalKeySet.has(name)),
    [resolvedEntries, globalKeySet]
  );
  const componentEntries = useMemo(
    () => resolvedEntries.filter(([name]) => !globalKeySet.has(name)),
    [resolvedEntries, globalKeySet]
  );
  const storyFilteredComponentEntries = useMemo(() => {
    if (!showStoryComponentsOnly) return componentEntries;
    if (!componentStorySet || componentStorySet.size === 0) return [];
    return componentEntries.filter(([name]) => componentStorySet.has(name));
  }, [componentEntries, componentStorySet, showStoryComponentsOnly]);
  const { globalColorGroups, globalOtherEntries } = useMemo(() => {
    if (globalEntries.length === 0) {
      return { globalColorGroups: [] as Array<[string, unknown]>, globalOtherEntries: [] as Array<[string, unknown]> };
    }
    const entryMap = new Map(globalEntries);
    if (entryMap.has('Colors')) {
      return { globalColorGroups: [] as Array<[string, unknown]>, globalOtherEntries: globalEntries };
    }
    const colorGroups = COLOR_GROUP_ORDER
      .map((name) => [name, entryMap.get(name)] as [string, unknown])
      .filter(([, value]) => value && typeof value === 'object');
    const colorNames = new Set(colorGroups.map(([name]) => name));
    const otherEntries = globalEntries.filter(([name]) => !colorNames.has(name));
    return { globalColorGroups: colorGroups, globalOtherEntries: otherEntries };
  }, [globalEntries]);
  const { filteredGlobalColorGroups, filteredGlobalOtherEntries, filteredComponentEntries } = useMemo(() => {
    if (!isFiltering) {
      return {
        filteredGlobalColorGroups: globalColorGroups,
        filteredGlobalOtherEntries: globalOtherEntries,
        filteredComponentEntries: storyFilteredComponentEntries
      };
    }

    const shouldIncludeGlobal = searchScope !== 'expanded' || isGlobalOpen;
    const shouldIncludeComponents = searchScope !== 'expanded' || isComponentsOpen;
    const scopedGlobalColorGroups = shouldIncludeGlobal ? globalColorGroups : [];
    const scopedGlobalOtherEntries = shouldIncludeGlobal ? globalOtherEntries : [];
    const scopedComponentEntries = shouldIncludeComponents
      ? searchScope === 'expanded'
        ? storyFilteredComponentEntries.filter(([groupName]) => expandedSectionSet.has(groupName))
        : storyFilteredComponentEntries
      : [];

    const collapseText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchesQuery = (value: string) => {
      const lowerValue = value.toLowerCase();
      const collapsedValue = collapseText(value);
      return searchTokens.every((token) => {
        if (lowerValue.includes(token)) return true;
        const collapsedToken = collapseText(token);
        if (collapsedToken && collapsedValue.includes(collapsedToken)) return true;
        return false;
      });
    };
    const shouldShowAllColors = searchTokens.length === 1 && matchesQuery('colors');

    const filterNode = (node: unknown, path: string, label?: string, context?: string): unknown | null => {
      const labelText = context ? `${context} ${label ?? ''}`.trim() : label;
      if (labelText && matchesQuery(labelText)) return node;

      if (!node || typeof node !== 'object') return null;

      if (isTokenLeaf(node)) {
        const valueText =
          typeof node.value === 'string' || typeof node.value === 'number' ? String(node.value) : '';
        const typeText = typeof node.type === 'string' ? node.type : '';
        const combinedText = [context, path, label, valueText, typeText].filter(Boolean).join(' ');
        if (matchesQuery(combinedText)) {
          return node;
        }
        return null;
      }

      const entries = Object.entries(node as Record<string, unknown>);
      const filteredEntries: Array<[string, unknown]> = [];
      entries.forEach(([key, child]) => {
        const nextPath = path ? `${path}.${key}` : key;
        const filteredChild = filterNode(child, nextPath, key, context);
        if (filteredChild !== null) {
          filteredEntries.push([key, filteredChild]);
        }
      });

      if (filteredEntries.length === 0) return null;
      return Object.fromEntries(filteredEntries);
    };

    const nextGlobalColorGroups = shouldShowAllColors
      ? scopedGlobalColorGroups
      : scopedGlobalColorGroups
          .map(([groupName, groupTokens]) => {
            const filtered = filterNode(groupTokens, groupName, groupName, 'Colors');
            return filtered ? ([groupName, filtered] as [string, unknown]) : null;
          })
          .filter((entry): entry is [string, unknown] => Boolean(entry));

    const nextGlobalOtherEntries = scopedGlobalOtherEntries
      .map(([groupName, groupTokens]) => {
        const filtered = filterNode(groupTokens, groupName, groupName);
        return filtered ? ([groupName, filtered] as [string, unknown]) : null;
      })
      .filter((entry): entry is [string, unknown] => Boolean(entry));

    const nextComponentEntries = scopedComponentEntries
      .map(([groupName, groupTokens]) => {
        const filtered = filterNode(groupTokens, groupName, groupName);
        return filtered ? ([groupName, filtered] as [string, unknown]) : null;
      })
      .filter((entry): entry is [string, unknown] => Boolean(entry));

    return {
      filteredGlobalColorGroups: nextGlobalColorGroups,
      filteredGlobalOtherEntries: nextGlobalOtherEntries,
      filteredComponentEntries: nextComponentEntries
    };
  }, [
    expandedSectionSet,
    globalColorGroups,
    globalOtherEntries,
    isComponentsOpen,
    isFiltering,
    isGlobalOpen,
    searchScope,
    searchTokens,
    storyFilteredComponentEntries
  ]);
  const entryCount = filteredGlobalColorGroups.length + filteredGlobalOtherEntries.length + filteredComponentEntries.length;
  const expandAllSections = expandAll || (isFiltering && searchScope === 'all');
  const expandAllNested = expandAll || isFiltering;

  useEffect(() => {
    if (!expandAllSections) return;
    setIsGlobalOpen(true);
    setIsComponentsOpen(true);
  }, [expandAllSections]);

  if (isLoadingTokens && entryCount === 0 && !hasTypographyTokens) {
    return (
      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-4 text-center">
        Loading tokens...
      </div>
    );
  }

  if (entryCount === 0 && !hasTypographyTokens) {
    return (
      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-4 text-center">
        {isFiltering
          ? searchScope === 'expanded'
            ? 'No matching tokens in expanded groups.'
            : 'No matching tokens.'
          : 'No tokens loaded. Import tokens to explore.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasTypographyTokens && (
        <TypographyRamp
          showPreview={showTypographyPreview}
          onTogglePreview={onTypographyPreviewToggle}
          previewTab={typographyPreviewTab}
          onPreviewTabChange={onTypographyPreviewTabChange}
        />
      )}
      {(filteredGlobalColorGroups.length > 0 || filteredGlobalOtherEntries.length > 0) && (
        <details
          open={expandAllSections ? true : isGlobalOpen}
          onToggle={(event) => {
            if (expandAllSections) return;
            const isOpen = (event.currentTarget as HTMLDetailsElement).open;
            setIsGlobalOpen(isOpen);
          }}
          className="group border border-gray-200 rounded-lg bg-white"
        >
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 rounded-lg flex items-center justify-between">
            <span>Global tokens</span>
            <span className="text-[10px] text-gray-400 group-open:hidden">Expand</span>
            <span className="text-[10px] text-gray-400 hidden group-open:inline">Collapse</span>
          </summary>
          <div className="p-3 space-y-2">
            {filteredGlobalColorGroups.length > 0 && (
              <details
                {...(expandAllSections ? { open: true } : {})}
                className="group border border-gray-200 rounded-md bg-white"
              >
                <summary className="cursor-pointer select-none px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 rounded-md flex items-center justify-between">
                  <span>Colors</span>
                  <span className="text-[9px] text-gray-400 group-open:hidden">Expand</span>
                  <span className="text-[9px] text-gray-400 hidden group-open:inline">Collapse</span>
                </summary>
                <div className="p-2 space-y-2">
                  {filteredGlobalColorGroups.map(([groupName, groupTokens]) => (
                    <TokenGroup
                      key={groupName}
                      name={groupName}
                      tokens={groupTokens}
                      path={groupName}
                      expandAll={expandAllNested}
                      depth={0}
                    />
                  ))}
                </div>
              </details>
            )}
            {filteredGlobalOtherEntries.map(([groupName, groupTokens]) => (
              <TokenGroup
                key={groupName}
                name={groupName}
                tokens={groupTokens}
                path={groupName}
                expandAll={expandAllNested}
                depth={0}
              />
            ))}
          </div>
        </details>
      )}
      {filteredComponentEntries.length > 0 && (
        <details
          open={expandAllSections ? true : isComponentsOpen}
          onToggle={(event) => {
            if (expandAllSections) return;
            const isOpen = (event.currentTarget as HTMLDetailsElement).open;
            setIsComponentsOpen(isOpen);
          }}
          className="group border border-gray-200 rounded-lg bg-white"
        >
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 rounded-lg flex items-center justify-between">
            <span>Components</span>
            <span className="text-[10px] text-gray-400 group-open:hidden">Expand</span>
            <span className="text-[10px] text-gray-400 hidden group-open:inline">Collapse</span>
          </summary>
          <div className="p-3 space-y-2">
            {filteredComponentEntries.map(([groupName, groupTokens]) => (
              <details
                key={groupName}
                {...(expandAllSections ? { open: true } : {})}
                onToggle={(event) => {
                  if (expandAllSections) return;
                  const isOpen = (event.currentTarget as HTMLDetailsElement).open;
                  onSectionToggle?.(groupName, isOpen);
                }}
                className="group border border-gray-200 rounded-md bg-white"
              >
                <summary className="cursor-pointer select-none px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 rounded-md flex items-center justify-between">
                  <span>{groupName}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const isVisible = previewSectionSet.has(groupName);
                        onPreviewToggle?.(groupName, !isVisible);
                      }}
                      className={`text-[9px] uppercase tracking-wide px-2 py-0.5 rounded border transition-colors ${
                        previewSectionSet.has(groupName)
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                      aria-pressed={previewSectionSet.has(groupName)}
                      title={previewSectionSet.has(groupName) ? 'Hide from preview' : 'Show in preview'}
                      aria-label={previewSectionSet.has(groupName) ? `Hide ${groupName} from preview` : `Show ${groupName} in preview`}
                      disabled={!onPreviewToggle}
                    >
                      {previewSectionSet.has(groupName) ? 'Hide' : 'Show'}
                    </button>
                    <span className="text-[9px] text-gray-400 group-open:hidden">Expand</span>
                    <span className="text-[9px] text-gray-400 hidden group-open:inline">Collapse</span>
                  </div>
                </summary>
                <div className="p-2">
                  <TokenTree tokens={groupTokens} path={groupName} expandAll={expandAllNested} />
                </div>
              </details>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
