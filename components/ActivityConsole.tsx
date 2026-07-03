'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/lib/store'
import { fetchTasks, setCachedTasks } from '@/lib/store/tasks'
import {
  selectTasksLoading,
  selectTasksError,
  selectTasksCount,
  selectPaginationInfo,
} from '@/lib/store/selectors'
import { useTaskFeed } from '@/hooks/useTaskFeed'
import {
  initPersistence,
  loadCachedTasks,
  saveCachedTasks,
} from '@/lib/persistence'
import { TaskFilters } from './TaskFilters'
import { TaskList } from './TaskList'
import { TaskPagination } from './TaskPagination'
import { TaskSummary } from './TaskSummary'

interface ActivityConsoleProps {
  apiBase?: string
  wsBase?: string
}

export function ActivityConsole({
  apiBase = 'http://localhost:4000',
  wsBase = 'ws://localhost:4000',
}: ActivityConsoleProps) {
  const dispatch = useDispatch<AppDispatch>()
  const loading = useSelector(selectTasksLoading)
  const error = useSelector(selectTasksError)
  const tasksCount = useSelector(selectTasksCount)
  const pagination = useSelector(selectPaginationInfo)
  const currentPage = useSelector((state: RootState) => state.tasks.currentPage)
  const pageSize = useSelector((state: RootState) => state.tasks.pageSize)

  // True while we are showing cached data and the live fetch has not yet completed
  const [isShowingCachedData, setIsShowingCachedData] = useState(false)

  // Initialize persistence, hydrate from cache, then fetch fresh data
  useEffect(() => {
    const init = async () => {
      await initPersistence()

      // Try to load cached task list and show it immediately
      const cached = await loadCachedTasks()
      if (cached && cached.tasks.length > 0) {
        dispatch(setCachedTasks(cached.tasks))
        setIsShowingCachedData(true)
        console.log(
          `[ActivityConsole] Loaded ${cached.tasks.length} tasks from cache (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`
        )
      }

      // Always fetch fresh data in the background
      const result = await dispatch(
        fetchTasks({ page: 1, pageSize: 20, apiBase })
      )

      // Once fresh data is in, we are no longer showing stale cached data
      setIsShowingCachedData(false)

      // Persist the fresh task list so the next reload is fast
      if (fetchTasks.fulfilled.match(result)) {
        saveCachedTasks(
          result.payload.tasks,
          result.payload.page,
          result.payload.pageSize,
          result.payload.total
        )
      }
    }

    init()
  }, [dispatch, apiBase])

  // Subscribe to real-time WebSocket feed
  useTaskFeed({ enabled: true, wsBase })

  const firstItem = Math.min((currentPage - 1) * pageSize + 1, pagination.total)
  const lastItem = Math.min(currentPage * pageSize, pagination.total)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-linear-to-r  from-blue-500 to-blue-300  text-white p-6 shadow-md shrink-0">
        <h1 className="text-xl md:text-3xl font-bold">Annotation Activity Console</h1>
        <p className="text-blue-100 mt-1 md:text-base text-sm">Real-time task management and monitoring</p>
      </header>

      {/* Stale cache banner — visible until the live fetch completes */}
      {isShowingCachedData && (
        <div
          role="status"
          aria-live="polite"
          className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 text-sm text-yellow-800 flex items-center gap-2 shrink-0"
        >
          <span className="animate-spin inline-block text-yellow-500">⟳</span>
          Showing cached data — refreshing from server…
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex min-h-0 md:flex-row flex-col">
        {/* Left sidebar: Filters and list */}
        <div className="md:w-96 w-full border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          {/* Filters */}
          <div className="shrink-0 p-4 border-b border-gray-200 bg-gray-50 overflow-y-auto max-h-96">
            <TaskFilters />
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-auto max-h-72 overflow-y-auto">
            <h3 className='text-lg lg:text-xl  text-blue-500 font-bold text-center py-3 border-b border-blue-300'>TASK LIST</h3>
            {error && (
              <div className="p-4 bg-red-50 border-b border-red-200 text-red-800 text-sm">
                Error: {error}
              </div>
            )}

            {loading && tasksCount === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading tasks…</div>
              </div>
            ) : (
              <TaskList />
            )}
          </div>

          {/* Pagination */}
          {pagination.total > 0 && <TaskPagination />}
        </div>

        {/* Right panel: Task details and summary */}
        <div className="flex-1 overflow-auto bg-white min-w-0">
          <h3 className='text-lg lg:text-2xl border-b border-blue-400  text-blue-500 font-bold text-center py-3'>Summary of Selected Task </h3>
          <TaskSummary apiBase={apiBase} />
        </div>
      </div>

      {/* Status bar */}
      <footer className="bg-gray-100 border-t border-gray-200 px-6 py-3 text-sm text-gray-600 shrink-0">
        <div className="flex justify-between items-center">
          <div>
            {pagination.total > 0
              ? `Showing ${firstItem}–${lastItem} of ${pagination.total} tasks`
              : 'No tasks'}
          </div>
          <div className="text-xs text-gray-500">
            Page {pagination.page}/{pagination.totalPages}
          </div>
        </div>
      </footer>
    </div>
  )
}
