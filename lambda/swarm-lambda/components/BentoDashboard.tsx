'use client';

import { useEffect, useMemo, useState } from 'react';

type GraphWorker = {
  rpcKeyHex: string;
  name: string;
  online?: boolean;
  seenAt?: number;
  region?: string;
  caps?: string[];
  meta?: Record<string, any>;
};

type GraphFunction = {
  name: string;
  latestVersion: string | null;
  handler: string | null;
  runtime: string | null;
};

type Graph = {
  clusterId: string;
  gateway: { id: string; name?: string; online: boolean; region?: string };
  workers: GraphWorker[];
  edges: Array<{ id: string; source: string; target: string }>;
  functions: GraphFunction[];
  ts: number;
} | null;

const DEFAULT_GATEWAY = 'http://localhost:8787';

function shortKey(k: string) {
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
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

export default function BentoDashboard() {
  const [gatewayUrl, setGatewayUrl] = useState(
    process.env.NEXT_PUBLIC_SWARMLAMBDA_GATEWAY_URL || DEFAULT_GATEWAY
  );
  const [graph, setGraph] = useState<Graph>(null);
  const [invokeName, setInvokeName] = useState('hello');
  const [invokePayload, setInvokePayload] = useState('{"name":"world"}');
  const [invokeResult, setInvokeResult] = useState<any>(null);

  const [deployName, setDeployName] = useState('hello');
  const [deployHandler, setDeployHandler] = useState('index.handler');
  const [deployCode, setDeployCode] = useState(
`exports.handler = async (event) => {
  return { ok: true, e: event };
};`
  );

  const refresh = async () => {
    try {
      const r = await fetch(`${gatewayUrl}/graph`);
      const j = await r.json();
      setGraph(j);
    } catch {
      setGraph(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatewayUrl]);

  const onlineWorkers = useMemo(() => {
    const ws = graph?.workers || [];
    return ws.filter((w) => w.online !== false);
  }, [graph]);

  const offlineWorkers = useMemo(() => {
    const ws = graph?.workers || [];
    return ws.filter((w) => w.online === false);
  }, [graph]);

  const functions = useMemo(() => graph?.functions || [], [graph]);

  async function deploy() {
    try {
      const r = await fetch(`${gatewayUrl}/functions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: deployName,
          handler: deployHandler,
          runtime: 'nodejs20.x',
          files: { 'index.js': deployCode }
        })
      });

      const text = await r.text();
      if (!r.ok) {
        alert(`Deploy failed (${r.status}):\n${text}`);
        return;
      }

      await refresh();
    } catch (e: any) {
      alert(`Deploy exception: ${String(e?.message || e)}`);
    }
  }

  async function invoke() {
    try {
      const payload = JSON.parse(invokePayload);
      const r = await fetch(
        `${gatewayUrl}/2015-03-31/functions/${encodeURIComponent(invokeName)}/invocations`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const text = await r.text();
      let j: any = null;
      try { j = JSON.parse(text); } catch {}

      if (!r.ok) {
        alert(`Invoke failed (${r.status}):\n${text}`);
        return;
      }

      setInvokeResult(j ?? text);
      await refresh();
    } catch (e: any) {
      alert(`Invoke exception: ${String(e?.message || e)}`);
    }
  }

  return (
    <div className="bentoPage">
      {/* Top bar */}
      <div className="topbar">
        <div className="brand">
          <div className="title">SwarmLambda</div>
          <div className="subtitle">
            <span className="pill">/dashboard</span>
            {graph?.clusterId ? (
              <span className="pill pill--muted">cluster: {graph.clusterId}</span>
            ) : (
              <span className="pill pill--warn">gateway unreachable</span>
            )}
          </div>
        </div>

        <div className="spacer" />

        <div className="topbarRight">
          <input
            className="input"
            value={gatewayUrl}
            onChange={(e) => setGatewayUrl(e.target.value)}
            placeholder="Gateway URL"
          />
          <button className="btn" onClick={refresh}>Refresh</button>
          <a className="btn btn--ghost" href="/">Open Canvas</a>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid">
        <Card className="span2">
          <CardTitle>Cluster Health</CardTitle>
          <div className="metricRow">
            <Metric label="Workers online" value={`${onlineWorkers.length}`} />
            <Metric label="Workers offline" value={`${offlineWorkers.length}`} />
            <Metric label="Functions" value={`${functions.length}`} />
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            Gateway: <span className="mono">{gatewayUrl}</span>
          </div>
          <div className="muted">
            Last update: <span className="mono">{graph?.ts ? new Date(graph.ts).toLocaleTimeString() : '—'}</span>
          </div>
        </Card>

        <Card>
          <CardTitle>Workers</CardTitle>
          <div className="list">
            {(graph?.workers || []).slice(0, 6).map((w) => (
              <div className="listRow" key={w.rpcKeyHex}>
                <span className={['dot', w.online === false ? 'dot--off' : 'dot--on'].join(' ')} />
                <div className="listMain">
                  <div className="listTitle">{w.name}</div>
                  <div className="listSub mono">
                    {shortKey(w.rpcKeyHex)} {w.region ? `· ${w.region}` : ''} · seen {timeAgo(w.seenAt)}
                  </div>
                </div>
              </div>
            ))}
            {!(graph?.workers || []).length ? <div className="muted">No workers yet</div> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Functions</CardTitle>
          <div className="list">
            {(functions || []).slice(0, 6).map((f) => (
              <div className="listRow" key={f.name}>
                <span className="dot dot--on" />
                <div className="listMain">
                  <div className="listTitle">{f.name}</div>
                  <div className="listSub mono">
                    {f.handler ?? '—'} · {f.latestVersion ?? '—'}
                  </div>
                </div>
              </div>
            ))}
            {!functions.length ? <div className="muted">No functions deployed</div> : null}
          </div>
        </Card>

        <Card className="span2">
          <CardTitle>Quick Deploy</CardTitle>
          <div className="form2">
            <div>
              <label className="label">Name</label>
              <input className="input" value={deployName} onChange={(e) => setDeployName(e.target.value)} />
            </div>
            <div>
              <label className="label">Handler</label>
              <input className="input" value={deployHandler} onChange={(e) => setDeployHandler(e.target.value)} />
            </div>
          </div>
          <label className="label" style={{ marginTop: 10 }}>index.js</label>
          <textarea
            className="textarea mono"
            value={deployCode}
            onChange={(e) => setDeployCode(e.target.value)}
            rows={8}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn btn--primary" onClick={deploy}>Deploy</button>
            <button
              className="btn btn--ghost"
              onClick={() => setDeployCode(`exports.handler = async (event) => ({ ok: true, e: event });`)}
            >
              Reset Example
            </button>
          </div>
        </Card>

        <Card className="span2">
          <CardTitle>Invoke</CardTitle>
          <div className="form2">
            <div>
              <label className="label">Function</label>
              <input className="input" value={invokeName} onChange={(e) => setInvokeName(e.target.value)} />
            </div>
            <div>
              <label className="label">Payload (JSON)</label>
              <input className="input mono" value={invokePayload} onChange={(e) => setInvokePayload(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn btn--primary" onClick={invoke}>Invoke</button>
            <button className="btn btn--ghost" onClick={() => setInvokeResult(null)}>Clear</button>
          </div>
          <div className="result">
            <div className="label" style={{ marginBottom: 6 }}>Result</div>
            <pre className="pre mono">{invokeResult ? JSON.stringify(invokeResult, null, 2) : '—'}</pre>
          </div>
        </Card>

        <Card className="span3">
          <CardTitle>Raw /graph</CardTitle>
          <pre className="pre mono">{graph ? JSON.stringify(graph, null, 2) : '—'}</pre>
        </Card>
      </div>

      <style jsx global>{`
        .bentoPage {
          height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: radial-gradient(1200px 700px at 35% 30%, #0f172a 0%, #060815 55%, #050511 100%);
          color: #e5e7eb;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
        }

        .topbar {
          height: 64px;
          display: flex;
          align-items: center;
          padding: 12px 14px;
          gap: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(10,12,24,0.60);
          backdrop-filter: blur(10px);
        }

        .brand { display: flex; flex-direction: column; gap: 4px; }
        .title { font-weight: 900; letter-spacing: 0.2px; font-size: 16px; }
        .subtitle { display: flex; gap: 8px; flex-wrap: wrap; }

        .spacer { flex: 1; }

        .topbarRight { display: flex; gap: 10px; align-items: center; min-width: 520px; }
        @media (max-width: 900px) {
          .topbarRight { min-width: 0; flex: 1; }
        }

        .pill {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          color: #e5e7eb;
        }
        .pill--muted { opacity: 0.8; }
        .pill--warn { border-color: rgba(244,63,94,0.35); background: rgba(244,63,94,0.10); }

        .grid {
          flex: 1;
          overflow: auto;
          padding: 16px;
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
        }

        @media (max-width: 1200px) {
          .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .span3 { grid-column: span 4 !important; }
        }
        @media (max-width: 820px) {
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .span2, .span3 { grid-column: span 2 !important; }
        }

        .card {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(17, 24, 39, 0.55);
          box-shadow: 0 16px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
          padding: 14px;
          min-height: 120px;
          overflow: hidden;
          position: relative;
        }

        .cardTitle {
          font-weight: 850;
          letter-spacing: 0.2px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .span2 { grid-column: span 2; }
        .span3 { grid-column: span 3; }

        .metricRow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .metric {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          padding: 10px;
        }
        .metric__label { font-size: 12px; opacity: 0.7; }
        .metric__value { font-size: 22px; font-weight: 900; margin-top: 6px; }

        .list { display: grid; gap: 10px; }
        .listRow {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 10px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
        }
        .listMain { min-width: 0; }
        .listTitle { font-weight: 800; }
        .listSub { font-size: 12px; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 520px; }

        .dot { width: 10px; height: 10px; border-radius: 999px; margin-top: 4px; }
        .dot--on { background: #34d399; box-shadow: 0 0 18px rgba(52,211,153,0.35); }
        .dot--off { background: #9ca3af; opacity: 0.6; }

        .form2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 820px) { .form2 { grid-template-columns: 1fr; } }

        .label { font-size: 12px; opacity: 0.75; }
        .input, .textarea {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          color: #e5e7eb;
          padding: 10px 10px;
          outline: none;
        }
        .input:focus, .textarea:focus {
          border-color: rgba(56,189,248,0.45);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.12);
        }

        .btn {
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          color: #e5e7eb;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn:hover { background: rgba(255,255,255,0.10); }
        .btn--primary { background: rgba(56,189,248,0.16); border-color: rgba(56,189,248,0.35); }
        .btn--primary:hover { background: rgba(56,189,248,0.22); }
        .btn--ghost { opacity: 0.85; }

        .result { margin-top: 12px; }
        .pre {
          margin: 0;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          max-height: 320px;
          overflow: auto;
        }

        .muted { opacity: 0.75; font-size: 12px; }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }
      `}</style>
    </div>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={['card', className || ''].join(' ')}>{children}</div>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <div className="cardTitle">{children}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <div className="metric__label">{label}</div>
      <div className="metric__value">{value}</div>
    </div>
  );
}
