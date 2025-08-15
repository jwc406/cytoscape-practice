export type NodeType = "switch" | "host";

export interface TopoNode {
  id: string;
  type: NodeType;
  vendor?: string;
  model?: string;
  firmware?: string;
  az?: string;
  rack?: string;
  health: "good" | "warn" | "bad";
}

export interface TopoEdge {
  id: string;
  source: string;
  target: string;
  portSrc?: string;
  portDst?: string;
  speedGbps: number;
  state: "up" | "down";
  utilPct: number; // 0~100
  latencyUs: number;
}

export interface AlarmEntry {
  id: string;
  severity: "critical" | "major" | "minor" | "warn";
  entity: "node" | "edge";
  entityId: string;
  rule: string;
  sinceISO: string;
  acked?: boolean;
}

export interface MetricsTick {
  ts: number; // epoch ms
  edgeId: string;
  utilPct: number;
  latencyUs: number;
  errors: number;
}

export interface TopologyPayload {
  nodes: TopoNode[];
  edges: TopoEdge[];
}