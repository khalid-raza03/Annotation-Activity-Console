/**
 * Domain types for the annotation activity console.
 * These represent cleaned, normalized data from the messy backend API.
 */

// Known task types; unknown types are preserved as 'unknown'
export const KNOWN_TASK_TYPES = ["image", "audio", "text"] as const;
export type KnownTaskType = (typeof KNOWN_TASK_TYPES)[number];
export type TaskType = KnownTaskType | "unknown";

// Normalized, consistent statuses (always lowercase)
export const NORMALIZED_STATUSES = [
  "in_progress",
  "done",
  "qa",
  "todo",
  "blocked",
] as const;
export type NormalizedStatus = (typeof NORMALIZED_STATUSES)[number];

// User object, always present in the normalized model
export interface User {
  id: string;
  name: string;
}

// Nullable user represents unassigned tasks
export type AssigneeValue = User | null;

// The clean, internal task model. All fields are reliable and typed.
export interface Task {
  id: string;
  title: string;
  type: TaskType; // discriminated; can be "unknown" if not recognized
  status: NormalizedStatus; // always one of the normalized values
  assignee: AssigneeValue; // null if unassigned
  annotationCount: number; // always a number, never a string
  updatedAt: number; // always epoch milliseconds
  meta: Record<string, unknown>; // free-form metadata from the server
}

// Raw API response (messy, as-is from server)
export interface RawTask {
  id: string;
  title: string;
  type: string; // may be unknown
  status: string; // inconsistent casing/spelling
  assignee: unknown; // may be null, object, or garbage
  annotationCount: string | number; // sometimes a string
  updatedAt: string | number; // sometimes ISO, sometimes epoch-ms
  meta?: Record<string, unknown>;
}

// Paginated response wrapper
export interface TasksResponse {
  page: number;
  pageSize: number;
  total: number;
  items: RawTask[];
}

// WebSocket event types
export type WebSocketEventKind =
  | "task.updated"
  | "task.assigned"
  | "annotation.created";

export interface TaskUpdatedEvent {
  kind: "task.updated";
  payload: {
    id: string;
    status: string; // raw, uncleaned
    updatedAt: number; // epoch ms
  };
}

export interface TaskAssignedEvent {
  kind: "task.assigned";
  payload: {
    id: string;
    assignee: unknown; // raw, may be null or object
  };
}

export interface AnnotationCreatedEvent {
  kind: "annotation.created";
  payload: {
    taskId: string;
    by: string;
    at: number; // epoch ms
  };
}

export type WebSocketEvent =
  | TaskUpdatedEvent
  | TaskAssignedEvent
  | AnnotationCreatedEvent;

// Filter and sort params
export interface TaskFilters {
  type?: TaskType;
  status?: NormalizedStatus;
  search?: string;
}

export interface TaskSort {
  field: "updatedAt";
  direction: "asc" | "desc";
}
