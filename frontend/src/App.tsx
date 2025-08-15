import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAlarms, fetchTopology, openStreams } from './api'
import type { AlarmEntry, TopologyPayload, TopoEdge, TopoNode } from './types'
import TopologyCanvas, { TopologyHandle } from './components/TopologyCanvas'
import RightPanel from './components/RightPanel'
import AlarmPanel from './components/AlarmPanel'
import HeaderBar from './components/HeaderBar'

export type Selection = { kind: 'node'; id: string } | { kind: 'edge'; id: string } | null

export default function App() {
  const { data: topo } = useQuery<TopologyPayload>({ queryKey: ['topology'], queryFn: fetchTopology })
  const { data: initialAlarms } = useQuery<AlarmEntry[]>({ queryKey: ['alarms'], queryFn: fetchAlarms })

  const [alarms, setAlarms] = useState<AlarmEntry[]>([])
  const [selection, setSelection] = useState<Selection>(null)
  const [pathMode, setPathMode] = useState(false)
  const [pathLatencyUs, setPathLatencyUs] = useState<number | null>(null)
  const topoRef = useRef<TopologyHandle>(null)

  useEffect(() => { if (initialAlarms) setAlarms(initialAlarms) }, [initialAlarms])

  useEffect(() => {
    const ctrl = openStreams({
      onMetrics: (updates) => topoRef.current?.applyMetrics(updates),
      onAlarmNew: (a) => setAlarms((prev) => [a, ...prev]),
      onAlarmClear: (id) => setAlarms((prev) => prev.filter((x) => x.id !== id)),
    })
    return () => ctrl.close()
  }, [])

  const onAlarmClick = (a: AlarmEntry) => {
    if (a.entity === 'edge') {
      topoRef.current?.focusEdge(a.entityId)
      setSelection({ kind: 'edge', id: a.entityId })
    } else {
      topoRef.current?.focusNode(a.entityId)
      setSelection({ kind: 'node', id: a.entityId })
    }
  }

  return (
    <div className="h-full flex flex-col">
      <HeaderBar
        pathMode={pathMode}
        onTogglePath={() => setPathMode((v) => !v)}
        onSearch={(q) => topoRef.current?.applySearch(q)}
        onQuickFilter={(f) => topoRef.current?.applyQuickFilter(f)}
        onExport={(fmt) => topoRef.current?.export(fmt)}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {topo && (
            <TopologyCanvas
              ref={topoRef}
              topology={topo}
              pathMode={pathMode}
              onSelectionChange={(s) => setSelection(s)}
              onPathLatency={(v) => setPathLatencyUs(v)}
            />
          )}
        </div>
        <div className="w-[360px] border-l border-gray-200 bg-white">
          <RightPanel selection={selection} alarms={alarms} pathLatencyUs={pathLatencyUs} />
          <div className="border-t h-[50%] overflow-hidden">
            <AlarmPanel alarms={alarms} onClick={onAlarmClick} />
          </div>
        </div>
      </div>
    </div>
  )
}
