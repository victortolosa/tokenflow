import { create } from 'zustand';

interface TokenStore {
  rawTokens: string;
  resolvedTokens: Record<string, any>;
  buttonBorderRadius: number;
  setRawTokens: (tokens: string) => void;
  setResolvedTokens: (tokens: Record<string, any>) => void;
  setButtonBorderRadius: (value: number) => void;
  updateToken: (path: string, value: any) => void;
}

export const useTokenStore = create<TokenStore>((set) => ({
  rawTokens: '',
  resolvedTokens: {},
  buttonBorderRadius: 16,
  setRawTokens: (tokens) => set({ rawTokens: tokens }),
  setResolvedTokens: (tokens) => set({ resolvedTokens: tokens }),
  setButtonBorderRadius: (value) => set({ buttonBorderRadius: value }),
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
