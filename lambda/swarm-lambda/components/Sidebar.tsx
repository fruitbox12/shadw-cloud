'use client';

import { useMemo, useState } from 'react';

type Graph = {
  clusterId: string;
  gateway: { id: string; name: string; online: boolean };
  workers: Array<{ rpcKeyHex: string; name: string; online?: boolean; seenAt?: number; region?: string }>;
  functions: Array<{ name: string; latestVersion: string | null; handler: string | null; runtime: string | null }>;
  ts: number;
} | null;

function shortKey(k: string) {
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

export default function Sidebar({
  collapsed,
  graph,
  gatewayUrl,
  setGatewayUrl,
  deployName,
  setDeployName,
  deployHandler,
  setDeployHandler,
  deployCode,
  setDeployCode,
  onDeploy,
  invokeName,
  setInvokeName,
  invokePayload,
  setInvokePayload,
  onInvoke,
  invokeResult
}: {
  collapsed: boolean;
  graph: Graph;
  gatewayUrl: string;
  setGatewayUrl: (v: string) => void;

  deployName: string;
  setDeployName: (v: string) => void;
  deployHandler: string;
  setDeployHandler: (v: string) => void;
  deployCode: string;
  setDeployCode: (v: string) => void;
  onDeploy: () => void;

  invokeName: string;
  setInvokeName: (v: string) => void;
  invokePayload: string;
  setInvokePayload: (v: string) => void;
  onInvoke: () => void;
  invokeResult: any;
}) {
  const [open, setOpen] = useState({
    nodes: true,
    functions: true,
    invoke: true,
    settings: false
  });

  const nodesOnline = useMemo(() => {
    const ws = graph?.workers || [];
    return ws.filter((w) => w.online !== false).length;
  }, [graph]);

  if (collapsed) {
    return (
      <div className="side side--collapsed">
        <button className="railBtn" onClick={() => setOpen((o) => ({ ...o, nodes: true }))} title="Nodes">🧩</button>
        <button className="railBtn" onClick={() => setOpen((o) => ({ ...o, functions: true }))} title="Functions">ƒ</button>
        <button className="railBtn" onClick={() => setOpen((o) => ({ ...o, invoke: true }))} title="Invoke">⚡</button>
        <button className="railBtn" onClick={() => setOpen((o) => ({ ...o, settings: true }))} title="Settings">⚙️</button>
        <div className="railMeta">
          <div className="railMeta__small">{graph?.clusterId ?? '—'}</div>
          <div className="railMeta__small">{nodesOnline}/{graph?.workers?.length ?? 0}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="side">
      <Section
        title={`Nodes (${nodesOnline}/${graph?.workers?.length ?? 0})`}
        open={open.nodes}
        onToggle={() => setOpen((o) => ({ ...o, nodes: !o.nodes }))}
      >
        <div className="nodeList">
          <div className="nodeRow">
            <span className="dot dot--on" />
            <div className="nodeRow__main">
              <div className="nodeRow__name">gateway</div>
              <div className="nodeRow__sub">{gatewayUrl}</div>
            </div>
          </div>

          {(graph?.workers || []).map((w) => (
            <div className="nodeRow" key={w.rpcKeyHex}>
              <span className={['dot', w.online === false ? 'dot--off' : 'dot--on'].join(' ')} />
              <div className="nodeRow__main">
                <div className="nodeRow__name">{w.name}</div>
                <div className="nodeRow__sub mono">{shortKey(w.rpcKeyHex)} {w.region ? `· ${w.region}` : ''}</div>
              </div>
            </div>
          ))}
          {!graph?.workers?.length ? <div className="muted">No workers yet</div> : null}
        </div>
      </Section>

      <Section
        title="Functions"
        open={open.functions}
        onToggle={() => setOpen((o) => ({ ...o, functions: !o.functions }))}
      >
        <div className="form">
          <label>Name</label>
          <input value={deployName} onChange={(e) => setDeployName(e.target.value)} />
          <label>Handler</label>
          <input value={deployHandler} onChange={(e) => setDeployHandler(e.target.value)} />
          <label>index.js</label>
          <textarea value={deployCode} onChange={(e) => setDeployCode(e.target.value)} rows={8} className="mono" />
          <button className="btn btn--primary" onClick={onDeploy}>Deploy</button>
        </div>

        <div className="list">
          {(graph?.functions || []).map((f) => (
            <div className="listItem" key={f.name}>
              <div className="listItem__title">{f.name}</div>
              <div className="listItem__sub mono">
                {f.handler ?? '—'} · {f.latestVersion ?? '—'}
              </div>
            </div>
          ))}
          {!graph?.functions?.length ? <div className="muted">No functions deployed</div> : null}
        </div>
      </Section>

      <Section
        title="Invoke"
        open={open.invoke}
        onToggle={() => setOpen((o) => ({ ...o, invoke: !o.invoke }))}
      >
        <div className="form">
          <label>Function</label>
          <input value={invokeName} onChange={(e) => setInvokeName(e.target.value)} />
          <label>Payload (JSON)</label>
          <textarea value={invokePayload} onChange={(e) => setInvokePayload(e.target.value)} rows={5} className="mono" />
          <button className="btn btn--primary" onClick={onInvoke}>Invoke</button>
        </div>

        <div className="result">
          <div className="result__title">Result</div>
          <pre className="mono">{invokeResult ? JSON.stringify(invokeResult, null, 2) : '—'}</pre>
        </div>
      </Section>

      <Section
        title="Settings"
        open={open.settings}
        onToggle={() => setOpen((o) => ({ ...o, settings: !o.settings }))}
      >
        <div className="form">
          <label>Gateway URL</label>
          <input value={gatewayUrl} onChange={(e) => setGatewayUrl(e.target.value)} />
          <div className="muted">Tip: use http://localhost:8787</div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  children
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="section">
      <button className="section__hdr" onClick={onToggle}>
        <span>{title}</span>
        <span className="section__chev">{open ? '▾' : '▸'}</span>
      </button>
      {open ? <div className="section__body">{children}</div> : null}
    </div>
  );
}
