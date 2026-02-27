/** Shared TypeScript interfaces for the token system. */

export interface ShadowValue {
  x?: string;
  y?: string;
  blur?: string;
  spread?: string;
  color?: string;
}

export interface TypographyValue {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string;
}

export interface TokenLeaf {
  value: string | number | ShadowValue | ShadowValue[] | TypographyValue | Record<string, unknown>;
  type: string;
  description?: string;
}

/** A nested tree of token groups or leaves. */
export type TokenTree = {
  [key: string]: TokenLeaf | TokenTree;
};

export interface FlatToken {
  name: string;
  value: string | number | ShadowValue | ShadowValue[] | TypographyValue | Record<string, unknown>;
  type: string;
  originalValue: unknown;
  description?: string;
}

export type TokenStore = Record<string, unknown>;
