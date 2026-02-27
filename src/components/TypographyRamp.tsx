'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useTokenStore } from '@/store/useTokenStore';
import { isTokenLeaf, toCssValue } from '@/utils/token-format';
import type { TokenLeaf } from '@/utils/token-types';

const REM_BASE = 16;
const NODE_RADIUS_PX = 8;
const BEZIER_PRESETS = [
  { label: 'Linear', x1: 0, y1: 0, x2: 1, y2: 1 },
  { label: 'Ease', x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
  { label: 'Ease In', x1: 0.42, y1: 0, x2: 1, y2: 1 },
  { label: 'Ease Out', x1: 0, y1: 0, x2: 0.58, y2: 1 },
  { label: 'Ease In Out', x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  { label: 'Sharp', x1: 0.33, y1: 0, x2: 0.67, y2: 0.2 },
] as const;

type VariantKey = 'desktop' | 'mobile' | 'compact' | 'base';

interface VariantData {
  key: VariantKey;
  path: string;
  rem: number | null;
}

interface TypographyGroup {
  key: string;
  label: string;
  variants: Partial<Record<VariantKey, VariantData>>;
  baseKey: VariantKey | null;
  baseRem: number | null;
  modifiers: Partial<Record<'mobile' | 'compact', number>>;
  sortValue: number;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function cubicBezierAt(x1: number, y1: number, x2: number, y2: number, t: number): number {
  if (x1 === y1 && x2 === y2) return t;
  const sampleCurve = (u: number, p1: number, p2: number) => {
    const inv = 1 - u;
    return 3 * inv * inv * u * p1 + 3 * inv * u * u * p2 + u * u * u;
  };
  const sampleCurveDerivative = (u: number, p1: number, p2: number) => {
    const inv = 1 - u;
    return 3 * inv * inv * p1 + 6 * inv * u * (p2 - p1) + 3 * u * u * (1 - p2);
  };

  let u = t;
  for (let i = 0; i < 6; i += 1) {
    const x = sampleCurve(u, x1, x2) - t;
    const dx = sampleCurveDerivative(u, x1, x2);
    if (Math.abs(x) < 1e-5 || Math.abs(dx) < 1e-5) break;
    u = clamp01(u - x / dx);
  }

  let lower = 0;
  let upper = 1;
  for (let i = 0; i < 8; i += 1) {
    const x = sampleCurve(u, x1, x2);
    if (Math.abs(x - t) < 1e-5) break;
    if (x < t) lower = u;
    else upper = u;
    u = (lower + upper) / 2;
  }

  return sampleCurve(u, y1, y2);
}

function parseRemValue(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value / REM_BASE;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.endsWith('rem')) {
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (trimmed.endsWith('px')) {
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed / REM_BASE : null;
  }
  if (/^[0-9.]+$/.test(trimmed)) {
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed / REM_BASE : null;
  }
  return null;
}

function formatRemValue(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  let text = rounded.toString();
  if (text.includes('.')) {
    text = text.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }
  return `${text}rem`;
}

function formatNumber(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '';
  const rounded = Math.round(value * 1000) / 1000;
  return rounded.toString();
}

function formatGroupLabel(key: string): string {
  const trimmed = key.replace(/^--/, '');
  if (/^[hp]\d+$/i.test(trimmed)) return trimmed.toUpperCase();
  if (trimmed === 'text') return 'Text';
  if (trimmed === 'action') return 'Action';
  if (trimmed === 'annotation') return 'Annotation';
  if (trimmed === 'stats') return 'Stats';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatGroupShortLabel(key: string): string {
  const trimmed = key.replace(/^--/, '');
  if (/^[hp]\d+$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^p\d+$/i.test(trimmed)) return trimmed.toUpperCase();
  if (trimmed === 'text') return 'Text';
  if (trimmed === 'action') return 'Act';
  if (trimmed === 'annotation') return 'Note';
  if (trimmed === 'stats') return 'Stats';
  if (trimmed.length <= 4) return trimmed.toUpperCase();
  return trimmed.slice(0, 3).toUpperCase();
}

function getStableSide(key: string): boolean {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2 === 0;
}

function parseTypographyTokenName(name: string): { groupKey: string; variant: VariantKey } | null {
  const compactMatch = name.match(/^--(.+)-desktop-font-size-compact$/);
  if (compactMatch) {
    return { groupKey: compactMatch[1], variant: 'compact' };
  }
  const variantMatch = name.match(/^--(.+)-(desktop|mobile)-font-size$/);
  if (variantMatch) {
    return { groupKey: variantMatch[1], variant: variantMatch[2] as VariantKey };
  }
  const baseMatch = name.match(/^--(.+)-font-size$/);
  if (baseMatch) {
    return { groupKey: baseMatch[1], variant: 'base' };
  }
  return null;
}

function buildTypographyGroups(resolvedTokens: Record<string, unknown> | null): TypographyGroup[] {
  if (!resolvedTokens || typeof resolvedTokens !== 'object') return [];
  const rootTokens = (resolvedTokens as Record<string, unknown>).Root;
  if (!rootTokens || typeof rootTokens !== 'object') return [];

  const groups = new Map<string, { key: string; label: string; variants: Partial<Record<VariantKey, VariantData>> }>();

  Object.entries(rootTokens as Record<string, unknown>).forEach(([tokenName, tokenValue]) => {
    if (!isTokenLeaf(tokenValue)) return;
    const token = tokenValue as TokenLeaf;
    if (token.type !== 'fontSizes') return;

    const parsed = parseTypographyTokenName(tokenName);
    if (!parsed) return;

    const { groupKey, variant } = parsed;
    const remValue = parseRemValue(token.value);
    const path = `Root.${tokenName}`;

    const group = groups.get(groupKey) ?? {
      key: groupKey,
      label: formatGroupLabel(groupKey),
      variants: {}
    };

    group.variants[variant] = {
      key: variant,
      path,
      rem: remValue
    };

    groups.set(groupKey, group);
  });

  const finalized: TypographyGroup[] = [];

  groups.forEach((group) => {
    const baseKey: VariantKey | null =
      group.variants.desktop
        ? 'desktop'
        : group.variants.base
          ? 'base'
          : group.variants.mobile
            ? 'mobile'
            : group.variants.compact
              ? 'compact'
              : null;

    const baseRem = baseKey ? group.variants[baseKey]?.rem ?? null : null;

    const modifiers: Partial<Record<'mobile' | 'compact', number>> = {};
    if (baseRem != null) {
      if (group.variants.mobile && baseKey !== 'mobile' && group.variants.mobile.rem != null) {
        modifiers.mobile = group.variants.mobile.rem - baseRem;
      }
      if (group.variants.compact && baseKey !== 'compact' && group.variants.compact.rem != null) {
        modifiers.compact = group.variants.compact.rem - baseRem;
      }
    }

    finalized.push({
      key: group.key,
      label: group.label,
      variants: group.variants,
      baseKey,
      baseRem,
      modifiers,
      sortValue: baseRem ?? Number.NEGATIVE_INFINITY
    });
  });

  finalized.sort((a, b) => b.sortValue - a.sortValue);
  return finalized;
}

function getRootTokenValue(root: Record<string, unknown> | null, name: string): string | null {
  if (!root || typeof root !== 'object') return null;
  const token = root[name];
  if (!token) return null;
  if (isTokenLeaf(token)) return toCssValue(token);
  return typeof token === 'string' || typeof token === 'number' ? String(token) : null;
}

function resolveTypographyStyle(group: TypographyGroup, root: Record<string, unknown> | null): CSSProperties {
  const variantOrder =
    group.baseKey === 'mobile'
      ? (['mobile', 'base', 'desktop'] as const)
      : group.baseKey === 'base'
        ? (['base', 'desktop', 'mobile'] as const)
        : (['desktop', 'base', 'mobile'] as const);

  const resolveVariantToken = (suffix: string): string | null => {
    for (const variant of variantOrder) {
      const name =
        variant === 'base'
          ? `--${group.key}-${suffix}`
          : `--${group.key}-${variant}-${suffix}`;
      const value = getRootTokenValue(root, name);
      if (value != null) return value;
    }
    return null;
  };

  const fontFamily =
    getRootTokenValue(root, `--${group.key}-font-family`) ??
    getRootTokenValue(root, '--font-family');

  return {
    fontFamily: fontFamily ?? undefined,
    fontWeight: resolveVariantToken('font-weight') ?? undefined,
    lineHeight: resolveVariantToken('font-line-height') ?? undefined,
    letterSpacing: resolveVariantToken('font-letter-spacing') ?? undefined,
    textTransform: resolveVariantToken('font-text-transform') ?? undefined,
    textDecoration: resolveVariantToken('font-text-decoration') ?? undefined,
  } as CSSProperties;
}

export function TypographyRamp({
  showPreview = false,
  onTogglePreview,
  previewTab = 'standard',
  onPreviewTabChange,
}: {
  showPreview?: boolean;
  onTogglePreview?: (next: boolean) => void;
  previewTab?: 'standard' | 'special';
  onPreviewTabChange?: (tab: 'standard' | 'special') => void;
} = {}) {
  const { resolvedTokens, updateToken, resetToken, isLoadingTokens } = useTokenStore();
  const groups = useMemo(() => buildTypographyGroups(resolvedTokens), [resolvedTokens]);
  const [activeTab, setActiveTab] = useState<'standard' | 'special'>(previewTab);
  const [curve, setCurve] = useState(() => ({ ...BEZIER_PRESETS[0] }));
  const [curveLabel, setCurveLabel] = useState(BEZIER_PRESETS[0].label);
  const curveRef = useRef<HTMLDivElement | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'p1' | 'p2' | null>(null);
  const [curveMenuOpen, setCurveMenuOpen] = useState(false);
  const curveButtonRef = useRef<HTMLButtonElement | null>(null);
  const curveMenuRef = useRef<HTMLDivElement | null>(null);
  const [curveMenuPosition, setCurveMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const isStandardGroup = (group: TypographyGroup) => {
    const key = group.key.replace(/^--/, '').toLowerCase();
    return /^h[1-6]$/.test(key) || /^p[1-4]$/.test(key);
  };
  const filteredGroups = useMemo(
    () => groups.filter((group) => (activeTab === 'standard' ? isStandardGroup(group) : !isStandardGroup(group))),
    [groups, activeTab]
  );
  const curvePath = useMemo(() => {
    const x1 = curve.x1 * 100;
    const y1 = (1 - curve.y1) * 100;
    const x2 = curve.x2 * 100;
    const y2 = (1 - curve.y2) * 100;
    return `M 0 100 C ${x1} ${y1}, ${x2} ${y2}, 100 0`;
  }, [curve]);
  const baseValues = useMemo(
    () => filteredGroups.map((group) => group.baseRem).filter((value): value is number => value != null),
    [filteredGroups]
  );
  const modifierGroups = useMemo(
    () => groups.filter((group) => Boolean(group.variants.mobile || group.variants.compact)),
    [groups]
  );

  const [rampMin, setRampMin] = useState<number | ''>('');
  const [rampMax, setRampMax] = useState<number | ''>('');
  const [rampTouched, setRampTouched] = useState(false);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackHeight, setTrackHeight] = useState(0);

  useEffect(() => {
    if (rampTouched || baseValues.length === 0) return;
    const minValue = Math.min(...baseValues);
    const maxValue = Math.max(...baseValues);
    setRampMin(Math.round(minValue * 1000) / 1000);
    setRampMax(Math.round(maxValue * 1000) / 1000);
  }, [baseValues, rampTouched]);

  const fallbackMin = baseValues.length > 0 ? Math.min(...baseValues) : 1;
  const fallbackMax = baseValues.length > 0 ? Math.max(...baseValues) : fallbackMin + 1;
  const rawMin = typeof rampMin === 'number' && Number.isFinite(rampMin) ? rampMin : fallbackMin;
  const rawMax = typeof rampMax === 'number' && Number.isFinite(rampMax) ? rampMax : fallbackMax;
  const effectiveMin = Math.min(rawMin, rawMax);
  const effectiveMax = Math.max(rawMin, rawMax);
  const range = effectiveMax - effectiveMin;

  const positionPercent = (value: number | null): number => {
    if (value == null) return 50;
    if (range <= 0) return 50;
    const clamped = clamp(value, effectiveMin, effectiveMax);
    const ratio = (clamped - effectiveMin) / range;
    if (trackHeight > 0) {
      const safeHeight = Math.max(trackHeight - NODE_RADIUS_PX * 2, 1);
      const offset = NODE_RADIUS_PX + (1 - ratio) * safeHeight;
      return (offset / trackHeight) * 100;
    }
    return (1 - ratio) * 100;
  };

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setTrackHeight(rect.height);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setDragOrder(null);
  }, [activeTab]);

  useEffect(() => {
    setActiveTab(previewTab);
  }, [previewTab]);

  useEffect(() => {
    if (!curveMenuOpen) return;
    const updatePosition = () => {
      const anchor = curveButtonRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = 288;
      const height = 360;
      const margin = 12;
      let left = rect.right - width;
      if (left < margin) left = margin;
      if (left + width > window.innerWidth - margin) {
        left = window.innerWidth - width - margin;
      }
      let top = rect.bottom + 8;
      if (top + height > window.innerHeight - margin) {
        top = rect.top - height - 8;
      }
      if (top < margin) top = margin;
      setCurveMenuPosition({ top, left });
    };
    updatePosition();
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (curveMenuRef.current?.contains(target)) return;
      if (curveButtonRef.current?.contains(target)) return;
      setCurveMenuOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCurveMenuOpen(false);
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [curveMenuOpen]);

  const updateFromPointer = (group: TypographyGroup, clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.height <= 0) return;
    const safeHeight = Math.max(rect.height - NODE_RADIUS_PX * 2, 1);
    const relative = clamp((clientY - rect.top - NODE_RADIUS_PX) / safeHeight, 0, 1);
    const ratio = 1 - relative;
    const nextRem = effectiveMin + ratio * (effectiveMax - effectiveMin);
    const rounded = Math.round(nextRem * 1000) / 1000;
    applyBaseValue(group, rounded);
  };

  const applyPreset = (preset: typeof BEZIER_PRESETS[number]) => {
    setCurve({ ...preset });
    setCurveLabel(preset.label);
  };

  const updateCurvePoint = (handle: 'p1' | 'p2', clientX: number, clientY: number) => {
    const rect = curveRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp01((clientX - rect.left) / rect.width);
    const y = clamp01(1 - (clientY - rect.top) / rect.height);
    setCurve((current) => ({
      ...current,
      ...(handle === 'p1' ? { x1: x, y1: y } : { x2: x, y2: y }),
    }));
    if (curveLabel !== 'Custom') setCurveLabel('Custom');
  };

  const applyBaseValue = (group: TypographyGroup, nextRem: number) => {
    if (!group.baseKey) return;
    const baseVariant = group.variants[group.baseKey];
    if (!baseVariant) return;

    updateToken(baseVariant.path, formatRemValue(nextRem));

    if (group.variants.mobile && group.baseKey !== 'mobile') {
      const modifier = group.modifiers.mobile ?? 0;
      updateToken(group.variants.mobile.path, formatRemValue(nextRem + modifier));
    }

    if (group.variants.compact && group.baseKey !== 'compact') {
      const modifier = group.modifiers.compact ?? 0;
      updateToken(group.variants.compact.path, formatRemValue(nextRem + modifier));
    }
  };

  const handleModifierChange = (group: TypographyGroup, variant: 'mobile' | 'compact', nextValue: number) => {
    if (group.baseRem == null) return;
    const target = group.variants[variant];
    if (!target) return;
    updateToken(target.path, formatRemValue(group.baseRem + nextValue));
  };

  const handleApplyRamp = () => {
    if (filteredGroups.length === 0) return;
    const steps = filteredGroups.length > 1 ? filteredGroups.length - 1 : 1;
    filteredGroups.forEach((group, index) => {
      const ratio = steps === 0 ? 0 : index / steps;
      const eased = cubicBezierAt(curve.x1, curve.y1, curve.x2, curve.y2, ratio);
      const nextRem = effectiveMax - eased * (effectiveMax - effectiveMin);
      applyBaseValue(group, nextRem);
    });
  };

  const handleResetRamp = () => {
    const paths = new Set<string>();
    filteredGroups.forEach((group) => {
      Object.values(group.variants).forEach((variant) => {
        if (!variant?.path) return;
        paths.add(variant.path);
      });
    });
    paths.forEach((path) => resetToken(path));
  };

  const displayGroups = useMemo(() => {
    if (!dragOrder || dragOrder.length === 0) return filteredGroups;
    const map = new Map(filteredGroups.map((group) => [group.key, group]));
    return dragOrder.map((key) => map.get(key)).filter((group): group is TypographyGroup => Boolean(group));
  }, [filteredGroups, dragOrder]);

  if (groups.length === 0 && !isLoadingTokens) {
    return (
      <details className="group border border-gray-200 rounded-lg bg-white">
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 rounded-lg flex items-center justify-between">
          <span>Typography</span>
          <span className="text-[10px] text-gray-400 group-open:hidden">Expand</span>
          <span className="text-[10px] text-gray-400 hidden group-open:inline">Collapse</span>
        </summary>
        <div className="p-3 text-xs text-gray-400">
          No typography font-size tokens found in the current set.
        </div>
      </details>
    );
  }

  return (
    <details className="group border border-gray-200 rounded-lg bg-white">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 rounded-lg flex items-center justify-between">
        <span>Typography</span>
        <span className="text-[10px] text-gray-400 group-open:hidden">Expand</span>
        <span className="text-[10px] text-gray-400 hidden group-open:inline">Collapse</span>
      </summary>
      <div className="p-3 space-y-3">
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Type ramp</div>
              <p className="text-[11px] text-gray-500 mt-1">
                Drag dots or labels to set size. Hover a label to edit the rem value.
              </p>
            </div>
            {onTogglePreview && (
              <button
                type="button"
                onClick={() => onTogglePreview(!showPreview)}
                className={`text-[9px] uppercase tracking-wide px-2 py-0.5 rounded border transition-colors ${
                  showPreview
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}
                aria-pressed={showPreview}
              >
                {showPreview ? 'Hide' : 'Show'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('standard');
                  onPreviewTabChange?.('standard');
                }}
                className={`text-[10px] uppercase tracking-wide px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'standard'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-pressed={activeTab === 'standard'}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('special');
                  onPreviewTabChange?.('special');
                }}
                className={`text-[10px] uppercase tracking-wide px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'special'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-pressed={activeTab === 'special'}
              >
                Special
              </button>
            </div>
            <span className="text-[10px] text-gray-400">
              {filteredGroups.length} styles
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-1">
              <label className="text-[10px] uppercase tracking-wide text-gray-400">Min</label>
              <input
                type="number"
                step="0.01"
                value={rampMin}
                onChange={(event) => {
                  setRampTouched(true);
                  setRampMin(event.target.value === '' ? '' : Number(event.target.value));
                }}
                className="w-20 text-xs p-1 border rounded bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-400">rem</span>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] uppercase tracking-wide text-gray-400">Max</label>
              <input
                type="number"
                step="0.01"
                value={rampMax}
                onChange={(event) => {
                  setRampTouched(true);
                  setRampMax(event.target.value === '' ? '' : Number(event.target.value));
                }}
                className="w-20 text-xs p-1 border rounded bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-400">rem</span>
            </div>
            <button
              type="button"
              onClick={handleApplyRamp}
              disabled={filteredGroups.length === 0}
              className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded border transition-colors ${
                filteredGroups.length === 0
                  ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                  : 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
              }`}
            >
              Distribute
            </button>
            <button
              type="button"
              onClick={handleResetRamp}
              disabled={filteredGroups.length === 0}
              className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded border transition-colors ${
                filteredGroups.length === 0
                  ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Reset
            </button>
            <button
              ref={curveButtonRef}
              type="button"
              onClick={() => setCurveMenuOpen((current) => !current)}
              className="text-[10px] uppercase tracking-wide px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
              aria-expanded={curveMenuOpen}
            >
              Curve
            </button>
            {curveMenuOpen && typeof document !== 'undefined' && createPortal(
              <div
                ref={curveMenuRef}
                className="fixed w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-3 z-[100]"
                style={{ top: curveMenuPosition.top, left: curveMenuPosition.left }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">Distribution curve</div>
                  <span className="text-[10px] text-gray-500 font-mono">{curveLabel}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {BEZIER_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`text-[9px] uppercase tracking-wide px-2 py-1 rounded border transition-colors ${
                        curveLabel === preset.label
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">Bezier</div>
                  <div
                    ref={curveRef}
                    className="relative h-32 w-full rounded-lg border border-gray-200 bg-gray-50"
                    onPointerMove={(event) => {
                      if (!draggingHandle) return;
                      updateCurvePoint(draggingHandle, event.clientX, event.clientY);
                    }}
                    onPointerUp={() => setDraggingHandle(null)}
                    onPointerLeave={() => setDraggingHandle(null)}
                  >
                    <svg viewBox="0 0 100 100" className="absolute inset-0">
                      <path d={curvePath} fill="none" stroke="#111827" strokeWidth="2" />
                      <line x1="0" y1="100" x2={curve.x1 * 100} y2={(1 - curve.y1) * 100} stroke="#e5e7eb" />
                      <line x1="100" y1="0" x2={curve.x2 * 100} y2={(1 - curve.y2) * 100} stroke="#e5e7eb" />
                    </svg>
                    {(['p1', 'p2'] as const).map((handle) => {
                      const x = handle === 'p1' ? curve.x1 : curve.x2;
                      const y = handle === 'p1' ? curve.y1 : curve.y2;
                      return (
                        <button
                          key={handle}
                          type="button"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.currentTarget.setPointerCapture(event.pointerId);
                            setDraggingHandle(handle);
                            updateCurvePoint(handle, event.clientX, event.clientY);
                          }}
                          onPointerUp={(event) => {
                            setDraggingHandle(null);
                            event.currentTarget.releasePointerCapture(event.pointerId);
                          }}
                          className="absolute h-3 w-3 rounded-full border border-gray-400 bg-white shadow-sm"
                          style={{
                            left: `${x * 100}%`,
                            top: `${(1 - y) * 100}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          aria-label={handle === 'p1' ? 'Bezier handle 1' : 'Bezier handle 2'}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                    {([
                      { key: 'x1', label: 'X1' },
                      { key: 'y1', label: 'Y1' },
                      { key: 'x2', label: 'X2' },
                      { key: 'y2', label: 'Y2' },
                    ] as const).map(({ key, label }) => (
                      <label key={key} className="flex items-center justify-between gap-2 text-gray-500">
                        <span className="uppercase tracking-wide">{label}</span>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={curve[key].toFixed(2)}
                          onChange={(event) => {
                            const nextValue = clamp01(Number(event.target.value));
                            setCurve((current) => ({ ...current, [key]: nextValue }));
                            if (curveLabel !== 'Custom') setCurveLabel('Custom');
                          }}
                          className="w-14 text-xs p-1 border rounded bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-500 focus:outline-none font-mono"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>

          <div className="mt-5">
            <div className="relative h-[36rem] rounded-2xl border border-dashed border-gray-200 bg-[radial-gradient(circle_at_top,_#ffffff,_#f8fafc_55%,_#ffffff_100%)] overflow-visible">
              <div
                ref={trackRef}
                className="absolute left-1/2 top-6 bottom-6 w-0 -translate-x-1/2"
              />
              <div className="absolute left-1/2 top-6 bottom-6 w-[2px] -translate-x-1/2 bg-gradient-to-b from-gray-200 via-gray-400 to-gray-200" />
              <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[10px] text-gray-400 font-mono">
                {formatNumber(effectiveMax)}rem
              </div>
              <div className="absolute left-1/2 bottom-2 -translate-x-1/2 text-[10px] text-gray-400 font-mono">
                {formatNumber(effectiveMin)}rem
              </div>
              <div className="absolute left-1/2 top-6 bottom-6 w-24 -translate-x-1/2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={`tick-${index}`}
                    className="absolute left-1/2 w-12 h-px bg-gray-100"
                    style={{ top: `${(index / 6) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  />
                ))}
              </div>

              {displayGroups.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                  No styles in this group.
                </div>
              ) : (
                displayGroups.map((group) => {
                  if (group.baseRem == null) return null;
                  const top = positionPercent(group.baseRem);
                  const isDragging = draggingKey === group.key;
                  const isLeft = getStableSide(group.key);
                  const shortLabel = formatGroupShortLabel(group.key);
                const isActive = activeKey === group.key || editingKey === group.key || isDragging;
                const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDraggingKey(group.key);
                  setDragOrder((current) => current ?? groups.map((entry) => entry.key));
                  setActiveKey(group.key);
                  updateFromPointer(group, event.clientY);
                };
                const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
                  if (draggingKey !== group.key) return;
                  updateFromPointer(group, event.clientY);
                };
                const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
                  if (draggingKey === group.key) {
                    setDraggingKey(null);
                    setDragOrder(null);
                  }
                  event.currentTarget.releasePointerCapture(event.pointerId);
                };
                return (
                  <div
                    key={group.key}
                    className="absolute left-1/2"
                    style={{ top: `${top}%` }}
                  >
                    <div
                      className="relative -translate-x-1/2 -translate-y-1/2"
                      onPointerEnter={() => setActiveKey(group.key)}
                      onPointerLeave={() => {
                        if (draggingKey === group.key || editingKey === group.key) return;
                        setActiveKey(null);
                      }}
                    >
                      <button
                        type="button"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        className={`h-3 w-3 rounded-full border shadow-sm transition-all duration-150 touch-none ${
                          isDragging
                            ? 'bg-gray-900 border-gray-900 scale-125'
                            : isActive
                              ? 'bg-white border-gray-400 scale-125'
                              : 'bg-white border-gray-300'
                        } cursor-grab active:cursor-grabbing`}
                        aria-label={`Drag ${group.label}`}
                      />

                      <div
                        className={`absolute top-1/2 -translate-y-1/2 ${
                          isLeft ? 'right-full mr-4 text-right' : 'left-full ml-4 text-left'
                        }`}
                      >
                        <div className="relative">
                          <button
                            type="button"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-gray-500 shadow-sm cursor-grab active:cursor-grabbing"
                            title={group.label}
                            aria-label={`Drag ${group.label}`}
                          >
                            {shortLabel}
                          </button>
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 ${
                              isLeft ? 'right-full mr-2' : 'left-full ml-2'
                            } ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} transition`}
                            onPointerEnter={() => setActiveKey(group.key)}
                            onPointerLeave={() => {
                              if (draggingKey === group.key || editingKey === group.key) return;
                              setActiveKey(null);
                            }}
                          >
                            <div className="relative">
                              <div className="absolute inset-y-0 -left-4 w-4" />
                              <div className="absolute inset-y-0 -right-4 w-4" />
                              <div className="max-w-[140px] flex flex-col gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 shadow-md">
                              <span className="text-[10px] uppercase tracking-wider text-gray-400 truncate">
                                {group.label}
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formatNumber(group.baseRem)}
                                  onFocus={() => {
                                    setEditingKey(group.key);
                                    setActiveKey(group.key);
                                  }}
                                  onBlur={() => {
                                    setEditingKey(null);
                                    if (activeKey === group.key && draggingKey !== group.key) {
                                      setActiveKey(null);
                                    }
                                  }}
                                  onChange={(event) => {
                                    const nextValue = Number(event.target.value);
                                    if (!Number.isFinite(nextValue)) return;
                                    applyBaseValue(group, nextValue);
                                  }}
                                  className="w-14 text-xs p-1 border rounded bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-500 focus:outline-none font-mono"
                                />
                                <span className="text-[10px] text-gray-400">rem</span>
                              </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
                })
              )}
            </div>
            <p className="mt-3 text-[10px] text-gray-400">
              Dragging keeps existing mobile and compact offsets intact. Use the offsets panel if you want to adjust them.
            </p>
          </div>
        </div>

        {modifierGroups.length > 0 && (
          <details className="group border border-gray-200 rounded-lg bg-white">
            <summary className="cursor-pointer select-none px-3 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 rounded-lg flex items-center justify-between">
              <span>Offsets</span>
              <span className="text-[9px] text-gray-400 group-open:hidden">Expand</span>
              <span className="text-[9px] text-gray-400 hidden group-open:inline">Collapse</span>
            </summary>
            <div className="p-3 space-y-2">
              {modifierGroups.map((group) => (
                <div key={group.key} className="flex flex-wrap items-center gap-2 border border-gray-200 rounded-md p-2 bg-white">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 w-20">
                    {group.label}
                  </div>
                  {group.variants.mobile && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">Mobile</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formatNumber(group.modifiers.mobile ?? 0)}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          if (!Number.isFinite(nextValue)) return;
                          handleModifierChange(group, 'mobile', nextValue);
                        }}
                        className="w-16 text-xs p-1 border rounded bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-500 focus:outline-none font-mono"
                      />
                      <span className="text-[10px] text-gray-400">rem</span>
                    </div>
                  )}
                  {group.variants.compact && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">Compact</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formatNumber(group.modifiers.compact ?? 0)}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          if (!Number.isFinite(nextValue)) return;
                          handleModifierChange(group, 'compact', nextValue);
                        }}
                        className="w-16 text-xs p-1 border rounded bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-500 focus:outline-none font-mono"
                      />
                      <span className="text-[10px] text-gray-400">rem</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </details>
  );
}

export function TypographyRampPreview({ tab = 'standard' }: { tab?: 'standard' | 'special' } = {}) {
  const { resolvedTokens } = useTokenStore();
  const groups = useMemo(() => buildTypographyGroups(resolvedTokens), [resolvedTokens]);
  const isStandardGroup = (group: TypographyGroup) => {
    const key = group.key.replace(/^--/, '').toLowerCase();
    return /^h[1-6]$/.test(key) || /^p[1-4]$/.test(key);
  };
  const filteredGroups = useMemo(
    () => groups.filter((group) => (tab === 'standard' ? isStandardGroup(group) : !isStandardGroup(group))),
    [groups, tab]
  );
  const rootTokens = useMemo(() => {
    if (!resolvedTokens || typeof resolvedTokens !== 'object') return null;
    const root = (resolvedTokens as Record<string, unknown>).Root;
    return root && typeof root === 'object' ? (root as Record<string, unknown>) : null;
  }, [resolvedTokens]);

  if (filteredGroups.length === 0) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Type Ramp</span>
          <span className="text-[10px] text-gray-400 font-mono">Local</span>
        </div>
        <div className="p-6 text-center text-xs text-gray-500">
          No typography styles found for this group.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Type Ramp</span>
        <span className="text-[10px] text-gray-400 font-mono">Local</span>
      </div>
      <div className="p-4 space-y-3">
        {filteredGroups.map((group) => (
          <div key={group.key} className="flex items-baseline gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
            <div className="w-16 text-[10px] uppercase tracking-wider text-gray-400">{group.label}</div>
            <div
              className="flex-1 text-gray-900"
              style={{
                fontSize: group.baseRem ? `${group.baseRem}rem` : undefined,
                ...resolveTypographyStyle(group, rootTokens),
              }}
            >
              The quick brown fox jumps over the lazy dog.
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              {group.baseRem != null
                ? `${formatRemValue(group.baseRem)} · ${Math.round(group.baseRem * REM_BASE)}px`
                : '--'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
