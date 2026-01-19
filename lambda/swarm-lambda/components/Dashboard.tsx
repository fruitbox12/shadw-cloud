'use client';

import { useEffect, useMemo, useState } from 'react';
import ClusterFlow from './ClusterFlow';
import Sidebar from './Sidebar';
import NavBar from './NavBar';

type Graph = {
  clusterId: string;
  gateway: { id: string; name: string; online: boolean };
  workers: Array<{ rpcKeyHex: string; name: string; online?: boolean; seenAt?: number; region?: string }>;
  edges: Array<{ id: string; source: string; target: string }>;
  functions: Array<{ name: string; latestVersion: string | null; handler: string | null; runtime: string | null }>;
  ts: number;
} | null;

const DEFAULT_GATEWAY = 'http://localhost:8787';

export default function Dashboard() {
  const [gatewayUrl, setGatewayUrl] = useState(
    process.env.NEXT_PUBLIC_SWARMLAMBDA_GATEWAY_URL || DEFAULT_GATEWAY
  );

  const [graph, setGraph] = useState<Graph>(null);
  const [collapsed, setCollapsed] = useState(false);

  const [deployName, setDeployName] = useState('hello');
  const [deployHandler, setDeployHandler] = useState('index.handler');
  const [deployCode, setDeployCode] = useState(
`exports.handler = async (event) => {
  return { ok: true, e: event };
};`
  );

  const [invokeName, setInvokeName] = useState('hello');
  const [invokePayload, setInvokePayload] = useState('{"name":"world"}');
  const [invokeResult, setInvokeResult] = useState<any>(null);

  const nodesOnline = useMemo(() => {
    const ws = graph?.workers || [];
    return ws.filter((w) => w.online !== false).length;
  }, [graph]);

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

    async function tick() {
      if (cancelled) return;
      await refresh();
    }

    tick();
    const id = setInterval(tick, 1200);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatewayUrl]);

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

      // refresh list
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
    <div className="appShell">
      <NavBar
        clusterId={graph?.clusterId}
        gatewayUrl={gatewayUrl}
        nodesOnline={nodesOnline}
        nodesTotal={graph?.workers?.length ?? 0}
        onToggleSidebar={() => setCollapsed((v) => !v)}
        isSidebarCollapsed={collapsed}
        onRefresh={refresh}
      />

      <div className="body">
        <Sidebar
          collapsed={collapsed}
          graph={graph}
          gatewayUrl={gatewayUrl}
          setGatewayUrl={setGatewayUrl}
          deployName={deployName}
          setDeployName={setDeployName}
          deployHandler={deployHandler}
          setDeployHandler={setDeployHandler}
          deployCode={deployCode}
          setDeployCode={setDeployCode}
          onDeploy={deploy}
          invokeName={invokeName}
          setInvokeName={setInvokeName}
          invokePayload={invokePayload}
          setInvokePayload={setInvokePayload}
          onInvoke={invoke}
          invokeResult={invokeResult}
        />

        <div className="canvas">
          <ClusterFlow graph={graph} />
        </div>
      </div>

      <style jsx global>{`
        .appShell {
          height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
          color: #e5e7eb;
          background: #050511;
        }

        .nav {
          height: 56px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(10,12,24,0.75);
          backdrop-filter: blur(10px);
        }

        .nav__brand { display: flex; flex-direction: column; gap: 2px; }
        .nav__title { font-weight: 800; letter-spacing: 0.2px; }
        .nav__subtitle { display: flex; gap: 8px; flex-wrap: wrap; }

        .nav__spacer { flex: 1; }
        .nav__status { display: flex; align-items: center; gap: 10px; }

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

        .iconBtn {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          color: #e5e7eb;
          cursor: pointer;
        }
        .iconBtn:hover { background: rgba(255,255,255,0.10); }

        .btn {
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          color: #e5e7eb;
          cursor: pointer;
        }
        .btn:hover { background: rgba(255,255,255,0.10); }

        .btn--primary {
          background: rgba(56,189,248,0.16);
          border-color: rgba(56,189,248,0.35);
        }
        .btn--primary:hover { background: rgba(56,189,248,0.22); }

        .body {
          flex: 1;
          display: flex;
          min-height: 0;
        }

        .side {
          width: 360px;
          border-right: 1px solid rgba(255,255,255,0.08);
          background: rgba(10,12,24,0.55);
          backdrop-filter: blur(10px);
          overflow: auto;
        }

        .side--collapsed {
          width: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 10px 6px;
        }

        .railBtn {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          color: #e5e7eb;
          cursor: pointer;
        }
        .railBtn:hover { background: rgba(255,255,255,0.10); }
        .railMeta { margin-top: auto; display: grid; gap: 4px; padding-bottom: 6px; }
        .railMeta__small { font-size: 11px; opacity: 0.7; }

        .canvas { flex: 1; min-width: 0; }

        .section { border-bottom: 1px solid rgba(255,255,255,0.08); }
        .section__hdr {
          width: 100%;
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 12px;
          font-weight: 700;
          background: transparent;
          border: 0;
          color: #e5e7eb;
          cursor: pointer;
        }
        .section__hdr:hover { background: rgba(255,255,255,0.04); }
        .section__body { padding: 0 12px 12px; }
        .section__chev { opacity: 0.75; }

        .form { display: grid; gap: 8px; }
        label { font-size: 12px; opacity: 0.75; }
        input, textarea {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          color: #e5e7eb;
          padding: 8px 10px;
          outline: none;
        }
        input:focus, textarea:focus {
          border-color: rgba(56,189,248,0.45);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.12);
        }

        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .muted { font-size: 12px; opacity: 0.7; margin-top: 6px; }

        .nodeList { display: grid; gap: 10px; }
        .nodeRow { display: flex; gap: 10px; align-items: flex-start; padding: 8px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
        .nodeRow__main { min-width: 0; }
        .nodeRow__name { font-weight: 700; }
        .nodeRow__sub { font-size: 12px; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }

        .dot { width: 10px; height: 10px; border-radius: 999px; margin-top: 4px; }
        .dot--on { background: #34d399; box-shadow: 0 0 18px rgba(52,211,153,0.35); }
        .dot--off { background: #9ca3af; opacity: 0.6; }

        .list { margin-top: 10px; display: grid; gap: 8px; }
        .listItem { padding: 8px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
        .listItem__title { font-weight: 800; }
        .listItem__sub { font-size: 12px; opacity: 0.75; margin-top: 2px; }

        .result { margin-top: 10px; }
        .result__title { font-size: 12px; opacity: 0.75; margin-bottom: 6px; }
        pre { margin: 0; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); overflow: auto; }
      `}</style>
    </div>
  );
}
