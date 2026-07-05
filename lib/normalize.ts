import { Task, RawTask, TaskType, NormalizedStatus, User } from './types';

const STATUS_MAP: Record<string, NormalizedStatus> = {
  inprogress: NormalizedStatus.IN_PROGRESS,
  in_progress: NormalizedStatus.IN_PROGRESS,
  done: NormalizedStatus.DONE,
  qa: NormalizedStatus.QA,
  todo: NormalizedStatus.TODO,
  blocked: NormalizedStatus.BLOCKED,
};

export function normalizeStatus(raw: unknown): NormalizedStatus {
  if (typeof raw !== 'string') {
    console.warn(`[normalize] Status is not a string: ${raw}`);
    return NormalizedStatus.TODO;
  }

  const normalized = STATUS_MAP[raw.toLowerCase()];
  if (!normalized) {
    console.warn(`[normalize] Unrecognized status: ${raw}`);
    return NormalizedStatus.TODO;
  }
  return normalized;
}

function normalizeType(raw: unknown): TaskType {
  const typeStr = String(raw);
  if (typeStr === 'image' || typeStr === 'audio' || typeStr === 'text') {
    return typeStr;
  }
  if (raw !== undefined && raw !== null) {
    console.warn(`[normalize] Unknown task type: ${raw}`);
  }
  return 'unknown';
}

export function normalizeAssignee(raw: unknown): User | null {
  if (raw && typeof raw === 'object' && 'id' in raw && 'name' in raw) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.id === 'string' && typeof obj.name === 'string') {
      return { id: obj.id, name: obj.name };
    }
  }
  if (raw !== null && raw !== undefined) {
    console.warn('[normalize] Invalid assignee shape:', raw);
  }
  return null;
}

function normalizeAnnotationCount(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function normalizeUpdatedAt(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    return isNaN(parsed) ? Date.now() : parsed;
  }
  return Date.now();
}

export function normalizeTask(raw: RawTask): Task {
  return {
    id: raw.id,
    title: raw.title || '(untitled)',
    type: normalizeType(raw.type),
    status: normalizeStatus(raw.status),
    assignee: normalizeAssignee(raw.assignee),
    annotationCount: normalizeAnnotationCount(raw.annotationCount),
    updatedAt: normalizeUpdatedAt(raw.updatedAt),
    meta: raw.meta || {},
  };
}

export function normalizeTasks(items: RawTask[]): Task[] {
  return items.map(normalizeTask);
}
