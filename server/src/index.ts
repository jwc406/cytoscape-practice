import Fastify from "fastify";
import cors from "@fastify/cors";
import { WebSocketServer } from "ws";
import { generateInitialAlarms, generateSeedTopology } from "./seed";
import type { AlarmEntry, MetricsTick, TopologyPayload } from "./types";

const PORT = Number(process.env.PORT || 5174);

const app = Fastify({ logger: false });
let topology: TopologyPayload = generateSeedTopology(4);
let alarms: AlarmEntry[] = generateInitialAlarms(topology);

app.get("/topology", async () => topology);
app.get("/alarms", async () => alarms);
app.get("/health", async () => ({ ok: true }));

async function start() {
  await app.register(cors, { origin: true });
  await app.listen({ port: PORT, host: "0.0.0.0" });

  const wss = new WebSocketServer({ server: app.server });
  wss.on("connection", (socket, req) => {
    const url = req.url || "";
    if (url.startsWith("/metrics/stream")) {
      handleMetricsStream(socket);
    } else if (url.startsWith("/alarms/stream")) {
      handleAlarmStream(socket);
    } else {
      socket.close();
    }
  });

  console.log(`Server listening on http://localhost:${PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

function handleMetricsStream(ws: import("ws").WebSocket) {
  let alive = true;
  ws.on("close", () => {
    alive = false;
  });

  const sendTick = () => {
    if (!alive) return;
    const edges = topology.edges;
    const batch = sample(edges, Math.max(1, Math.floor(edges.length * 0.2)));
    const now = Date.now();
    const updates: MetricsTick[] = batch.map((e) => {
      const util = clamp(e.utilPct + (Math.random() * 10 - 5), 0, 100);
      const latency = clamp(e.latencyUs + (Math.random() * 10 - 5), 10, 500);
      e.utilPct = Math.round(util);
      e.latencyUs = Math.round(latency);
      return {
        ts: now,
        edgeId: e.id,
        utilPct: e.utilPct,
        latencyUs: e.latencyUs,
        errors: Math.random() < 0.02 ? 1 : 0,
      };
    });
    ws.send(JSON.stringify({ type: "metrics", updates }));
  };

  const interval = setInterval(sendTick, 1000);
  ws.on("close", () => clearInterval(interval));
}

function handleAlarmStream(ws: import("ws").WebSocket) {
  let alive = true;
  ws.on("close", () => {
    alive = false;
  });

  const tick = () => {
    if (!alive) return;
    if (Math.random() < 0.5 && topology.edges.length) {
      const e = topology.edges[Math.floor(Math.random() * topology.edges.length)];
      const newAlarm: AlarmEntry = {
        id: `${e.id}-${Date.now()}`,
        severity: e.state === "down" ? "critical" : "major",
        entity: "edge",
        entityId: e.id,
        rule: e.state === "down" ? "LinkDown" : "HighUtilization",
        sinceISO: new Date().toISOString(),
      };
      alarms.push(newAlarm);
      ws.send(JSON.stringify({ type: "alarm:new", alarm: newAlarm }));
    } else if (alarms.length) {
      const idx = Math.floor(Math.random() * alarms.length);
      const cleared = alarms.splice(idx, 1)[0];
      ws.send(JSON.stringify({ type: "alarm:clear", id: cleared.id }));
    }
  };

  const interval = setInterval(tick, 5000);
  ws.on("close", () => clearInterval(interval));
}

function sample<T>(arr: T[], count: number): T[] {
  const copy = arr.slice();
  const out: T[] = [];
  for (let i = 0; i < count && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}