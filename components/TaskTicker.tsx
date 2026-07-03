'use client'

import React, { useEffect, useState } from 'react'

type Task = { id: string; title: string; updatedAt: number }

/**
 * FIXED TaskTicker component.
 *
 * Bug inventory and root-cause explanations (also in DECISIONS.md):
 *
 * Bug A — Stale closure in clock effect
 *   Original: `setTick(tick + 1)` inside an effect with `[]` deps captured `tick`
 *   at its initial value (0) forever, so the counter incremented once and froze.
 *   Fix: Use the functional updater `setTick(prev => prev + 1)` — React guarantees
 *   `prev` is always the latest value, so the interval closure doesn't need to
 *   capture `tick` at all. Empty deps is now correct.
 *
 * Bug B — Two sub-bugs in the fetch effect
 *   B1: `prev.push(t)` mutates the existing state array. React compares the
 *       array reference on state update; because the reference didn't change,
 *       React bails out and does not re-render. Fix: `[...prev, t]` (new array).
 *   B2: When `selectedId` is null, the effect still fired, sending
 *       `GET /api/tasks/null` to the server. Fix: early-return guard.
 *
 * Bug C — Two sub-bugs in the render
 *   C1: `tasks.sort(...)` mutates the state array in place. Subsequent renders
 *       see an already-sorted array and React may not detect the change, causing
 *       stale list ordering. Fix: copy first with `[...tasks].sort(...)`.
 *   C2: `key={i}` (array index) causes React to reuse DOM nodes incorrectly
 *       when items are reordered, leading to mixed-up content. Fix: `key={t.id}`.
 *
 * Bug D — tick incremented but never consumed (display doesn't update)
 *   Original: `tick` was set up to force re-renders every second, but the
 *   "x seconds ago" expression `Math.floor((Date.now() - t.updatedAt) / 1000)`
 *   never references `tick`, so React optimises away the re-render (or even if
 *   it does re-render, the expression evaluates to the same value if nothing
 *   else changed). Fix: include `tick` as a dummy operand in the expression
 *   (multiplied by 0) so the render function reads it, keeping the component
 *   subscribed to its changes and guaranteeing a fresh evaluation every second.
 */

export function TaskTicker({ apiBase }: { apiBase: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // Bug A fix: functional updater avoids stale closure; empty deps is correct
  // because we only want one interval for the lifetime of this component.
  useEffect(() => {
    const id = setInterval(() => {
      setTick((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Bug B fix: guard on null selectedId; immutable state update
  useEffect(() => {
    if (!selectedId) {
      return
    }

    fetch(`${apiBase}/api/tasks/${selectedId}`)
      .then((r) => r.json())
      .then((t: Task) => {
        // B1 fix: spread to create a new array reference
        setTasks((prev) => [...prev, t])
      })
      .catch((err) => {
        console.error('[TaskTicker] Failed to fetch task:', err)
      })
  }, [selectedId, apiBase])

  // Bug C1 fix: copy before sorting to avoid mutating state
  const sorted = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <ul className="space-y-2">
      {/* Bug D fix: reference `tick` in the expression (×0 has no numeric effect
          but binds the render to the tick subscription, triggering a re-evaluation
          every second so the elapsed-time display stays current). */}
      {sorted.map((t) => (
        // Bug C2 fix: use stable task id as key, not array index
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
