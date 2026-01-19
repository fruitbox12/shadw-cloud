'use client';

import type { NodeProps } from '@xyflow/react';

type PeerNodeData = {
  role: 'gateway' | 'worker';
  name: string;
  region?: string;
  rpcKeyHex?: string;
  online: boolean;
  seenAt?: number;
  subtitle?: string;
};

function timeAgo(ms?: number) {
  if (!ms) return '';
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function PeerNode(props: NodeProps) {
  const data = props.data as PeerNodeData;

  const isGateway = data.role === 'gateway';
  const online = !!data.online;

  const keyShort = data.rpcKeyHex
    ? `${data.rpcKeyHex.slice(0, 6)}…${data.rpcKeyHex.slice(-4)}`
    : '';

  return (
    <div
      className={[
        'peerNode',
        isGateway ? 'peerNode--gateway' : 'peerNode--worker',
        online ? 'peerNode--online' : 'peerNode--offline'
      ].join(' ')}
    >
      <div className="peerNode__top">
        <div className="peerNode__titleRow">
          <div className="peerNode__status">
            <span className={['dot', online ? 'dot--on' : 'dot--off'].join(' ')} />
            <span className="peerNode__name">{data.name}</span>
          </div>

          {data.region ? (
            <span className="peerNode__badge">{data.region}</span>
          ) : (
            <span className="peerNode__badge peerNode__badge--muted">
              {isGateway ? 'gateway' : 'worker'}
            </span>
          )}
        </div>

        <div className="peerNode__sub">
          {data.subtitle ? data.subtitle : isGateway ? 'HTTP router + registry writer' : 'RPC executor'}
        </div>
      </div>

      <div className="peerNode__meta">
        {keyShort ? (
          <div className="peerNode__row">
            <span className="peerNode__label">key</span>
            <span className="peerNode__value mono">{keyShort}</span>
          </div>
        ) : null}

        {data.seenAt ? (
          <div className="peerNode__row">
            <span className="peerNode__label">seen</span>
            <span className="peerNode__value">{timeAgo(data.seenAt)}</span>
          </div>
        ) : (
          <div className="peerNode__row">
            <span className="peerNode__label">seen</span>
            <span className="peerNode__value">{online ? 'now' : '—'}</span>
          </div>
        )}
      </div>

      {/* subtle animated accent */}
      <div className="peerNode__sheen" />
    </div>
  );
}
