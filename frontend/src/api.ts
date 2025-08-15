import type { AlarmEntry, MetricsTick, TopologyPayload } from "./types";

const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:5174";

export async function fetchTopology(): Promise<TopologyPayload> {
  const res = await fetch(`${SERVER}/topology`);
  if (!res.ok) throw new Error("Failed to fetch topology");
  return res.json();
}

export async function fetchAlarms(): Promise<AlarmEntry[]> {
  const res = await fetch(`${SERVER}/alarms`);
  if (!res.ok) throw new Error("Failed to fetch alarms");
  return res.json();
}

export type WSHandlers = {
  onMetrics?: (updates: MetricsTick[]) => void;
  onAlarmNew?: (a: AlarmEntry) => void;
  onAlarmClear?: (id: string) => void;
  onStatus?: (s: "connected" | "disconnected" | "reconnecting") => void;
};

export function openStreams(h: WSHandlers) {
  const makeWS = (path: string) => {
    let retry = 0;
    let ws: WebSocket | null = null;

    const connect = () => {
      h.onStatus?.("reconnecting");
      ws = new WebSocket(`${SERVER.replace(/^http/, "ws")}${path}`);
      ws.onopen = () => {
        retry = 0;
        h.onStatus?.("connected");
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "metrics" && h.onMetrics) h.onMetrics(msg.updates);
          if (msg.type === "alarm:new" && h.onAlarmNew) h.onAlarmNew(msg.alarm);
          if (msg.type === "alarm:clear" && h.onAlarmClear) h.onAlarmClear(msg.id);
        } catch (e) {}
      };
      ws.onclose = () => {
        h.onStatus?.("disconnected");
        retry = Math.min(5, retry + 1);
        setTimeout(connect, 500 * retry * retry + 500);
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    return { close: () => ws?.close() };
  };

  const m = makeWS("/metrics/stream");
  const a = makeWS("/alarms/stream");
  return { close: () => { m.close(); a.close(); } };
}