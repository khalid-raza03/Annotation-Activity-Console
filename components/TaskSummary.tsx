'use client'

import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '@/lib/store'
import {
  selectSelectedTask,
  selectSummaryLoading,
  selectSummaryError,
} from '@/lib/store/selectors'
import {
  setSummaryLoading,
  setSummaryError,
} from '@/lib/store/ui'
import { renderMarkdownSafely } from '@/lib/markdown'
import { loadCachedSummary, saveCachedSummary } from '@/lib/persistence'
import { Task } from '@/lib/types'

interface TaskSummaryProps {
  apiBase?: string
}

export function TaskSummary({ apiBase = 'http://localhost:4000' }: TaskSummaryProps) {
  const dispatch = useDispatch<AppDispatch>()
  const selectedTask = useSelector(selectSelectedTask)
  const loading = useSelector(selectSummaryLoading)
  const error = useSelector(selectSummaryError)
  const [streamedContent, setStreamedContent] = useState('')
  const [isFromCache, setIsFromCache] = useState(false)
  // Keep abort controller in a ref to avoid triggering re-renders
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {

    if (abortRef.current) {
      abortRef.current.abort()
    }

    setStreamedContent('')
    setIsFromCache(false)

    if (!selectedTask) {
      dispatch(setSummaryError(null))
      dispatch(setSummaryLoading(false))
      return
    }

    const taskId = selectedTask.id
    const controller = new AbortController()
    abortRef.current = controller
    dispatch(setSummaryLoading(true))
    dispatch(setSummaryError(null))

    loadCachedSummary(taskId).then((cached) => {

      if (controller.signal.aborted) return
      if (cached) {
        setStreamedContent(cached.content)
        setIsFromCache(true)
      }
    })


    fetchSummaryStream(
      taskId,
      apiBase,
      controller.signal,
      (chunk) => {
        setIsFromCache(false) 
        setStreamedContent((prev) => prev + chunk)
      },
      (err) => {
        dispatch(setSummaryError(err))
        dispatch(setSummaryLoading(false))
      },
      (fullContent) => {
        dispatch(setSummaryLoading(false))

        saveCachedSummary(taskId, fullContent)
      }
    )

    return () => {
      controller.abort()
    }

  }, [selectedTask?.id, apiBase, dispatch])

  if (!selectedTask) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a task to view details
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
    
      <TaskDetailHeader task={selectedTask} />

      <div className="flex-1 overflow-auto p-4 bg-amber-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            AI Summary
          </h3>
          {isFromCache && (
            <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-300 px-2 py-0.5 rounded">
              cached
            </span>
          )}
          {loading && !isFromCache && (
            <span className="text-xs text-blue-500 animate-pulse">
              streaming…
            </span>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            Error loading summary: {error}
          </div>
        )}

        {loading && !streamedContent && (
          <div className="flex items-center justify-center h-24">
            <div className="text-gray-400 text-sm">Generating summary…</div>
          </div>
        )}

        {streamedContent && (
          <div className="prose prose-sm max-w-none">
            <MarkdownContent content={streamedContent} />
            {loading && (
              <span className="inline-block animate-pulse text-gray-400 ml-1">▊</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskDetailHeader({ task }: { task: Task }) {
  const statusColors: Record<string, string> = {
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    done: 'bg-green-100 text-green-800 border-green-200',
    qa: 'bg-purple-100 text-purple-800 border-purple-200',
    todo: 'bg-gray-100 text-gray-700 border-gray-200',
    blocked: 'bg-red-100 text-red-800 border-red-200',
  }
  const typeColors: Record<string, string> = {
    image: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    audio: 'bg-amber-100 text-amber-800 border-amber-200',
    text: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    unknown: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const timeAgo = formatTimeAgo(task.updatedAt)

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 text-lg leading-tight truncate">
            {task.title}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{task.id}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`text-xs font-semibold px-2 py-1 rounded border ${typeColors[task.type] ?? typeColors.unknown}`}>
          {task.type}
        </span>
        <span className={`text-xs font-semibold px-2 py-1 rounded border ${statusColors[task.status] ?? statusColors.todo}`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">Assignee</dt>
          <dd className="text-gray-800 mt-0.5">
            {task.assignee ? task.assignee.name : <span className="text-gray-400 italic">Unassigned</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">Annotations</dt>
          <dd className="text-gray-800 mt-0.5">{task.annotationCount}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">Last updated</dt>
          <dd className="text-gray-800 mt-0.5">{timeAgo}</dd>
        </div>
        {Object.keys(task.meta).length > 0 && (
          <div className="col-span-2">
            <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">Meta</dt>
            <dd className="mt-0.5 flex flex-wrap gap-1">
              {Object.entries(task.meta).map(([k, v]) => (
                <span key={k} className="text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
                  {k}: {String(v)}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const safeHtml = renderMarkdownSafely(content)

  return (
    <div
      className="prose prose-sm max-w-none prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-400 text-gray-500"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

async function fetchSummaryStream(
  taskId: string,
  apiBase: string,
  signal: AbortSignal,
  onChunk: (chunk: string) => void,
  onError: (error: string) => void,
  onComplete: (fullContent: string) => void
) {
  try {
    const url = `${apiBase}/api/tasks/${taskId}/summary`
    const response = await fetch(url, { signal })

    if (!response.ok) {
      onError(`HTTP ${response.status}`)
      return
    }

    if (!response.body) {
      onError('No response body')
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let accumulated = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })


        const lines = buffer.split('\n')
        buffer = lines.pop() || '' 

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const chunk = JSON.parse(dataStr) as string
              if (chunk) {
                accumulated += chunk
                onChunk(chunk)
              }
            } catch {

            }
          } else if (line.startsWith('event: done')) {
            reader.cancel()
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    onComplete(accumulated)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return
    }
    onError(err instanceof Error ? err.message : 'Unknown error')
  }
}
