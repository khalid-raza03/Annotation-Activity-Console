/**
 * Normalization logic for messy backend data.
 * Converts raw API payloads into the clean, typed Task model.
 * Does not throw or crash; documents decisions for unknown/invalid data.
 */

import {
  Task,
  RawTask,
  TaskType,
  NormalizedStatus,
  AssigneeValue,
  User,
  KNOWN_TASK_TYPES,
  NORMALIZED_STATUSES,
} from "./types";

/**
 * Normalize a task type.
 * If the type is not in the known set, preserve it as "unknown".
 */
function normalizeType(raw: unknown): TaskType {
  if (typeof raw === "string" && KNOWN_TASK_TYPES.includes(raw as any)) {
    return raw as TaskType;
  }
  // Log unknown types for debugging; could be 'video', null, undefined, etc.
  if (raw !== undefined && raw !== null) {
    console.warn(`[normalize] Unknown task type: ${raw}`);
  }
  return "unknown";
}

/**
 * Normalize a status.
 * Input may arrive with inconsistent casing (e.g., "InProgress", "QA", "BLOCKED").
 * Normalize to lowercase and match against known values.
 * If unrecognized, default to "todo" with a warning.
 */
export function normalizeStatus(raw: unknown): NormalizedStatus {
  if (typeof raw !== "string") {
    console.warn(`[normalize] Status is not a string: ${raw}`);
    return "todo";
  }

  const lower = raw.toLowerCase();

  // Map common variations to normalized values
  if (lower === "in_progress" || lower === "inprogress") {
    return "in_progress";
  }
  if (lower === "qa") {
    return "qa";
  }
  if (lower === "done") {
    return "done";
  }
  if (lower === "todo") {
    return "todo";
  }
  if (lower === "blocked") {
    return "blocked";
  }

  // Unknown status; default to "todo"
  console.warn(`[normalize] Unrecognized status: ${raw}`);
  return "todo";
}

/**
 * Normalize an assignee.
 * Raw may be null, an object with id and name, or something else entirely.
 * Return a User or null.
 */
function normalizeAssignee(raw: unknown): AssigneeValue {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (
    typeof raw === "object" &&
    "id" in raw &&
    "name" in raw &&
    typeof (raw as any).id === "string" &&
    typeof (raw as any).name === "string"
  ) {
    return {
      id: (raw as any).id,
      name: (raw as any).name,
    };
  }

  console.warn(`[normalize] Invalid assignee shape: ${JSON.stringify(raw)}`);
  return null;
}

/**
 * Normalize annotation count.
 * May arrive as a number or a string; always convert to number.
 * If conversion fails, default to 0.
 */
function normalizeAnnotationCount(raw: unknown): number {
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "string") {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
    console.warn(
      `[normalize] Could not parse annotationCount as number: ${raw}`
    );
    return 0;
  }
  console.warn(`[normalize] Unexpected annotationCount type: ${typeof raw}`);
  return 0;
}

/**
 * Normalize updatedAt timestamp.
 * May arrive as ISO string or epoch milliseconds.
 * Always return epoch milliseconds (number).
 * If parsing fails, use current time with a warning.
 */
function normalizeUpdatedAt(raw: unknown): number {
  if (typeof raw === "number") {
    return raw;
  }

  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) {
      return parsed;
    }
    console.warn(`[normalize] Could not parse updatedAt as date: ${raw}`);
  } else {
    console.warn(`[normalize] Unexpected updatedAt type: ${typeof raw}`);
  }

  // Fallback: use current time, but this is a data quality issue
  return Date.now();
}

/**
 * Normalize a raw task payload into the clean Task model.
 * @throws Never. Logs warnings for data quality issues.
 * @param raw The raw API payload
 * @returns A clean, typed Task
 */
export function normalizeTask(raw: RawTask): Task {
  return {
    id: raw.id,
    title: raw.title || "(untitled)",
    type: normalizeType(raw.type),
    status: normalizeStatus(raw.status),
    assignee: normalizeAssignee(raw.assignee),
    annotationCount: normalizeAnnotationCount(raw.annotationCount),
    updatedAt: normalizeUpdatedAt(raw.updatedAt),
    meta: raw.meta || {},
  };
}

/**
 * Normalize an array of raw tasks.
 * @param items Raw task array from the API
 * @returns Array of clean tasks
 */
export function normalizeTasks(items: RawTask[]): Task[] {
  return items.map(normalizeTask);
}
