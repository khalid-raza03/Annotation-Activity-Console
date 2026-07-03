/**
 * IndexedDB persistence layer for caching task data.
 * Uses localforage for a simple, browser-compatible interface.
 *
 * Strategy:
 * - Cache the most recent task list response
 * - Tag cached data with a timestamp so we know when it was fetched
 * - On reload, show cached data immediately (mark as "cached")
 * - Revalidate from the server in the background
 * - Cache streamed summaries by task ID for quick revisits
 */

import localforage from 'localforage'
import { Task } from './types'

const TASKS_CACHE_KEY = 'annotation:tasks:list'
const SUMMARY_CACHE_KEY_PREFIX = 'annotation:summary:'
const CACHE_METADATA_KEY = 'annotation:cache:metadata'

interface CachedTasksData {
  tasks: Task[]
  timestamp: number
  page: number
  pageSize: number
  total: number
}

interface CacheMetadata {
  lastUpdated: number
  version: number
}

/**
 * Initialize IndexedDB store
 */
export async function initPersistence() {
  try {
    await localforage.ready()
  } catch (err) {
    console.warn('[persistence] Failed to initialize IndexedDB:', err)
  }
}

/**
 * Save task list to cache
 * Non-blocking: errors are logged but don't throw
 */
export async function saveCachedTasks(
  tasks: Task[],
  page: number,
  pageSize: number,
  total: number
) {
  try {
    const data: CachedTasksData = {
      tasks,
      timestamp: Date.now(),
      page,
      pageSize,
      total,
    }

    // Write in background, don't await on critical path
    localforage.setItem(TASKS_CACHE_KEY, data).catch((err) => {
      console.warn('[persistence] Failed to save tasks cache:', err)
    })

    // Update metadata
    const metadata: CacheMetadata = {
      lastUpdated: Date.now(),
      version: 1,
    }
    localforage.setItem(CACHE_METADATA_KEY, metadata).catch((err) => {
      console.warn('[persistence] Failed to save cache metadata:', err)
    })
  } catch (err) {
    console.warn('[persistence] Error in saveCachedTasks:', err)
  }
}

/**
 * Load cached task list, if available
 */
export async function loadCachedTasks(): Promise<CachedTasksData | null> {
  try {
    const data = await localforage.getItem<CachedTasksData>(TASKS_CACHE_KEY)
    return data
  } catch (err) {
    console.warn('[persistence] Failed to load tasks cache:', err)
    return null
  }
}

/**
 * Check if cached data is stale (older than N seconds)
 */
export function isCacheStale(timestamp: number, maxAge: number = 300000): boolean {
  // Default to 5 minutes
  return Date.now() - timestamp > maxAge
}

/**
 * Save streamed summary to cache
 * Useful for re-viewing the same task without re-requesting the summary
 */
export async function saveCachedSummary(taskId: string, content: string) {
  try {
    const key = `${SUMMARY_CACHE_KEY_PREFIX}${taskId}`
    const data = {
      content,
      timestamp: Date.now(),
    }

    localforage.setItem(key, data).catch((err) => {
      console.warn(`[persistence] Failed to save summary cache for ${taskId}:`, err)
    })
  } catch (err) {
    console.warn('[persistence] Error in saveCachedSummary:', err)
  }
}

/**
 * Load cached summary for a task
 */
export async function loadCachedSummary(
  taskId: string
): Promise<{ content: string; timestamp: number } | null> {
  try {
    const key = `${SUMMARY_CACHE_KEY_PREFIX}${taskId}`
    const data = await localforage.getItem<{ content: string; timestamp: number }>(key)
    return data
  } catch (err) {
    console.warn(`[persistence] Failed to load summary cache for ${taskId}:`, err)
    return null
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches() {
  try {
    const keys = await localforage.keys()
    const annotationKeys = keys.filter((k) => k.startsWith('annotation:'))

    for (const key of annotationKeys) {
      await localforage.removeItem(key)
    }

    console.log('[persistence] Cleared all annotation caches')
  } catch (err) {
    console.warn('[persistence] Failed to clear caches:', err)
  }
}
