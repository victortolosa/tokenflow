import { create } from 'zustand';
import { resolveTokens } from '@/utils/token-engine';
import { fetchTokens, deepMerge } from '@/utils/token-utils';

const TOKEN_BASE_PATH = '/tokens/Snap%20Motif';

export const MODE_OPTIONS = [
  { id: 'primary', label: 'Primary', file: null },
  { id: 'secondary', label: 'Secondary', file: 'Secondary.json' },
  { id: 'tertiary', label: 'Tertiary', file: 'Tertiary.json' },
  { id: 'quaternary', label: 'Quart', file: 'Quaternary.json' },
] as const;

export type Mode = typeof MODE_OPTIONS[number]['id'];

const modeCache: Partial<Record<Mode, Record<string, any>>> = {};

async function loadBaseTokensForMode(mode: Mode) {
  if (modeCache[mode]) return modeCache[mode];

  const [globalTokens, primaryTokens] = await Promise.all([
    fetchTokens(`${TOKEN_BASE_PATH}/Global.json`),
    fetchTokens(`${TOKEN_BASE_PATH}/Primary.json`),
  ]);

  let merged = deepMerge(globalTokens, primaryTokens);

  const modeConfig = MODE_OPTIONS.find((option) => option.id === mode);
  if (modeConfig?.file) {
    const modeTokens = await fetchTokens(`${TOKEN_BASE_PATH}/${modeConfig.file}`);
    merged = deepMerge(merged, modeTokens);
  }

  modeCache[mode] = merged;
  return merged;
}

interface TokenStore {
  rawTokens: string;
  resolvedTokens: Record<string, any>;
  baseTokens: Record<string, any> | null;
  overrideTokens: Record<string, any> | null;
  isLoadingTokens: boolean;
  loadError: string | null;
  activeMode: Mode;
  availableModes: typeof MODE_OPTIONS;
  initializeTokens: () => Promise<void>;
  applyOverrideTokens: (tokens: Record<string, any>) => Promise<void>;
  resetToDefaultTokens: () => Promise<void>;
  setActiveMode: (mode: Mode) => Promise<void>;
  updateToken: (path: string, value: any) => void;
}

export const useTokenStore = create<TokenStore>((set, get) => ({
  rawTokens: '',
  resolvedTokens: {},
  baseTokens: null,
  overrideTokens: null,
  isLoadingTokens: false,
  loadError: null,
  activeMode: 'primary',
  availableModes: MODE_OPTIONS,
  initializeTokens: async () => {
    set({ isLoadingTokens: true, loadError: null });
    try {
      const baseTokens = await loadBaseTokensForMode(get().activeMode);
      if (get().overrideTokens) {
        set({ baseTokens, isLoadingTokens: false });
        return;
      }
      const resolved = await resolveTokens(baseTokens);
      set({
        baseTokens,
        resolvedTokens: resolved,
        overrideTokens: null,
        rawTokens: '',
        isLoadingTokens: false
      });
    } catch (error) {
      console.error(error);
      set({
        isLoadingTokens: false,
        loadError: 'Failed to load default tokens'
      });
    }
  },
  applyOverrideTokens: async (tokens) => {
    set({ isLoadingTokens: true, loadError: null });
    try {
      const baseTokens = get().baseTokens ?? await loadBaseTokensForMode(get().activeMode);
      const mergedTokens = deepMerge(baseTokens, tokens);
      const resolved = await resolveTokens(mergedTokens);
      set({
        baseTokens,
        overrideTokens: tokens,
        rawTokens: JSON.stringify(tokens, null, 2),
        resolvedTokens: resolved,
        isLoadingTokens: false
      });
    } catch (error) {
      console.error(error);
      set({
        isLoadingTokens: false,
        loadError: 'Failed to apply token overrides'
      });
      throw error;
    }
  },
  resetToDefaultTokens: async () => {
    set({ isLoadingTokens: true, loadError: null });
    try {
      const baseTokens = get().baseTokens ?? await loadBaseTokensForMode(get().activeMode);
      const resolved = await resolveTokens(baseTokens);
      set({
        baseTokens,
        overrideTokens: null,
        rawTokens: '',
        resolvedTokens: resolved,
        isLoadingTokens: false
      });
    } catch (error) {
      console.error(error);
      set({
        isLoadingTokens: false,
        loadError: 'Failed to reset tokens'
      });
      throw error;
    }
  },
  setActiveMode: async (mode) => {
    if (get().activeMode === mode) return;
    set({ activeMode: mode, isLoadingTokens: true, loadError: null });
    try {
      const baseTokens = await loadBaseTokensForMode(mode);
      const overrideTokens = get().overrideTokens;
      const mergedTokens = overrideTokens ? deepMerge(baseTokens, overrideTokens) : baseTokens;
      const resolved = await resolveTokens(mergedTokens);
      set({
        baseTokens,
        resolvedTokens: resolved,
        isLoadingTokens: false
      });
    } catch (error) {
      console.error(error);
      set({
        isLoadingTokens: false,
        loadError: 'Failed to load mode tokens'
      });
    }
  },
  updateToken: (path, value) => set((state) => {
    // Basic deep update or flat update depending on structure.
    // For now, let's assume flat keys for simplicity in the bridge, 
    // but resolvedTokens is likely nested from Style Dictionary.
    // We need to support path updates "color.primary.value".
    // Actually, SD output is usually nested.

    const newTokens = { ...state.resolvedTokens };
    // Helper to set nested value
    const keys = path.split('.');
    let current = newTokens;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) current[key] = {};
      current = current[key];
    }
    // If we are updating a leaf that is an object { value, type ... }, update value.
    // Or if it's a direct value.
    const lastKey = keys[keys.length - 1];

    if (typeof current[lastKey] === 'object' && current[lastKey] !== null && 'value' in current[lastKey]) {
      current[lastKey] = { ...current[lastKey], value };
    } else {
      current[lastKey] = value;
    }

    return { resolvedTokens: newTokens };
  }),
}));
