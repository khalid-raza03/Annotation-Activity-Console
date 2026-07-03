'use client'

import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useRef, useState } from 'react'
import { AppDispatch } from '@/lib/store'
import {
  selectPaginatedTasks,
  selectSelectedTaskId,
  selectTasksLoading,
} from '@/lib/store/selectors'
import { selectTask } from '@/lib/store/ui'
import { Task } from '@/lib/types'

export function TaskList() {
  const dispatch = useDispatch<AppDispatch>()
  const tasks = useSelector(selectPaginatedTasks)
  const selectedId = useSelector(selectSelectedTaskId)
  const loading = useSelector(selectTasksLoading)

  // Track which task IDs were recently live-updated so we can flash them
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set())
  const prevUpdatedAt = useRef<Record<string, number>>({})

  useEffect(() => {
    const newlyUpdated: string[] = []

    for (const task of tasks) {
      const prev = prevUpdatedAt.current[task.id]
      // A task is "recently updated" if its updatedAt changed since last render
      if (prev !== undefined && prev !== task.updatedAt) {
        newlyUpdated.push(task.id)
      }
      prevUpdatedAt.current[task.id] = task.updatedAt
    }

    if (newlyUpdated.length > 0) {
      setRecentlyUpdated((prev) => {
        const next = new Set(prev)
        newlyUpdated.forEach((id) => next.add(id))
        return next
      })

      // Remove the flash class after 1.5 s
      const timer = setTimeout(() => {
        setRecentlyUpdated((prev) => {
          const next = new Set(prev)
          newlyUpdated.forEach((id) => next.delete(id))
          return next
        })
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [tasks])

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-500">Loading tasks…</div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-500">No tasks found</div>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-2">
      {tasks.map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          isSelected={task.id === selectedId}
          isRecentlyUpdated={recentlyUpdated.has(task.id)}
          onSelect={() => dispatch(selectTask(task.id))}
        />
      ))}
    </div>
  )
}

interface TaskListItemProps {
  task: Task
  isSelected: boolean
  isRecentlyUpdated: boolean
  onSelect: () => void
}

function TaskListItem({ task, isSelected, isRecentlyUpdated, onSelect }: TaskListItemProps) {
  const statusColors: Record<string, string> = {
    in_progress: 'bg-blue-100 text-blue-800',
    done: 'bg-green-100 text-green-800',
    qa: 'bg-purple-100 text-purple-800',
    todo: 'bg-gray-100 text-gray-800',
    blocked: 'bg-red-100 text-red-800',
  }

  const typeColors: Record<string, string> = {
    image: 'bg-indigo-100 text-indigo-800',
    audio: 'bg-amber-100 text-amber-800',
    text: 'bg-cyan-100 text-cyan-800',
    unknown: 'bg-gray-100 text-gray-600',
  }

  const timeAgo = getTimeAgo(task.updatedAt)

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 border rounded-lg cursor-pointer transition-all duration-200
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : isRecentlyUpdated
          ? 'border-green-400 bg-green-50 shadow-sm ring-2 ring-green-300'
          : 'border-gray-200 bg-white hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {task.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            ID: {task.id}
          </p>
        </div>
        {isRecentlyUpdated && (
          <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded font-medium">
            live
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <span className={`text-xs font-medium px-2 py-1 rounded ${typeColors[task.type] ?? typeColors.unknown}`}>
          {task.type}
        </span>
        <span className={`text-xs font-medium px-2 py-1 rounded ${statusColors[task.status] ?? statusColors.todo}`}>
          {task.status}
        </span>
        {task.assignee && (
          <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-800">
            {task.assignee.name}
          </span>
        )}
      </div>

      <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
        <span>{task.annotationCount} annotations</span>
        <span>{timeAgo}</span>
      </div>
    </div>
  )
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'now'
}
