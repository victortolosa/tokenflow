import type { Node, Edge } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { flattenTokens } from './token-utils';

// Node dimensions must match CSS pixel sizes used in custom node components
const NODE_SIZES = {
  componentGroup: { width: 200, height: 70 },
  globalToken: { width: 210, height: 56 },
} as const;

export interface BuildTokenGraphParams {
  baseTokens: Record<string, unknown> | null;
  globalTokens: Record<string, unknown> | null;
  direction?: 'LR' | 'TB';
}

function applyDagreLayout(nodes: Node[], edges: Edge[], direction: 'LR' | 'TB'): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, ranksep: 90, nodesep: 50 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const size = NODE_SIZES[node.type as keyof typeof NODE_SIZES] ?? { width: 160, height: 60 };
    g.setNode(node.id, { width: size.width, height: size.height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    const size = NODE_SIZES[node.type as keyof typeof NODE_SIZES] ?? { width: 160, height: 60 };
    return {
      ...node,
      position: {
        x: pos.x - size.width / 2,
        y: pos.y - size.height / 2,
      },
    };
  });
}

function extractReferencePaths(value: unknown): string[] {
  if (typeof value === 'string') {
    const matches = Array.from(value.matchAll(/\{([^}]+)\}/g));
    return matches.map((match) => match[1]);
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractReferencePaths(entry));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((entry) => extractReferencePaths(entry));
  }
  return [];
}

function getTokenValueByPath(tokens: Record<string, unknown>, path: string): unknown | null {
  const parts = path.split('.');
  let current: unknown = tokens;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in (current as Record<string, unknown>))) {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (current && typeof current === 'object' && 'value' in (current as Record<string, unknown>)) {
    return (current as Record<string, unknown>).value;
  }
  return null;
}

function collectGlobalReferences(
  value: unknown,
  allTokens: Record<string, unknown>,
  globalTokenSet: Set<string>,
  visited: Set<string>
): Set<string> {
  const globals = new Set<string>();
  const refs = extractReferencePaths(value);
  for (const ref of refs) {
    if (globalTokenSet.has(ref)) {
      globals.add(ref);
      continue;
    }
    if (visited.has(ref)) continue;
    visited.add(ref);
    const nextValue = getTokenValueByPath(allTokens, ref);
    if (nextValue !== null) {
      for (const globalRef of collectGlobalReferences(nextValue, allTokens, globalTokenSet, visited)) {
        globals.add(globalRef);
      }
    }
  }
  return globals;
}

export function buildTokenGraph({
  baseTokens,
  globalTokens,
  direction = 'LR',
}: BuildTokenGraphParams): { nodes: Node[]; edges: Edge[] } {
  if (!baseTokens || !globalTokens) return { nodes: [], edges: [] };

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const globalGroupNames = new Set(Object.keys(globalTokens));
  const globalLeaves = flattenTokens(globalTokens, globalTokens);
  const globalTokenSet = new Set(globalLeaves.map((leaf) => leaf.name));

  const usageByComponent = new Map<string, Map<string, Set<string>>>();
  const globalUsage = new Set<string>();

  for (const [groupName, groupValue] of Object.entries(baseTokens)) {
    if (globalGroupNames.has(groupName)) continue;
    if (!groupValue || typeof groupValue !== 'object') continue;

    const leaves = flattenTokens(groupValue as Record<string, unknown>, baseTokens, groupName);
    for (const leaf of leaves) {
      const globals = collectGlobalReferences(
        leaf.originalValue,
        baseTokens,
        globalTokenSet,
        new Set<string>([leaf.name])
      );

      if (!globals.size) continue;
      if (!usageByComponent.has(groupName)) {
        usageByComponent.set(groupName, new Map());
      }
      const groupMap = usageByComponent.get(groupName)!;
      for (const globalRef of globals) {
        globalUsage.add(globalRef);
        if (!groupMap.has(globalRef)) {
          groupMap.set(globalRef, new Set());
        }
        groupMap.get(globalRef)!.add(leaf.name);
      }
    }
  }

  for (const [componentName, globalMap] of usageByComponent.entries()) {
    const tokenSet = new Set<string>();
    for (const tokenNames of globalMap.values()) {
      for (const tokenName of tokenNames) tokenSet.add(tokenName);
    }
    const tokenCount = tokenSet.size;
    nodes.push({
      id: `component::${componentName}`,
      type: 'componentGroup',
      position: { x: 0, y: 0 },
      data: {
        label: componentName,
        tokenCount,
        globalCount: globalMap.size,
      },
    });
  }

  for (const globalName of globalUsage) {
    const [group, ...rest] = globalName.split('.');
    const tokenLabel = rest.length ? rest[rest.length - 1] : globalName;
    nodes.push({
      id: `global::${globalName}`,
      type: 'globalToken',
      position: { x: 0, y: 0 },
      data: {
        name: globalName,
        group,
        label: tokenLabel,
      },
    });
  }

  for (const [componentName, globalMap] of usageByComponent.entries()) {
    for (const [globalName, tokenNames] of globalMap.entries()) {
      edges.push({
        id: `usage::${componentName}::${globalName}`,
        source: `component::${componentName}`,
        target: `global::${globalName}`,
        type: 'smoothstep',
        style: { stroke: '#0ea5e9', strokeWidth: 1.4 },
        animated: false,
        label: tokenNames.size > 1 ? `${tokenNames.size}` : undefined,
        labelStyle: { fill: '#0ea5e9', fontSize: 9, fontWeight: 600 },
      });
    }
  }

  const layoutedNodes = applyDagreLayout(nodes, edges, direction);
  return { nodes: layoutedNodes, edges };
}
