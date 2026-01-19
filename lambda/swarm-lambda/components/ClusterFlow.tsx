'use client';

import { memo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  getBezierPath,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type EdgeProps,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type EdgeNode = {
  rpcKeyHex: string;
  name: string;
  region: string;
  geo?: { lat: number; lon: number } | null;
  http?: { host: string; port: number } | null;
  seenAt: number;
};

type EdgeGraph = {
  clusterId: string;
  gateway: { id: string; name: string; region: string };
  nodes: EdgeNode[];
  functions: Array<{ name: string; latestVersion: string | null; handler: string | null; runtime: string | null }>;
  ts: number;
} | null;

type PeerNodeData = {
  role: 'edge';
  name: string;
  online: boolean;
  rpcKeyHex?: string;
  region?: string;
  seenAt?: number;
  http?: { host: string; port: number } | null;
  meta?: Record<string, any>;
};

function polar(i: number, n: number, radius: number) {
  const a = (i / Math.max(1, n)) * Math.PI * 2;
  return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
}

function timeAgo(ms?: number) {
  if (!ms) return '—';
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function shortKey(k?: string) {
  if (!k) return '—';
  if (k.length <= 14) return k;
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

/* --------------------- Node (enhanced card) --------------------- */

const PeerNode = memo(function PeerNode(props: NodeProps) {
  const data = props.data as PeerNodeData;
  const online = !!data.online;

  const httpLabel = data.http?.host
    ? `${data.http.host}:${data.http.port ?? '—'}`
    : '—';

  return (
    <div className="peerNode">
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1 }} />

      <div className="peerNode__hdr">
        <div className="peerNode__hdrLeft">
          <span className={['dot', online ? 'dot--on' : 'dot--off'].join(' ')} />
          <div className="peerNode__titles">
            <div className="peerNode__name">{data.name}</div>
            <div className="peerNode__sub">
              edge · {online ? 'online' : 'offline'}
            </div>
          </div>
        </div>

        <div className="peerNode__hdrRight">
          <span className="badge">{data.region ?? 'unknown'}</span>
        </div>
      </div>

      <div className="peerNode__grid">
        <div className="kv">
          <div className="k">rpc key</div>
          <div className="v mono">{shortKey(data.rpcKeyHex)}</div>
        </div>

        <div className="kv">
          <div className="k">last seen</div>
          <div className="v">{timeAgo(data.seenAt)}</div>
        </div>

        <div className="kv">
          <div className="k">http</div>
          <div className="v mono">{httpLabel}</div>
        </div>

        <div className="kv">
          <div className="k">status</div>
          <div className="v">{online ? 'online' : 'offline'}</div>
        </div>
      </div>

      <div className="peerNode__hint">Double-click for details</div>
      <div className="sheen" />
    </div>
  );
});

/* --------------------- Animated edge --------------------- */

const AnimatedEdge = memo(function AnimatedEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected } = props;

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.25
  });

  const baseStroke = selected ? 'rgba(255,255,255,0.40)' : 'rgba(148,163,184,0.28)';
  const dashStroke = selected ? 'rgba(168,85,247,0.95)' : 'rgba(56,189,248,0.95)';

  return (
    <g>
      <path d={path} fill="none" stroke={baseStroke} strokeWidth={3} strokeLinecap="round" />
      <path
        d={path}
        fill="none"
        stroke={dashStroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="10 12"
      >
        <animate attributeName="stroke-dashoffset" values="0;-44" dur="1.1s" repeatCount="indefinite" />
      </path>
    </g>
  );
});

const nodeTypes: NodeTypes = { peer: PeerNode as any };
const edgeTypes: EdgeTypes = { flow: AnimatedEdge };

/* --------------------- Details drawer modal --------------------- */

function DetailsModal({
  open,
  onClose,
  node
}: {
  open: boolean;
  onClose: () => void;
  node: Node<PeerNodeData> | null;
}) {
  if (!open || !node) return null;

  const d = node.data;
  const httpLabel = d.http?.host ? `${d.http.host}:${d.http.port ?? '—'}` : '—';

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__hdr">
          <div>
            <div className="modal__title">{d.name}</div>
            <div className="modal__sub">
              edge · {d.online ? 'online' : 'offline'} · {d.region ?? 'no-region'}
            </div>
          </div>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          <div className="section">
            <div className="section__title">Configuration</div>
            <div className="grid2">
              <div className="kv kv--panel">
                <div className="k">Node ID</div>
                <div className="v mono">{node.id}</div>
              </div>

              <div className="kv kv--panel">
                <div className="k">RPC Key</div>
                <div className="v mono">{d.rpcKeyHex ?? '—'}</div>
              </div>

              <div className="kv kv--panel">
                <div className="k">Region</div>
                <div className="v">{d.region ?? '—'}</div>
              </div>

              <div className="kv kv--panel">
                <div className="k">HTTP</div>
                <div className="v mono">{httpLabel}</div>
              </div>

              <div className="kv kv--panel">
                <div className="k">Last seen</div>
                <div className="v">{d.seenAt ? new Date(d.seenAt).toLocaleString() : '—'}</div>
              </div>

              <div className="kv kv--panel">
                <div className="k">Status</div>
                <div className="v">{d.online ? 'online' : 'offline'}</div>
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section__title">Raw</div>
            <pre className="json">{JSON.stringify(d, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------- Main --------------------- */

export default function ClusterFlow({ graph }: { graph: EdgeGraph }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<PeerNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node<PeerNodeData> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!graph) return;

    const all = graph.nodes || [];
    const meId = graph.gateway?.id || (all[0]?.rpcKeyHex ?? 'me');

    setNodes((prev) => {
      const map = new Map(prev.map((n) => [n.id, n]));
      const next: Node<PeerNodeData>[] = [];

      const radius = Math.max(230, Math.min(520, 190 + all.length * 16));

      all.forEach((n, i) => {
        const id = n.rpcKeyHex;
        const existing = map.get(id) as Node<PeerNodeData> | undefined;

        next.push(
          existing ?? {
            id,
            type: 'peer',
            position: id === meId ? { x: 0, y: 0 } : polar(i, all.length, radius),
            data: {
              role: 'edge',
              name: n.name,
              online: true,
              rpcKeyHex: n.rpcKeyHex,
              region: n.region,
              http: n.http ?? null,
              seenAt: n.seenAt
            }
          }
        );
      });

      return next;
    });

    // Simple star topology: connect "me" (the edge you asked for /graph from) to others
    const starEdges: Edge[] = [];
    for (const n of (graph.nodes || [])) {
      if (n.rpcKeyHex === meId) continue;
      starEdges.push({
        id: `e-${meId}-${n.rpcKeyHex}`,
        source: meId,
        target: n.rpcKeyHex,
        type: 'flow'
      });
    }
    setEdges(starEdges);
  }, [graph, setNodes, setEdges]);

  return (
    <div className="flowWrap" style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable
        nodesConnectable={false}
        panOnDrag
        fitView
        onNodeDoubleClick={(_, node) => {
          setSelectedNode(node as Node<PeerNodeData>);
          setModalOpen(true);
        }}
      >
        <MiniMap pannable zoomable />
        <Controls />
        <Background gap={18} size={1} />
      </ReactFlow>

      <DetailsModal open={modalOpen} node={selectedNode} onClose={() => setModalOpen(false)} />

      <style jsx global>{`
        .flowWrap {
          background: radial-gradient(1200px 700px at 35% 30%, #0f172a 0%, #060815 55%, #050511 100%);
        }

        .peerNode {
          width: 290px;
          border-radius: 18px;
          padding: 12px 12px 10px;
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(17, 24, 39, 0.56);
          box-shadow: 0 16px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
          position: relative;
          backdrop-filter: blur(8px);
          transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
        }
        .peerNode:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.18);
          box-shadow: 0 18px 48px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .peerNode__hdr {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .peerNode__hdrLeft {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .peerNode__titles {
          min-width: 0;
        }
        .peerNode__name {
          font-weight: 750;
          letter-spacing: 0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 170px;
        }
        .peerNode__sub {
          font-size: 12px;
          color: rgba(229,231,235,0.68);
          margin-top: 2px;
        }
        .peerNode__hdrRight {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .badge {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          color: #e5e7eb;
          line-height: 1;
        }
        .peerNode__grid {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .kv .k {
          font-size: 11px;
          color: rgba(229,231,235,0.58);
          margin-bottom: 3px;
        }
        .kv .v {
          font-size: 12px;
          color: rgba(229,231,235,0.92);
        }
        .peerNode__hint {
          margin-top: 10px;
          font-size: 11px;
          color: rgba(229,231,235,0.55);
        }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display: inline-block;
        }
        .dot--on {
          background: #34d399;
          box-shadow: 0 0 18px rgba(52,211,153,0.35);
          animation: pulse 1.8s ease-in-out infinite;
        }
        .dot--off {
          background: #9ca3af;
          opacity: 0.65;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }

        .sheen {
          pointer-events: none;
          position: absolute;
          inset: 0;
          border-radius: 18px;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.06) 28%, transparent 52%);
          transform: translateX(-55%);
          opacity: 0.0;
          animation: sheen 3.2s ease-in-out infinite;
        }
        @keyframes sheen {
          0% { transform: translateX(-55%); opacity: 0.0; }
          35% { opacity: 0.35; }
          70% { transform: translateX(55%); opacity: 0.0; }
          100% { transform: translateX(55%); opacity: 0.0; }
        }

        .modalOverlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          justify-content: flex-end;
          padding: 18px;
          z-index: 50;
        }
        .modal {
          width: min(540px, 92vw);
          height: min(86vh, 900px);
          background: rgba(12, 14, 26, 0.92);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.65);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(10px);
        }
        .modal__hdr {
          padding: 14px 14px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .modal__title {
          font-size: 16px;
          font-weight: 800;
          color: #e5e7eb;
        }
        .modal__sub {
          margin-top: 2px;
          font-size: 12px;
          color: rgba(229,231,235,0.65);
        }
        .modal__close {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          color: #e5e7eb;
          border-radius: 10px;
          padding: 6px 10px;
          cursor: pointer;
        }
        .modal__close:hover {
          background: rgba(255,255,255,0.10);
        }
        .modal__body {
          padding: 14px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .section__title {
          font-size: 12px;
          color: rgba(229,231,235,0.70);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .kv--panel {
          padding: 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
        }
        .json {
          font-size: 12px;
          color: rgba(229,231,235,0.90);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 12px;
          overflow: auto;
        }

        .react-flow__minimap,
        .react-flow__controls {
          background: rgba(10, 12, 24, 0.65) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
        }
        .react-flow__controls-button {
          background: transparent !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
          color: #e5e7eb !important;
        }
        .react-flow__controls-button:hover {
          background: rgba(255, 255, 255, 0.06) !important;
        }
      `}</style>
    </div>
  );
}
