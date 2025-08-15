import { nanoid } from "nanoid";
import type { AlarmEntry, TopoEdge, TopoNode, TopologyPayload } from "./types";

export function generateSeedTopology(racks = 3): TopologyPayload {
  const nodes: TopoNode[] = [];
  const edges: TopoEdge[] = [];

  // core switches (2)
  const coreIds: string[] = ["core-1", "core-2"];
  for (const id of coreIds) {
    nodes.push({
      id,
      type: "switch",
      vendor: "NVIDIA",
      model: "SN4700",
      firmware: "24.1.3",
      az: "az-a",
      rack: "core",
      health: "good",
    });
  }

  // aggregation and edge per rack
  for (let r = 1; r <= racks; r++) {
    const aggId = `agg-r${r}`;
    nodes.push({
      id: aggId,
      type: "switch",
      vendor: "NVIDIA",
      model: "SN3700",
      firmware: "24.1.3",
      az: "az-a",
      rack: `rack-${r}`,
      health: "good",
    });

    // connect core to agg (100G)
    for (const c of coreIds) {
      edges.push(makeEdge(`${c}-${aggId}`, c, aggId, 100));
    }

    // edge switch and hosts
    const edgeId = `edge-r${r}`;
    nodes.push({
      id: edgeId,
      type: "switch",
      vendor: "NVIDIA",
      model: "SN2410",
      firmware: "24.1.3",
      az: "az-a",
      rack: `rack-${r}`,
      health: "good",
    });

    edges.push(makeEdge(`${aggId}-${edgeId}`, aggId, edgeId, 100));

    for (let h = 1; h <= 4; h++) {
      const hostId = `h${r}-${h}`;
      nodes.push({
        id: hostId,
        type: "host",
        vendor: "Supermicro",
        model: "X12",
        firmware: "1.2.3",
        az: "az-a",
        rack: `rack-${r}`,
        health: Math.random() < 0.95 ? "good" : "warn",
      });
      edges.push(makeEdge(`${edgeId}-${hostId}`, edgeId, hostId, 100));
    }
  }

  return { nodes, edges };
}

function makeEdge(id: string, source: string, target: string, speedGbps: number): TopoEdge {
  return {
    id,
    source,
    target,
    portSrc: `Eth${Math.ceil(Math.random() * 48)}`,
    portDst: `Eth${Math.ceil(Math.random() * 48)}`,
    speedGbps,
    state: Math.random() < 0.98 ? "up" : "down",
    utilPct: Math.round(Math.random() * 40 + 10),
    latencyUs: Math.round(Math.random() * 80 + 20),
  };
}

export function generateInitialAlarms(topology: TopologyPayload): AlarmEntry[] {
  const alarms: AlarmEntry[] = [];
  for (const e of topology.edges) {
    if (e.state === "down" || e.utilPct > 85) {
      alarms.push({
        id: nanoid(),
        severity: e.state === "down" ? "critical" : "major",
        entity: "edge",
        entityId: e.id,
        rule: e.state === "down" ? "LinkDown" : "HighUtilization",
        sinceISO: new Date(Date.now() - Math.floor(Math.random() * 300000)).toISOString(),
      });
    }
  }
  // add a sample node alarm
  const anyNode = topology.nodes.find((n) => n.type === "switch");
  if (anyNode) {
    alarms.push({
      id: nanoid(),
      severity: "minor",
      entity: "node",
      entityId: anyNode.id,
      rule: "FanSpeedHigh",
      sinceISO: new Date(Date.now() - 120000).toISOString(),
    });
  }
  return alarms;
}