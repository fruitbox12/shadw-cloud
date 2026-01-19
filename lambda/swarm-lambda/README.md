# SwarmLambda

**SwarmLambda** is a **local-first, P2P, fault-tolerant edge execution
platform** inspired by AWS Lambda + API Gateway, but designed to run
**anywhere** (local machines, VMs, edge devices) with **nearest-node
execution and automatic failover**.

It uses: - **Hypercore / Corestore** for replicated function registry -
**Hyperswarm + RPC** for peer discovery and execution - **Edge nodes**
that act as both **HTTP gateway + executor** - **Local DNS / proxy**
(for dev) or **GeoDNS / Anycast** (for prod)

------------------------------------------------------------------------

## Core Concepts

### Edge

An **edge** is a single process that: - Accepts HTTP requests - Executes
functions locally - Replicates functions from peers - Fails over to
other edges if needed

Each edge runs `bin/edge.js`.

### Mesh

All edges join the same **cluster** using a shared `cluster.key`.
Function deployments are written once and replicated to all edges.

### Single Endpoint

Clients call **one hostname** (e.g. `lambda.mesh`). Routing ensures: -
HTTP request lands on the **nearest edge** - Execution happens **locally
first** - Automatic failover if the function isn't present or execution
fails

------------------------------------------------------------------------

## Repository Layout

``` text
.
├── bin/
│   ├── edge.js        # Edge node (HTTP + worker + P2P)
│   ├── dns.js         # Local DNS server (dev only)
│   ├── proxy.js       # Local single-port proxy (dev only)
│
├── lib/
│   ├── cluster.js     # Cluster key + state dirs
│   ├── p2p.js         # Hyperswarm + replication wiring
│   ├── registry.js   # Function registry (Hypercore)
│   ├── regions.js    # Region → geo + distance math
│
├── components/
│   ├── ClusterFlow.tsx  # Edge topology UI (React Flow)
│
├── .gitignore
├── package.json
├── README.md
```

------------------------------------------------------------------------

## Install

``` bash
git clone <your-repo>
cd swarm-lambda
npm install
```

------------------------------------------------------------------------

## Run Multiple Edges Locally

``` bash
export SWARMLAMBDA_CLUSTER_ID=local
export SWARMLAMBDA_CLUSTER_KEY="$(cat .swarm-lambda/local/cluster.key 2>/dev/null || true)"
```

### Edge A

``` bash
SWARMLAMBDA_NODE_NAME=edge-a \
SWARMLAMBDA_REGION=us-west-sfo \
SWARMLAMBDA_HTTP_PORT=8787 \
SWARMLAMBDA_STATE_DIR=.swarm-lambda/local/edge-a \
node bin/edge.js
```

### Edge B

``` bash
SWARMLAMBDA_NODE_NAME=edge-b \
SWARMLAMBDA_REGION=us-east-iad \
SWARMLAMBDA_HTTP_PORT=8788 \
SWARMLAMBDA_STATE_DIR=.swarm-lambda/local/edge-b \
node bin/edge.js
```

### Edge C

``` bash
SWARMLAMBDA_NODE_NAME=edge-c \
SWARMLAMBDA_REGION=eu-central-fra \
SWARMLAMBDA_HTTP_PORT=8789 \
SWARMLAMBDA_STATE_DIR=.swarm-lambda/local/edge-c \
node bin/edge.js
```

------------------------------------------------------------------------

## Local Single Endpoint (Dev)

``` bash
sudo sh -c 'echo "127.0.0.1 lambda.mesh" >> /etc/hosts'
```

Start proxy:

``` bash
SWARMLAMBDA_PROXY_PORT=8790 \
SWARMLAMBDA_EDGES="127.0.0.1:8787,127.0.0.1:8788,127.0.0.1:8789" \
node bin/proxy.js
```

------------------------------------------------------------------------

## Deploy a Function

``` bash
curl -X POST http://lambda.mesh:8790/functions \
  -H "content-type: application/json" \
  -d '{
    "name":"hello",
    "handler":"index.handler",
    "files":{"index.js":"exports.handler=async(e)=>({ok:true,e});"}
  }'
```

------------------------------------------------------------------------

## Invoke

``` bash
curl -X POST http://lambda.mesh:8790/2015-03-31/functions/hello/invocations \
  -H "content-type: application/json" \
  -d '{"name":"world"}'
```

------------------------------------------------------------------------

## Production Model

-   Run `edge.js` on multiple hosts
-   Same port everywhere
-   One DNS name (Cloudflare / Anycast / GeoDNS)
-   Client lands on nearest edge
-   Local execution + P2P failover

------------------------------------------------------------------------

## TL;DR

    One hostname → nearest edge → local execution → P2P failover
