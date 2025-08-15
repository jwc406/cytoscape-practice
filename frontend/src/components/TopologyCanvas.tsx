import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import cytoscape, { Core, EdgeSingular, NodeSingular } from 'cytoscape'
import navigator from 'cytoscape-navigator'
import dagre from 'cytoscape-dagre'
import popper from 'cytoscape-popper'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import elk from 'elkjs/lib/elk.bundled.js'
import type { MetricsTick, TopologyPayload } from '../types'
import svg from 'cytoscape-svg'

cytoscape.use(navigator)
cytoscape.use(dagre)
cytoscape.use(popper)
cytoscape.use(svg as any)

const ELK = new (elk as any)()

export type QuickFilter = 'hasAlarm' | 'uplinks' | 'speed100'

export type TopologyHandle = {
  applyMetrics: (updates: MetricsTick[]) => void
  focusNode: (id: string) => void
  focusEdge: (id: string) => void
  applySearch: (q: string) => void
  applyQuickFilter: (f: QuickFilter | null) => void
  export: (fmt: 'png' | 'svg') => void
}

interface Props {
  topology: TopologyPayload
  pathMode: boolean
  onSelectionChange: (s: { kind: 'node' | 'edge'; id: string } | null) => void
  onPathLatency: (v: number | null) => void
}

const TopologyCanvas = forwardRef<TopologyHandle, Props>(function TopologyCanvas(
  { topology, pathMode, onSelectionChange, onPathLatency }, ref,
) {
  const cyRef = useRef<HTMLDivElement>(null)
  const cyInstance = useRef<Core | null>(null)
  const tipMap = useRef<Map<string, TippyInstance>>(new Map())
  const miniRef = useRef<HTMLDivElement>(null)
  const selection = useRef<{ first?: NodeSingular } | null>(null)
  const quickFilter = useRef<QuickFilter | null>(null)
  const searchQuery = useRef<string>('')

  useEffect(() => {
    if (!cyRef.current) return
    const cy = cytoscape({
      container: cyRef.current,
      wheelSensitivity: 0.25,
      selectionType: 'additive',
      style: [
        { selector: 'node', style: {
          'background-color': (n) => n.data('type') === 'switch' ? '#2563eb' : '#16a34a',
          label: 'data(id)', color: '#111', 'text-outline-color': '#fff', 'text-outline-width': 2,
          'font-size': 10,
        } },
        { selector: 'edge', style: {
          width: (e) => widthByUtil(e.data('utilPct')),
          'line-color': (e) => colorByUtil(e.data('utilPct')),
          'target-arrow-shape': 'triangle', 'target-arrow-color': (e) => colorByUtil(e.data('utilPct')),
          'curve-style': 'bezier',
        } },
        { selector: 'edge[state = "down"]', style: {
          'line-style': 'dashed', 'line-color': '#9ca3af', 'target-arrow-color': '#9ca3af'
        } },
        { selector: '.highlighted', style: { 'line-color': '#ef4444', 'target-arrow-color': '#ef4444', width: 6 } },
        { selector: '.faded', style: { opacity: 0.2 } },
      ],
    })
    cyInstance.current = cy

    // elements
    cy.add(
      topology.nodes.map((n) => ({ data: { ...n } }))
        .concat(topology.edges.map((e) => ({ data: { ...e } })))
    )

    // tooltips on edges
    cy.edges().forEach((e) => attachTooltip(e))

    // minimap
    if (miniRef.current) {
      ;(cy as any).navigator({ container: miniRef.current })
    }

    // selection handling
    cy.on('select', 'node,edge', (evt) => {
      const ele = evt.target as NodeSingular | EdgeSingular
      if (pathMode && ele.isNode()) {
        if (!selection.current?.first) {
          selection.current = { first: ele }
        } else {
          const first = selection.current.first
          if (first && first.id() !== ele.id()) {
            highlightPath(first, ele)
          }
          selection.current = {}
        }
      }
      onSelectionChange(ele.isNode() ? { kind: 'node', id: ele.id() } : { kind: 'edge', id: ele.id() })
    })

    cy.on('unselect', 'node,edge', () => onSelectionChange(null))

    layoutWithELK(cy, topology)

    return () => {
      tipMap.current.forEach((t) => t.destroy())
      cy.destroy()
    }
  }, [topology])

  useEffect(() => {
    // when path mode toggles, clear highlights
    const cy = cyInstance.current
    if (!cy) return
    cy.elements().removeClass('highlighted faded')
    onPathLatency(null)
    selection.current = {}
  }, [pathMode])

  useImperativeHandle(ref, () => ({
    applyMetrics(updates) {
      const cy = cyInstance.current
      if (!cy) return
      cy.startBatch()
      updates.forEach((u) => {
        const e = cy.getElementById(u.edgeId)
        if (e && e.nonempty()) {
          e.data('utilPct', u.utilPct)
          e.data('latencyUs', u.latencyUs)
          const tip = tipMap.current.get(e.id())
          if (tip) tip.setContent(tooltipHtml(e))
        }
      })
      cy.endBatch()
    },
    focusNode(id) { const cy = cyInstance.current; if (cy) fitHighlight(cy, cy.getElementById(id)) },
    focusEdge(id) { const cy = cyInstance.current; if (cy) fitHighlight(cy, cy.getElementById(id)) },
    applySearch(q) { searchQuery.current = q; refilter() },
    applyQuickFilter(f) { quickFilter.current = f; refilter() },
    export(fmt) {
      const cy = cyInstance.current
      if (!cy) return
      if (fmt === 'png') {
        const blob = dataURLtoBlob(cy.png({ scale: 2 }))
        downloadBlob(blob, 'topology.png')
      } else {
        const svgStr = (cy as any).svg({ scale: 1 })
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
        downloadBlob(blob, 'topology.svg')
      }
    }
  }), [])

  function refilter() {
    const cy = cyInstance.current
    if (!cy) return
    const q = searchQuery.current.toLowerCase()
    const f = quickFilter.current
    cy.nodes().forEach((n) => {
      let visible = true
      if (q) {
        const text = [n.id(), n.data('model'), n.data('rack'), n.data('az')].filter(Boolean).join(' ').toLowerCase()
        visible = text.includes(q)
      }
      if (visible && f === 'uplinks') visible = n.data('type') === 'switch'
      n.style('display', visible ? 'element' : 'none')
    })
    cy.edges().forEach((e) => {
      let visible = e.source().style('display') !== 'none' && e.target().style('display') !== 'none'
      if (visible && f === 'speed100') visible = e.data('speedGbps') >= 100
      e.style('display', visible ? 'element' : 'none')
    })
  }

  function highlightPath(a: NodeSingular, b: NodeSingular) {
    const cy = cyInstance.current!
    cy.elements().removeClass('highlighted faded')
    const d = cy.elements().dijkstra({ root: a, weight: (edge) => edge.data('latencyUs') || 1 })
    const path = d.pathTo(b)
    const total = path.edges().reduce((acc, e) => acc + (e.data('latencyUs') || 0), 0)
    onPathLatency(total)
    path.addClass('highlighted')
    cy.elements().not(path).addClass('faded')
    cy.fit(path, 50)
  }

  function attachTooltip(e: EdgeSingular) {
    const ref = e.popperRef()
    const t = tippy(document.createElement('div'), {
      getReferenceClientRect: ref.getBoundingClientRect,
      content: tooltipHtml(e),
      trigger: 'manual',
      placement: 'top',
      hideOnClick: false,
      theme: 'light-border',
    })
    tipMap.current.set(e.id(), t)
    e.on('mouseover', () => t.show())
    e.on('mouseout', () => t.hide())
  }

  function tooltipHtml(e: EdgeSingular) {
    const util = e.data('utilPct')
    const lat = e.data('latencyUs')
    return `<div><div><b>${e.id()}</b></div><div>Util: ${util}%</div><div>Latency: ${lat} µs</div></div>`
  }

  return (
    <div className="w-full h-full">
      <div ref={cyRef} className="absolute inset-0" />
      <div ref={miniRef} className="absolute bottom-2 right-2 w-48 h-32 bg-white/80 border rounded" />
    </div>
  )
})

export default TopologyCanvas

function widthByUtil(u: number) { return 1 + Math.round((u / 100) * 7) }
function colorByUtil(u: number) {
  // green-yellow-red
  const r = Math.round(Math.min(255, (u / 100) * 255))
  const g = Math.round(Math.min(255, ((100 - Math.abs(u - 50) * 2) / 100) * 255))
  const b = 64
  return `rgb(${r},${g},${b})`
}

function fitHighlight(cy: Core, ele: any) {
  if (!ele || ele.empty()) return
  cy.elements().removeClass('highlighted faded')
  ele.addClass('highlighted')
  cy.elements().not(ele).addClass('faded')
  cy.fit(ele, 80)
}

async function layoutWithELK(cy: Core, topo: TopologyPayload) {
  const elkGraph = {
    id: 'root',
    layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT' },
    children: topo.nodes.map((n) => ({ id: n.id, width: 80, height: 30 })),
    edges: topo.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  }
  const res = await (ELK as any).layout(elkGraph)
  const positions: Record<string, { x: number, y: number }> = {}
  for (const c of res.children || []) positions[c.id] = { x: c.x, y: c.y }
  cy.startBatch()
  cy.nodes().forEach((n) => {
    const p = positions[n.id()]
    if (p) n.position(p)
  })
  cy.endBatch()
  cy.fit(undefined, 50)
}

function dataURLtoBlob(dataURL: string) {
  const byteString = atob(dataURL.split(',')[1])
  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
  return new Blob([ab], { type: mimeString })
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}