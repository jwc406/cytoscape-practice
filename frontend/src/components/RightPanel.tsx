import React, { useMemo } from 'react'
import type { AlarmEntry } from '../types'

export default function RightPanel({ selection, alarms, pathLatencyUs }:{
  selection: { kind: 'node' | 'edge'; id: string } | null
  alarms: AlarmEntry[]
  pathLatencyUs: number | null
}){
  const alarmCount = useMemo(() => selection ? alarms.filter(a => a.entityId === selection.id).length : 0, [alarms, selection])
  return (
    <div className="h-[50%] p-3 overflow-auto">
      <h3 className="font-semibold mb-2">상세</h3>
      {selection ? (
        <div className="text-sm">
          <div className="mb-1">ID: <b>{selection.id}</b></div>
          <div className="mb-1">유형: {selection.kind}</div>
          <div className="mb-1">관련 알람: {alarmCount}건</div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">선택된 엔티티 없음</div>
      )}
      <div className="mt-3 p-2 rounded bg-gray-50 border">
        <div className="text-sm">경로 총 지연: <b>{pathLatencyUs != null ? `${pathLatencyUs} µs` : '-'}</b></div>
      </div>
    </div>
  )
}