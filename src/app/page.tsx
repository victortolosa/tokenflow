'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTokenStore } from '@/store/useTokenStore';
import { TokenBridge } from '@/components/TokenBridge';
import { ImportModal } from '@/components/ImportModal';
import { TokenAccordion } from '@/components/TokenAccordion';
import { TypographyRampPreview } from '@/components/TypographyRamp';
import { TokenMap } from '@/components/TokenMap';
import { Upload, Download, Search, X, GitBranch, Monitor, SlidersHorizontal, ChevronDown, Settings } from 'lucide-react';

const storybookBaseUrl = process.env.NEXT_PUBLIC_STORYBOOK_URL ?? '/storybook';
const storybookOpenUrl = process.env.NEXT_PUBLIC_STORYBOOK_URL ?? 'http://localhost:6006';
const scaleStep = 0.05;
const minScale = 0.6;
const maxScale = 1;

const storyIdByComponent: Record<string, string> = {
  button: 'components-button--default',
  hero: 'components-hero--hero',
};

type StoryIndexEntry = {
  id: string;
  title?: string;
  name?: string;
  type?: string;
};

function extractStoryEntries(payload: unknown): StoryIndexEntry[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  const entries = record.entries;
  if (entries && typeof entries === 'object') {
    return Object.entries(entries as Record<string, unknown>).map(([id, entry]) => {
      const entryRecord = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
      return {
        id,
        title: typeof entryRecord.title === 'string' ? entryRecord.title : undefined,
        name: typeof entryRecord.name === 'string' ? entryRecord.name : undefined,
        type: typeof entryRecord.type === 'string' ? entryRecord.type : undefined,
      };
    });
  }

  const stories = record.stories;
  if (stories && typeof stories === 'object') {
    return Object.entries(stories as Record<string, unknown>).map(([id, entry]) => {
      const entryRecord = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
      return {
        id: typeof entryRecord.id === 'string' ? entryRecord.id : id,
        title: typeof entryRecord.title === 'string'
          ? entryRecord.title
          : (typeof entryRecord.kind === 'string' ? entryRecord.kind : undefined),
        name: typeof entryRecord.name === 'string' ? entryRecord.name : undefined,
        type: typeof entryRecord.type === 'string' ? entryRecord.type : 'story',
      };
    });
  }

  return [];
}

function buildStoryIdLookup(
  entries: StoryIndexEntry[],
  normalize: (value: string) => string
): Record<string, string> {
  const grouped = new Map<string, StoryIndexEntry[]>();
  for (const entry of entries) {
    if (entry.type && entry.type !== 'story') continue;
    if (!entry.title) continue;
    const segment = entry.title.split('/').pop() ?? entry.title;
    const key = normalize(segment);
    if (!key) continue;
    const list = grouped.get(key) ?? [];
    list.push(entry);
    grouped.set(key, list);
  }

  const lookup: Record<string, string> = {};
  grouped.forEach((items, key) => {
    const preferred = items.find((item) => item.name?.toLowerCase() === 'default') ?? items[0];
    if (preferred?.id) lookup[key] = preferred.id;
  });

  return lookup;
}

export default function Home() {
  const {
    resolvedTokens,
    rawTokens,
    initializeTokens,
    resetToDefaultTokens,
    exportTokens,
    isLoadingTokens,
    loadError,
    activeMode,
    availableModes,
    setActiveMode,
    hasChanges
  } = useTokenStore();

  const [openSections, setOpenSections] = useState<string[]>([]);
  const [previewSections, setPreviewSections] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'expanded'>('expanded');
  const [showStoryComponentsOnly, setShowStoryComponentsOnly] = useState(true);
  const [showTypographyPreview, setShowTypographyPreview] = useState(false);
  const [typographyPreviewTab, setTypographyPreviewTab] = useState<'standard' | 'special'>('standard');
  const [rightPanel, setRightPanel] = useState<'map' | 'preview'>('preview');
  const [storyIndexEntries, setStoryIndexEntries] = useState<StoryIndexEntry[]>([]);

  // Preview-only state
  const [iframeStates, setIframeStates] = useState<Record<string, { loaded: boolean; error: boolean }>>({});
  const [storybookStatus, setStorybookStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewScale, setPreviewScale] = useState<number>(1);

  const normalizeComponentId = useCallback((value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ''), []);
  const previewSectionSet = useMemo(() => new Set(previewSections), [previewSections]);
  const orderedPreviewSections = useMemo(() => {
    const order = Object.keys(resolvedTokens ?? {});
    return order.filter((name) => previewSectionSet.has(name));
  }, [resolvedTokens, previewSectionSet]);
  const storyIdLookup = useMemo(() => {
    if (storyIndexEntries.length === 0) return storyIdByComponent;
    const dynamicLookup = buildStoryIdLookup(storyIndexEntries, normalizeComponentId);
    return { ...storyIdByComponent, ...dynamicLookup };
  }, [storyIndexEntries, normalizeComponentId]);

  const previewItems = useMemo(
    () =>
      orderedPreviewSections.map((name) => {
        const storyId = storyIdLookup[normalizeComponentId(name)];
        return {
          name,
          storyId,
          storyUrl: storyId
            ? `${storybookBaseUrl}/iframe.html?id=${storyId}&viewMode=story&globals=mode:${activeMode}`
            : null,
        };
      }),
    [orderedPreviewSections, activeMode, normalizeComponentId, storyIdLookup, storybookBaseUrl]
  );
  const previewStoryIds = useMemo(
    () => previewItems.map((item) => item.storyId).filter((id): id is string => Boolean(id)),
    [previewItems]
  );
  const previewStoryKey = previewStoryIds.join('|');
  const hasPreviewSections = orderedPreviewSections.length > 0 || showTypographyPreview;
  const hasStorybookStories = previewStoryIds.length > 0;
  const appliedScale = previewViewport === 'desktop' ? previewScale : 1;
  const previewFrameHeight = previewViewport === 'mobile' ? 720 : 520;
  const storybookHealthUrl = `${storybookBaseUrl}/iframe.html`;

  const scaleDown = () => setPreviewScale((c) => Math.max(minScale, Number((c - scaleStep).toFixed(2))));
  const scaleUp = () => setPreviewScale((c) => Math.min(maxScale, Number((c + scaleStep).toFixed(2))));

  const componentStorySet = useMemo(() => {
    const names = Object.keys(resolvedTokens ?? {});
    const set = new Set<string>();
    names.forEach((name) => {
      const storyId = storyIdLookup[normalizeComponentId(name)];
      if (storyId) set.add(name);
    });
    return set;
  }, [resolvedTokens, storyIdLookup, normalizeComponentId]);

  const checkStorybookHealth = useCallback(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2000);
    fetch(storybookHealthUrl, { method: 'HEAD', signal: controller.signal })
      .then((res) => setStorybookStatus(res.ok ? 'online' : 'offline'))
      .catch(() => setStorybookStatus('offline'))
      .finally(() => window.clearTimeout(timeout));
  }, [storybookHealthUrl]);

  useEffect(() => { void initializeTokens(); }, [initializeTokens]);

  useEffect(() => {
    const validSections = new Set(Object.keys(resolvedTokens ?? {}));
    setOpenSections((current) => current.filter((name) => validSections.has(name)));
    setPreviewSections((current) => current.filter((name) => validSections.has(name)));
  }, [resolvedTokens]);

  useEffect(() => {
    if (!showStoryComponentsOnly) return;
    setOpenSections((current) => current.filter((name) => componentStorySet.has(name)));
    setPreviewSections((current) => current.filter((name) => componentStorySet.has(name)));
  }, [showStoryComponentsOnly, componentStorySet]);

  useEffect(() => {
    if (rightPanel !== 'preview') return;
    if (!hasStorybookStories) { setIframeStates({}); setStorybookStatus('idle'); return; }
    setStorybookStatus('checking');
    checkStorybookHealth();
  }, [rightPanel, hasStorybookStories, checkStorybookHealth, previewStoryKey]);

  useEffect(() => {
    if (rightPanel !== 'preview') return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2000);
    const endpoints = [`${storybookBaseUrl}/index.json`, `${storybookBaseUrl}/stories.json`];

    const loadIndex = async () => {
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { signal: controller.signal });
          if (!response.ok) continue;
          const payload = await response.json();
          const entries = extractStoryEntries(payload);
          if (entries.length > 0) {
            if (!cancelled) setStoryIndexEntries(entries);
            return;
          }
        } catch {
          // ignore and try next endpoint
        }
      }
    };

    loadIndex().finally(() => window.clearTimeout(timeout));
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [rightPanel, storybookBaseUrl]);

  useEffect(() => {
    setIframeStates((current) => {
      const next: Record<string, { loaded: boolean; error: boolean }> = {};
      previewStoryIds.forEach((id) => { next[id] = current[id] ?? { loaded: false, error: false }; });
      return next;
    });
  }, [previewStoryKey, previewStoryIds]);

  return (
    <div className="min-h-screen p-8 bg-gray-100 font-[family-name:var(--font-geist-sans)] text-black">
      <TokenBridge />
      <ImportModal open={importOpen} onOpenChange={setImportOpen} />

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-4rem)]">

        {/* Left Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-visible">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">SDS-M Themer</h1>
            <details className="relative">
              <summary className="list-none [&::-webkit-details-marker]:hidden h-8 w-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <Settings className="w-4 h-4" />
                <span className="sr-only">Settings</span>
              </summary>
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg p-2 z-10">
                <button
                  type="button"
                  onClick={() => void resetToDefaultTokens()}
                  disabled={!hasChanges || isLoadingTokens}
                  className={`w-full text-left text-xs px-2 py-2 rounded transition-colors ${
                    hasChanges && !isLoadingTokens
                      ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      : 'text-gray-400 bg-gray-50 cursor-not-allowed'
                  }`}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => exportTokens()}
                  disabled={isLoadingTokens || Object.keys(resolvedTokens).length === 0}
                  className="w-full flex items-center gap-2 text-left text-xs text-gray-600 hover:text-green-600 px-2 py-2 rounded hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="w-full flex items-center gap-2 text-left text-xs text-gray-600 hover:text-blue-600 px-2 py-2 rounded hover:bg-blue-50 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import Tokens
                </button>
              </div>
            </details>
          </div>

          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              {loadError}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="theme-mode"
                    className="text-[10px] uppercase tracking-wide text-gray-400"
                  >
                    Theme
                  </label>
                  <div className="relative">
                    <select
                      id="theme-mode"
                      value={activeMode}
                      onChange={(event) => void setActiveMode(event.target.value)}
                      disabled={isLoadingTokens}
                      className="appearance-none text-[10px] uppercase tracking-wide px-2.5 pr-7 py-1 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {availableModes.map((mode) => (
                        <option key={mode.id} value={mode.id}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                {isLoadingTokens && (
                  <span className="text-[10px] text-gray-400 font-mono">Loading...</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search tokens, values, types..."
                    className="w-full text-xs pl-7 pr-3 py-2 rounded-md border border-gray-200 bg-white text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
                <details className="relative">
                  <summary className="list-none [&::-webkit-details-marker]:hidden h-8 w-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span className="sr-only">Filters</span>
                  </summary>
                  <div className="absolute right-0 mt-2 w-60 rounded-lg border border-gray-200 bg-white shadow-lg p-3 z-10">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">Search in</div>
                    <div className="flex items-center gap-1 mb-3">
                      <button
                        type="button"
                        onClick={() => setSearchScope('all')}
                        className={`px-2 py-1 rounded border transition-colors text-[10px] uppercase tracking-wide ${
                          searchScope === 'all'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        All groups
                      </button>
                      <button
                        type="button"
                        onClick={() => setSearchScope('expanded')}
                        className={`px-2 py-1 rounded border transition-colors text-[10px] uppercase tracking-wide ${
                          searchScope === 'expanded'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        Expanded only
                      </button>
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">Components</div>
                    <button
                      type="button"
                      onClick={() => setShowStoryComponentsOnly((current) => !current)}
                      className={`px-2 py-1 rounded border transition-colors text-[10px] uppercase tracking-wide ${
                        showStoryComponentsOnly
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      With story
                    </button>
                  </div>
                </details>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-visible p-4">
                <TokenAccordion
                  searchQuery={searchQuery}
                  searchScope={searchScope}
                  showStoryComponentsOnly={showStoryComponentsOnly}
                  componentStorySet={componentStorySet}
                  expandedSections={openSections}
                  previewSections={previewSections}
                  showTypographyPreview={showTypographyPreview}
                  onTypographyPreviewToggle={setShowTypographyPreview}
                  typographyPreviewTab={typographyPreviewTab}
                  onTypographyPreviewTabChange={setTypographyPreviewTab}
                  onSectionToggle={(name, isOpen) => {
                    setOpenSections((current) => {
                      if (isOpen) {
                      if (current.includes(name)) return current;
                      return [...current, name];
                    }
                    return current.filter((entry) => entry !== name);
                  });
                }}
                onPreviewToggle={(name, isVisible) => {
                  setPreviewSections((current) => {
                    if (isVisible) {
                      if (current.includes(name)) return current;
                      return [...current, name];
                    }
                    return current.filter((entry) => entry !== name);
                  });
                }}
              />
            </div>
          </div>

          <details className="mt-auto">
            <summary className="cursor-pointer text-xs text-gray-500 font-mono mb-2 select-none">Debug State</summary>
            <div className="h-32 bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto font-mono text-xs">
              <pre>{JSON.stringify({ raw: rawTokens ? JSON.parse(rawTokens) : null, resolved: resolvedTokens }, null, 2)}</pre>
            </div>
          </details>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          {/* Panel header with view toggle */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
            <button
              type="button"
              onClick={() => setRightPanel('map')}
              className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wide px-2 py-1 rounded border transition-colors ${
                rightPanel === 'map'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <GitBranch className="w-3 h-3" />
              Token Map
            </button>
            <button
              type="button"
              onClick={() => setRightPanel('preview')}
              className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wide px-2 py-1 rounded border transition-colors ${
                rightPanel === 'preview'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Monitor className="w-3 h-3" />
              Token Preview
            </button>

            {/* Preview-only controls */}
            {rightPanel === 'preview' && (
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded border transition-colors ${
                    previewViewport === 'desktop'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded border transition-colors ${
                    previewViewport === 'mobile'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Mobile
                </button>
                {previewViewport === 'desktop' && (
                  <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-gray-200">
                    <button
                      type="button"
                      onClick={scaleDown}
                      disabled={previewScale <= minScale}
                      className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                        previewScale <= minScale
                          ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      −
                    </button>
                    <span className="text-[10px] text-gray-500 font-mono w-10 text-center">
                      {Math.round(previewScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={scaleUp}
                      disabled={previewScale >= maxScale}
                      className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                        previewScale >= maxScale
                          ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-hidden">
            {rightPanel === 'map' ? (
              <TokenMap />
            ) : (
              <div className="h-full overflow-y-auto">
                {!hasPreviewSections ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="max-w-md text-center px-6">
                      <p className="text-sm font-semibold text-gray-800">No component selected</p>
                      <p className="mt-2 text-xs text-gray-500">
                        Use the Show button in the accordion to preview a component.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {showTypographyPreview && <TypographyRampPreview tab={typographyPreviewTab} />}
                    {previewItems.map((item) => {
                      const hasStory = Boolean(item.storyId);
                      const iframeState = hasStory ? iframeStates[item.storyId as string] : null;
                      const showLoading =
                        hasStory && (storybookStatus === 'checking' || (!iframeState?.loaded && storybookStatus === 'online'));
                      const showError = hasStory && (storybookStatus === 'offline' || iframeState?.error);

                      return (
                        <div key={item.name} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              {item.name}
                            </span>
                            {item.storyId ? (
                              <span className="text-[10px] text-gray-400 font-mono">Storybook</span>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-mono">No story</span>
                            )}
                          </div>
                          {item.storyUrl ? (
                            <div className="relative p-4">
                              <div
                                className={`w-full overflow-hidden ${
                                  previewViewport === 'mobile' ? 'max-w-[420px] mx-auto' : 'max-w-full'
                                }`}
                                style={{ height: previewFrameHeight }}
                              >
                                <iframe
                                  id={`storybook-preview-${item.storyId}`}
                                  src={item.storyUrl}
                                  title={`${item.name} Preview`}
                                  onLoad={() =>
                                    setIframeStates((current) => ({
                                      ...current,
                                      [item.storyId as string]: { loaded: true, error: false },
                                    }))
                                  }
                                  onError={() =>
                                    setIframeStates((current) => ({
                                      ...current,
                                      [item.storyId as string]: { loaded: false, error: true },
                                    }))
                                  }
                                  style={{
                                    width: `calc(100% / ${appliedScale})`,
                                    height: `calc(100% / ${appliedScale})`,
                                    transform: `scale(${appliedScale})`,
                                    transformOrigin: 'top left',
                                    border: 0,
                                  }}
                                />
                              </div>
                              {(showLoading || showError) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                                  <div className="max-w-md text-center px-6">
                                    {showLoading ? (
                                      <>
                                        <p className="text-sm font-semibold text-gray-800">Loading Storybook preview...</p>
                                        <p className="mt-2 text-xs text-gray-500">Switching modes and syncing tokens.</p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-sm font-semibold text-gray-800">Storybook preview unavailable</p>
                                        <p className="mt-2 text-xs text-gray-500">
                                          Start Storybook (<span className="font-mono">npm run storybook</span>) and make
                                          sure it is reachable at <span className="font-mono">{storybookOpenUrl}</span>.
                                        </p>
                                        <div className="mt-4 flex items-center justify-center gap-2">
                                          <button
                                            type="button"
                                            onClick={checkStorybookHealth}
                                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                                          >
                                            Retry
                                          </button>
                                          <a
                                            href={storybookOpenUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                                          >
                                            Open Storybook
                                          </a>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-6 text-center text-xs text-gray-500">
                              {item.name} doesn&#39;t have a Storybook story yet.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
