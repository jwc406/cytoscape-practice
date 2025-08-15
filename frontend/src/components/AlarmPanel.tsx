import React from 'react'
import type { AlarmEntry } from '../types'

export default function AlarmPanel({ alarms, onClick }:{ alarms: AlarmEntry[]; onClick: (a: AlarmEntry)=>void }){
  return (
    <div className="h-full flex flex-col">
      <div className="p-2 font-semibold">알람</div>
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th className="text-left p-2">심각도</th>
              <th className="text-left p-2">엔티티</th>
              <th className="text-left p-2">규칙</th>
              <th className="text-left p-2">since</th>
            </tr>
          </thead>
          <tbody>
            {alarms.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={()=>onClick(a)}>
                <td className="p-2">{a.severity}</td>
                <td className="p-2">{a.entity}:{a.entityId}</td>
                <td className="p-2">{a.rule}</td>
                <td className="p-2">{new Date(a.sinceISO).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}