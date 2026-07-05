import localforage from 'localforage';
import { Task } from './types';

const TASKS_KEY = 'annotation:tasks:list';
const SUMMARY_PREFIX = 'annotation:summary:';

export async function initPersistence() {
  await localforage.ready().catch((err) => {
    console.warn('[persistence] IndexedDB init failed:', err);
  });
}

export function saveCachedTasks(tasks: Task[], page: number, pageSize: number, total: number) {
  localforage.setItem(TASKS_KEY, {
    tasks,
    timestamp: Date.now(),
    page,
    pageSize,
    total,
  }).catch((err) => console.warn('[persistence] Save tasks cache failed:', err));
}

export async function loadCachedTasks() {
  try {
    return await localforage.getItem<{
      tasks: Task[];
      timestamp: number;
      page: number;
      pageSize: number;
      total: number;
    }>(TASKS_KEY);
  } catch (err) {
    console.warn('[persistence] Load tasks cache failed:', err);
    return null;
  }
}

export function saveCachedSummary(taskId: string, content: string) {
  localforage.setItem(`${SUMMARY_PREFIX}${taskId}`, {
    content,
    timestamp: Date.now(),
  }).catch((err) => console.warn(`[persistence] Save summary cache failed for ${taskId}:`, err));
}

export async function loadCachedSummary(taskId: string) {
  try {
    return await localforage.getItem<{ content: string; timestamp: number }>(`${SUMMARY_PREFIX}${taskId}`);
  } catch (err) {
    console.warn(`[persistence] Load summary cache failed for ${taskId}:`, err);
    return null;
  }
}

export async function clearAllCaches() {
  try {
    const keys = await localforage.keys();
    const targets = keys.filter((key) => key.startsWith('annotation:'));
    await Promise.all(targets.map((key) => localforage.removeItem(key)));
  } catch (err) {
    console.warn('[persistence] Clear caches failed:', err);
  }
}
