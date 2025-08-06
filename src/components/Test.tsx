// Test.tsx
import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";

cytoscape.use(dagre);

export function Test() {
  const cyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cytoscape({
      container: cyRef.current,
      elements: [
        { data: { id: "a", label: "A" } },
        { data: { id: "b", label: "B" } },
        { data: { id: "c", label: "C" } },
        { data: { id: "ab", source: "a", target: "b" } },
        { data: { id: "bc", source: "b", target: "c" } },
      ],
      layout: {
        name: "dagre",
      },
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": "#0074D9",
            color: "#fff",
            "text-valign": "center",
            "text-halign": "center",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#ccc",
            "target-arrow-color": "#ccc",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
      ],
    });

    return () => {
      cy.destroy();
    };
  }, []);

  return (
    <div>
      <h2>📡 Cytoscape DAGRE Demo</h2>
      <div
        ref={cyRef}
        id="cy"
        style={{ width: "100%", height: "500px", border: "1px solid #ccc" }}
      />
    </div>
  );
}
