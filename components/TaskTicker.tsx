'use client'

import React, { useEffect, useState } from 'react'

type Task = { id: string; title: string; updatedAt: number }

export function TaskTicker({ apiBase }: { apiBase: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setTick((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])


  useEffect(() => {
    if (!selectedId) {
      return
    }

    fetch(`${apiBase}/api/tasks/${selectedId}`)
      .then((r) => r.json())
      .then((t: Task) => {

        setTasks((prev) => [...prev, t])
      })
      .catch((err) => {
        console.error('[TaskTicker] Failed to fetch task:', err)
      })
  }, [selectedId, apiBase])


  const sorted = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <ul className="space-y-2">
      {sorted.map((t) => (

        <li
          key={t.id}
          onClick={() => setSelectedId(t.id)}
          className="p-2 border rounded cursor-pointer hover:bg-gray-50"
        >
          {t.title} (updated {Math.floor((Date.now() - t.updatedAt) / 1000) + tick * 0}s ago)
        </li>
      ))}
    </ul>
  )
}
