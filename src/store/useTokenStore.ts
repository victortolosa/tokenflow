import { create } from 'zustand';
import { resolveTokens } from '@/utils/token-engine';
import { fetchTokens, deepMerge } from '@/utils/token-utils';
import { buildExportTokens, downloadJson } from '@/utils/token-export';
import { areTokenValuesEqual, getTokenLeafAtPath, hasTokenDifferences } from '@/utils/token-diff';
import { guessTokenType } from '@/utils/token-format';

const TOKEN_BASE_PATH = '/tokens/Snap%20Motif';
const MAX_CACHE_SIZE = 10;
const OVERRIDE_STORAGE_PREFIX = 'tokenflow.overrides.';
const MODE_STORAGE_KEY = 'tokenflow.activeMode';
let globalTokenCache: Record<string, unknown> | null = null;
let updateSequence = 0;
const inFlightUpdates = new Map<string, unknown>();
let resolveTimer: ReturnType<typeof setTimeout> | null = null;
let resolveRequestId = 0;

export const MODE_OPTIONS = [
  { id: 'primary', label: 'Primary', file: null },
  { id: 'secondary', label: 'Secondary', file: 'Secondary.json' },
  { id: 'tertiary', label: 'Tertiary', file: 'Tertiary.json' },
  { id: 'quaternary', label: 'Quaternary', file: 'Quaternary.json' },
] as const;

export type Mode = typeof MODE_OPTIONS[number]['id'];

const MODE_CASCADE: Mode[] = ['primary', 'secondary', 'tertiary', 'quaternary'];
const MODE_FILES: Record<Mode, string> = {
  primary: 'Primary.json',
  secondary: 'Secondary.json',
  tertiary: 'Tertiary.json',
  quaternary: 'Quaternary.json',
};

const modeCache: Partial<Record<Mode, Record<string, unknown>>> = {};
const modeTokenCache: Partial<Record<Mode, Record<string, unknown>>> = {};

function isBrowser() {
  return typeof window !== 'undefined';
}

function getOverrideStorageKey(mode: Mode) {
  return `${OVERRIDE_STORAGE_PREFIX}${mode}`;
}

function readStoredMode(): Mode | null {
  if (!isBrowser()) return null;
  const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
  if (!stored) return null;
  const match = MODE_OPTIONS.find((option) => option.id === stored);
  return match ? (stored as Mode) : null;
}

function writeStoredMode(mode: Mode) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore persistence errors (storage quota, privacy mode, etc.)
  }
}

function readStoredOverrides(mode: Mode): Record<string, unknown> | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(getOverrideStorageKey(mode));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

function writeStoredOverrides(mode: Mode, tokens: Record<string, unknown>) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(getOverrideStorageKey(mode), JSON.stringify(tokens));
  } catch {
    // Ignore persistence errors (storage quota, privacy mode, etc.)
  }
}

function clearStoredOverrides(mode: Mode) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(getOverrideStorageKey(mode));
  } catch {
    // Ignore persistence errors (storage quota, privacy mode, etc.)
  }
}

function evictOldestCacheEntry() {
  const keys = Object.keys(modeCache) as Mode[];
  if (keys.length >= MAX_CACHE_SIZE && keys.length > 0) {
    delete modeCache[keys[0]];
  }
}

function getCascadeModes(mode: Mode): Mode[] {
  const index = MODE_CASCADE.indexOf(mode);
  if (index === -1) return [MODE_CASCADE[0]];
  return MODE_CASCADE.slice(0, index + 1);
}

async function loadModeTokens(mode: Mode): Promise<Record<string, unknown>> {
  if (modeTokenCache[mode]) return modeTokenCache[mode]!;
  const file = MODE_FILES[mode];
  const tokens = await fetchTokens(`${TOKEN_BASE_PATH}/${file}`);
  modeTokenCache[mode] = tokens;
  return tokens;
}

function mergeTokenLayers(layers: Record<string, unknown>[]): Record<string, unknown> {
  return layers.reduce((acc, layer) => deepMerge(acc, layer), {});
}

async function loadBaseTokensForMode(mode: Mode): Promise<Record<string, unknown>> {
  if (modeCache[mode]) return modeCache[mode]!;

  const globalTokens = await loadGlobalTokens();
  const cascadeModes = getCascadeModes(mode);
  const modeTokens = await Promise.all(cascadeModes.map(loadModeTokens));
  const merged = mergeTokenLayers([globalTokens, ...modeTokens]);

  evictOldestCacheEntry();
  modeCache[mode] = merged;
  return merged;
}

async function loadGlobalTokens(): Promise<Record<string, unknown>> {
  if (globalTokenCache) return globalTokenCache;
  const globalTokens = await fetchTokens(`${TOKEN_BASE_PATH}/Global.json`);
  globalTokenCache = globalTokens;
  return globalTokens;
}

function resolveOverrideLayer(
  mode: Mode,
  activeMode: Mode,
  activeOverride: Record<string, unknown> | null,
  includeActiveOverride: boolean
): Record<string, unknown> | null {
  if (mode === activeMode) {
    if (!includeActiveOverride) return null;
    return normalizeOverrides(activeOverride ?? readStoredOverrides(mode));
  }
  return normalizeOverrides(readStoredOverrides(mode));
}

async function buildMergedTokensForMode(
  mode: Mode,
  activeOverride: Record<string, unknown> | null,
  includeActiveOverride: boolean
): Promise<Record<string, unknown>> {
  const globalTokens = await loadGlobalTokens();
  const cascadeModes = getCascadeModes(mode);
  const modeTokens = await Promise.all(cascadeModes.map(loadModeTokens));
  const layers: Record<string, unknown>[] = [globalTokens];

  cascadeModes.forEach((cascadeMode, index) => {
    layers.push(modeTokens[index]);
    const overrideLayer = resolveOverrideLayer(cascadeMode, mode, activeOverride, includeActiveOverride);
    if (overrideLayer) layers.push(overrideLayer);
  });

  return mergeTokenLayers(layers);
}

function formatError(context: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `${context}: ${detail}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOverrides(tokens: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!tokens) return null;
  if (Object.keys(tokens).length === 0) return null;
  return tokens;
}

function removeTokenAtPath(tokens: Record<string, unknown>, path: string): Record<string, unknown> {
  const parts = path.split('.');

  const remove = (node: Record<string, unknown>, index: number): Record<string, unknown> => {
    if (!isPlainObject(node)) return node;
    const key = parts[index];
    if (!(key in node)) return node;

    const next = { ...node } as Record<string, unknown>;
    if (index === parts.length - 1) {
      delete next[key];
      return next;
    }

    const child = next[key];
    if (!isPlainObject(child)) return next;

    const updatedChild = remove(child as Record<string, unknown>, index + 1);
    if (isPlainObject(updatedChild) && Object.keys(updatedChild).length > 0) {
      next[key] = updatedChild;
    } else {
      delete next[key];
    }
    return next;
  };

  return remove(tokens, 0);
}

function scheduleResolve(
  getState: () => TokenStore,
  setState: (partial: Partial<TokenStore>) => void
) {
  if (resolveTimer) {
    clearTimeout(resolveTimer);
  }
  const requestId = ++resolveRequestId;
  resolveTimer = setTimeout(async () => {
    const state = getState();
    const { baseTokens, activeMode, overrideTokens, baselineResolvedTokens } = state;
    if (!baseTokens) return;
    try {
      const baselineTokens = await buildMergedTokensForMode(activeMode, overrideTokens, false);
      const baseline = baselineResolvedTokens ?? await resolveTokens(baselineTokens);
      const resolved = overrideTokens
        ? await resolveTokens(deepMerge(baselineTokens, overrideTokens))
        : baseline;
      if (requestId !== resolveRequestId) return;
      if (getState().activeMode !== activeMode) return;
      if (!hasTokenDifferences(getState().resolvedTokens, resolved)) return;
      setState({
        resolvedTokens: resolved,
        baselineResolvedTokens: baselineResolvedTokens ?? baseline,
        hasChanges: overrideTokens ? hasTokenDifferences(baseline, resolved) : false,
      });
      if (overrideTokens) {
        writeStoredOverrides(activeMode, overrideTokens);
      } else {
        clearStoredOverrides(activeMode);
      }
      writeStoredMode(activeMode);
    } catch (error) {
      console.error(error);
    }
  }, 40);
}

function updateTokenValueAtPath(
  tokens: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const newTokens = { ...tokens };
  const keys = path.split('.');
  let current: Record<string, unknown> = newTokens;

  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') current[key] = {};
    current[key] = { ...(current[key] as Record<string, unknown>) };
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  if (
    typeof current[lastKey] === 'object' &&
    current[lastKey] !== null &&
    'value' in (current[lastKey] as Record<string, unknown>)
  ) {
    current[lastKey] = { ...(current[lastKey] as Record<string, unknown>), value };
  } else {
    current[lastKey] = value;
  }

  return newTokens;
}

interface TokenStore {
  rawTokens: string;
  resolvedTokens: Record<string, unknown>;
  baselineResolvedTokens: Record<string, unknown> | null;
  baseTokens: Record<string, unknown> | null;
  globalTokens: Record<string, unknown> | null;
  overrideTokens: Record<string, unknown> | null;
  isLoadingTokens: boolean;
  loadError: string | null;
  activeMode: Mode;
  availableModes: typeof MODE_OPTIONS;
  hasChanges: boolean;
  componentTokenUsage: Record<string, string[]>;
  initializeTokens: () => Promise<void>;
  applyOverrideTokens: (tokens: Record<string, unknown>) => Promise<void>;
  resetToDefaultTokens: () => Promise<void>;
  setActiveMode: (mode: Mode) => Promise<void>;
  updateToken: (path: string, value: unknown) => void;
  resetToken: (path: string) => void;
  exportTokens: () => void;
  setComponentTokenUsage: (storyId: string, tokens: string[]) => void;
}

export const useTokenStore = create<TokenStore>((set, get) => ({
  rawTokens: '',
  resolvedTokens: {},
  baselineResolvedTokens: null,
  baseTokens: null,
  globalTokens: null,
  overrideTokens: null,
  isLoadingTokens: false,
  loadError: null,
  activeMode: 'primary',
  availableModes: MODE_OPTIONS,
  hasChanges: false,
  componentTokenUsage: {},
  initializeTokens: async () => {
    set({ isLoadingTokens: true, loadError: null });
    try {
      const currentMode = get().activeMode;
      const persistedMode = readStoredMode();
      const activeMode = persistedMode ?? currentMode;
      if (activeMode !== currentMode) {
        set({ activeMode });
      }
      const baseTokens = await loadBaseTokensForMode(activeMode);
      const globalTokens = get().globalTokens ?? await loadGlobalTokens();
      const overrideTokens = normalizeOverrides(
        currentMode === activeMode ? (get().overrideTokens ?? readStoredOverrides(activeMode)) : readStoredOverrides(activeMode)
      );

      const baselineTokens = await buildMergedTokensForMode(activeMode, overrideTokens, false);
      const baselineResolvedTokens = await resolveTokens(baselineTokens);

      const resolved = overrideTokens
        ? await resolveTokens(deepMerge(baselineTokens, overrideTokens))
        : baselineResolvedTokens;

      set({
        baseTokens,
        globalTokens,
        overrideTokens,
        rawTokens: overrideTokens ? JSON.stringify(overrideTokens, null, 2) : '',
        resolvedTokens: resolved,
        baselineResolvedTokens,
        hasChanges: overrideTokens ? hasTokenDifferences(baselineResolvedTokens, resolved) : false,
        isLoadingTokens: false
      });
    } catch (error) {
      console.error(error);
      set({
        isLoadingTokens: false,
        loadError: formatError('Failed to load default tokens', error),
      });
    }
  },
  applyOverrideTokens: async (tokens) => {
    set({ isLoadingTokens: true, loadError: null });
    try {
      const activeMode = get().activeMode;
      const baseTokens = get().baseTokens ?? await loadBaseTokensForMode(activeMode);
      const globalTokens = get().globalTokens ?? await loadGlobalTokens();
      const baselineTokens = await buildMergedTokensForMode(activeMode, tokens, false);
      const baselineResolvedTokens = await resolveTokens(baselineTokens);
      const resolved = await resolveTokens(deepMerge(baselineTokens, tokens));
      set({
        baseTokens,
        globalTokens,
        overrideTokens: tokens,
        rawTokens: JSON.stringify(tokens, null, 2),
        resolvedTokens: resolved,
        baselineResolvedTokens,
        hasChanges: hasTokenDifferences(baselineResolvedTokens, resolved),
        isLoadingTokens: false
      });
      writeStoredOverrides(activeMode, tokens);
      writeStoredMode(activeMode);
    } catch (error) {
      console.error(error);
      set({
        isLoadingTokens: false,
        loadError: formatError('Failed to apply token overrides', error),
      });
      throw error;
    }
  },
  resetToDefaultTokens: async () => {
    set({ isLoadingTokens: true, loadError: null });
    try {
      const activeMode = get().activeMode;
      const baseTokens = get().baseTokens ?? await loadBaseTokensForMode(activeMode);
      const globalTokens = get().globalTokens ?? await loadGlobalTokens();
      const baselineTokens = await buildMergedTokensForMode(activeMode, null, false);
      const resolved = await resolveTokens(baselineTokens);
      set({
        baseTokens,
        globalTokens,
        overrideTokens: null,
        rawTokens: '',
        resolvedTokens: resolved,
        baselineResolvedTokens: resolved,
        hasChanges: false,
        isLoadingTokens: false
      });
      clearStoredOverrides(activeMode);
      writeStoredMode(activeMode);
    } catch (error) {
      console.error(error);
      set({
        isLoadingTokens: false,
        loadError: formatError('Failed to reset tokens', error),
      });
      throw error;
    }
  },
  setActiveMode: async (mode) => {
    if (get().activeMode === mode) return;
    // Clear overrides when switching modes to avoid stale cross-mode overrides
    set({ activeMode: mode, overrideTokens: null, rawTokens: '', isLoadingTokens: true, loadError: null });
    writeStoredMode(mode);
    try {
      const baseTokens = await loadBaseTokensForMode(mode);
      const globalTokens = get().globalTokens ?? await loadGlobalTokens();
      const overrideTokens = normalizeOverrides(readStoredOverrides(mode));
      const baselineTokens = await buildMergedTokensForMode(mode, overrideTokens, false);
      const baselineResolvedTokens = await resolveTokens(baselineTokens);
      const resolved = overrideTokens
        ? await resolveTokens(deepMerge(baselineTokens, overrideTokens))
        : baselineResolvedTokens;
      set({
        baseTokens,
        globalTokens,
        overrideTokens,
        rawTokens: overrideTokens ? JSON.stringify(overrideTokens, null, 2) : '',
        resolvedTokens: resolved,
        baselineResolvedTokens,
        hasChanges: overrideTokens ? hasTokenDifferences(baselineResolvedTokens, resolved) : false,
        isLoadingTokens: false
      });
    } catch (error) {
      console.error(error);
      set({
        isLoadingTokens: false,
        loadError: formatError(`Failed to load ${mode} mode tokens`, error),
      });
    }
  },
  updateToken: (path, value) => {
    const inFlightValue = inFlightUpdates.get(path);
    if (inFlightUpdates.has(path) && areTokenValuesEqual(inFlightValue, value)) {
      return;
    }
    inFlightUpdates.set(path, value);
    queueMicrotask(() => {
      if (inFlightUpdates.has(path) && areTokenValuesEqual(inFlightUpdates.get(path), value)) {
        inFlightUpdates.delete(path);
      }
    });

    const sequence = ++updateSequence;
    const state = get();
    const { baseTokens, baselineResolvedTokens, activeMode } = state;
    if (!baseTokens) return;

    const currentResolved = getTokenLeafAtPath(state.resolvedTokens, path);
    if (currentResolved && areTokenValuesEqual(currentResolved.value, value)) {
      return;
    }

    const currentOverrides = state.overrideTokens ?? {};
    const existingOverride = getTokenLeafAtPath(currentOverrides, path);
    const baseLeaf = getTokenLeafAtPath(baseTokens, path);
    if (existingOverride && areTokenValuesEqual(existingOverride.value, value)) {
      return;
    }
    const nextOverrides = existingOverride
      ? updateTokenValueAtPath(currentOverrides, path, value)
      : updateTokenValueAtPath(
          currentOverrides,
          path,
          baseLeaf ? { ...baseLeaf, value } : { value, type: guessTokenType(path, value) }
        );
    const normalizedOverrides = normalizeOverrides(nextOverrides);
    const rawTokens = normalizedOverrides ? JSON.stringify(normalizedOverrides, null, 2) : '';

    const optimisticResolved = updateTokenValueAtPath(state.resolvedTokens, path, value);
    const optimisticHasChanges = baselineResolvedTokens
      ? hasTokenDifferences(baselineResolvedTokens, optimisticResolved)
      : state.hasChanges;

    set({
      resolvedTokens: optimisticResolved,
      hasChanges: optimisticHasChanges,
      overrideTokens: normalizedOverrides,
      rawTokens,
    });

    if (sequence === updateSequence && get().activeMode === activeMode) {
      scheduleResolve(get, set);
    }
  },
  resetToken: (path) => {
    const sequence = ++updateSequence;
    const state = get();
    const { baseTokens, baselineResolvedTokens, activeMode } = state;
    if (!baseTokens) return;

    const baselineToken = getTokenLeafAtPath(baselineResolvedTokens, path);
    if (!baselineToken) return;

    const currentOverrides = state.overrideTokens ?? {};
    const nextOverrides = removeTokenAtPath(currentOverrides, path);
    const normalizedOverrides = normalizeOverrides(nextOverrides);
    const rawTokens = normalizedOverrides ? JSON.stringify(normalizedOverrides, null, 2) : '';

    const optimisticResolved = updateTokenValueAtPath(state.resolvedTokens, path, baselineToken.value);
    const optimisticHasChanges = baselineResolvedTokens
      ? hasTokenDifferences(baselineResolvedTokens, optimisticResolved)
      : state.hasChanges;

    set({
      resolvedTokens: optimisticResolved,
      hasChanges: optimisticHasChanges,
      overrideTokens: normalizedOverrides,
      rawTokens,
    });

    if (sequence === updateSequence && get().activeMode === activeMode) {
      scheduleResolve(get, set);
    }
  },
  exportTokens: () => {
    const { baseTokens, resolvedTokens, activeMode } = get();
    if (!baseTokens) return;
    const exported = buildExportTokens(baseTokens, resolvedTokens);
    downloadJson(exported, `tokens-${activeMode}.json`);
  },
  setComponentTokenUsage: (storyId, tokens) =>
    set((state) => ({ componentTokenUsage: { ...state.componentTokenUsage, [storyId]: tokens } })),
}));
