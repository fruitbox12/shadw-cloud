'use client';

import { useMemo } from 'react';

export default function NavBar({
  clusterId,
  gatewayUrl,
  nodesOnline,
  nodesTotal,
  onToggleSidebar,
  isSidebarCollapsed,
  onRefresh
}: {
  clusterId?: string;
  gatewayUrl: string;
  nodesOnline: number;
  nodesTotal: number;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  onRefresh: () => void;
}) {
  const host = useMemo(() => {
    try {
      const u = new URL(gatewayUrl);
      return u.host;
    } catch {
      return gatewayUrl;
    }
  }, [gatewayUrl]);

  return (
    <div className="nav">
      <button className="iconBtn" onClick={onToggleSidebar} title="Toggle sidebar">
        {isSidebarCollapsed ? '☰' : '⟂'}
      </button>

      <div className="nav__brand">
        <div className="nav__title">shadw</div>
        <div className="nav__subtitle">
          {clusterId ? (
            <>
              <span className="pill">cluster: {clusterId}</span>
              <span className="pill pill--muted">{host}</span>
            </>
          ) : (
            <span className="pill pill--warn">gateway unreachable</span>
          )}
        </div>
      </div>

      <div className="nav__spacer" />

      <div className="nav__status">
        <span className="pill">{nodesOnline}/{nodesTotal} online</span>
        <button className="btn" onClick={onRefresh}>Refresh</button>
      </div>
    </div>
  );
}
