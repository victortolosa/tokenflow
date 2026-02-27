'use client';

import React, { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import { Layers } from 'lucide-react';
import { useTokenStore } from '@/store/useTokenStore';
import { buildTokenGraph } from '@/utils/token-graph';

// ─── Custom Node Components (module-level — do NOT define inside render) ───

const ComponentGroupNode = ({ data }: NodeProps) => {
  const { label, tokenCount, globalCount } = data as {
    label: string;
    tokenCount: number;
    globalCount: number;
  };
  return (
    <div
      className="bg-white border-2 border-slate-200 rounded-lg px-3 py-2 shadow-sm"
      style={{ width: 200, height: 70, display: 'flex', alignItems: 'center', gap: 10 }}
    >
      <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
        <Layers className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-800 truncate">{label}</div>
        <div className="text-[10px] text-slate-400">
          {tokenCount} token{tokenCount === 1 ? '' : 's'} · {globalCount} global
        </div>
      </div>
    </div>
  );
};

const GlobalTokenNode = ({ data }: NodeProps) => {
  const { label, group } = data as { label: string; group: string };
  return (
    <div
      className="bg-sky-50 border border-sky-200 rounded-md px-2.5 py-1.5"
      style={{ width: 210, height: 56, display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <div className="w-6 h-6 rounded bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0">
        <span className="text-[9px] text-sky-700 font-semibold">{group.slice(0, 2).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono text-sky-700 truncate">{label}</div>
        <div className="text-[9px] text-sky-400 truncate">{group}</div>
      </div>
    </div>
  );
};

const nodeTypes = {
  componentGroup: ComponentGroupNode,
  globalToken: GlobalTokenNode,
};

// ─── Inner component (needs ReactFlowProvider context) ───

function TokenMapInner() {
  const { baseTokens, globalTokens } = useTokenStore();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const direction: 'LR' | 'TB' = 'LR';

  const graphData = useMemo(
    () =>
      buildTokenGraph({
        baseTokens,
        globalTokens,
        direction,
      }),
    [baseTokens, globalTokens, direction]
  );

  useEffect(() => {
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
    const timer = setTimeout(() => {
      void fitView({ padding: 0.15, duration: 300 });
    }, 50);
    return () => clearTimeout(timer);
  }, [graphData, setNodes, setEdges, fitView]);


  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 bg-white border-b border-gray-200 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
          Global Usage Map
        </div>
        <span className="text-[10px] text-gray-400">
          Component tokens → Global tokens
        </span>
        <div className="mx-2 h-4 border-l border-gray-200" />
        <button
          type="button"
          onClick={() => void fitView({ padding: 0.15, duration: 300 })}
          className="text-[10px] px-2 py-1 rounded border bg-white text-gray-500 border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Fit View
        </button>
        <div className="ml-auto text-[10px] text-gray-400">
          Drag to pan · Scroll to zoom
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          minZoom={0.1}
          maxZoom={2}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} color="#e5e7eb" />
          <Controls />
          <MiniMap zoomable pannable nodeColor={(n) => {
            if (n.type === 'componentGroup') return '#e2e8f0';
            if (n.type === 'globalToken') return '#bae6fd';
            return '#f3f4f6';
          }} />
        </ReactFlow>
      </div>
    </div>
  );
}

// ─── Exported wrapper with ReactFlowProvider ───

export function TokenMap() {
  return (
    <ReactFlowProvider>
      <TokenMapInner />
    </ReactFlowProvider>
  );
}
