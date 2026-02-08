# Design Tokens -> Storybook CSS

This document is written for both humans and LLMs. It defines the **source of truth** for design tokens and the **repeatable procedure** for transforming them into CSS for Storybook.

## Source of Truth

- **Tokens live in `public/tokens/`** and are exported as Tokens Studio JSON.
- Storybook serves `public/` via `.storybook/main.ts` (`staticDirs: ["../public"]`), so tokens are reachable at runtime.

## Transformer (Storybook)

The transformer is the **Storybook decorator** in `.storybook/preview.tsx` (`TokenReceiver`). It:

1. **Fetches tokens** from `public/tokens` using `fetchTokens()` from `src/utils/token-utils.ts`.
2. **Merges layers**: `Global.json` + `Primary.json`, and an optional theme override.
3. **Flattens tokens** with `flattenTokens()` into `{ name, value, type }` entries.
4. **Converts token values to CSS**, including special handling for complex types (ex: `boxShadow`).
5. **Sets CSS custom properties** on `document.documentElement`:
   - Dots in token names become dashes.
   - Variables are prefixed with `--` (unless already present).
   - A short-name legacy variable is also set for backwards compatibility.
6. **Listens for live updates** (`UPDATE_TOKEN`) and writes updated CSS variables.

## Formal Procedure (Repeatable)

1. **Add or update tokens** in `public/tokens/<System>/`.
2. **Keep `$metadata.json` and `$themes.json`** in `public/tokens/` if you are using Tokens Studio exports.
3. **Ensure theme names are consistent**:
   - Storybook uses `theme` global types in `.storybook/preview.tsx`.
   - Theme filenames are derived from the toolbar value (capitalized).
   - If a folder name contains spaces, **URL-encode** in fetch paths (ex: `Snap%20Motif`).
4. **Update the transformer when introducing new token types**:
   - Edit `toCssValue()` in `.storybook/preview.tsx`.
   - Ensure complex tokens are converted to valid CSS strings.
5. **Use CSS variables in stories and components**:
   - Reference tokens via `var(--token-name)`.
   - The variable name is based on the flattened token name with dots replaced by dashes.
6. **If the app sends live updates**, ensure the `UPDATE_TOKEN` payload uses:
   - `name`: the CSS variable name **without** the `--` prefix (the receiver adds it).
   - `value`: already in a CSS-ready string format.

## Do / Don’t

- **Do** keep design tokens in `public/tokens/` and let Storybook consume them as static assets.
- **Do** route tokens through the transformer so CSS custom properties stay consistent.
- **Don’t** import token JSON directly into Storybook components.
- **Don’t** hardcode token values in CSS when the transformer can provide variables.

## Code Anchors

- Transformer: `.storybook/preview.tsx`
- Token utils: `src/utils/token-utils.ts`
- Storybook static assets: `.storybook/main.ts`
- Token source of truth: `public/tokens/`
