import React, { useState } from 'react'
import type { TopoEdge } from '../types'
import type { QuickFilter } from './TopologyCanvas'

export default function HeaderBar({ pathMode, onTogglePath, onSearch, onQuickFilter, onExport }:{
  pathMode: boolean
  onTogglePath: () => void
  onSearch: (q: string) => void
  onQuickFilter: (f: QuickFilter | null) => void
  onExport: (fmt: 'png' | 'svg') => void
}){
  const [q, setQ] = useState('')
  return (
    <div className="flex items-center gap-2 p-2 border-b bg-white">
      <button className={`px-3 py-1 rounded ${pathMode ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={onTogglePath}>경로 추적 모드</button>
      <input className="border rounded px-2 py-1 w-80" placeholder="검색: id/모델/랙/존" value={q} onChange={(e)=>{ setQ(e.target.value); onSearch(e.target.value) }} />
      <div className="ml-2 flex items-center gap-2">
        <span className="text-sm text-gray-600">퀵 필터:</span>
        <select className="border rounded px-2 py-1" onChange={(e)=> onQuickFilter(e.target.value as QuickFilter)}>
          <option value="">없음</option>
          <option value="uplinks">업링크만</option>
          <option value="speed100">속도≥100G</option>
        </select>
      </div>
      <div className="flex-1" />
      <button className="px-2 py-1 border rounded" onClick={()=>onExport('png')}>Export PNG</button>
      <button className="px-2 py-1 border rounded" onClick={()=>onExport('svg')}>Export SVG</button>
    </div>
  )
}