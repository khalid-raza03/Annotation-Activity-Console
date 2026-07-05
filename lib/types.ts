export type TaskType = 'image' | 'audio' | 'text' | 'unknown';

export enum NormalizedStatus {
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  QA = 'qa',
  TODO = 'todo',
  BLOCKED = 'blocked',
}

export interface User {
  id: string;
  name: string;
}

interface BaseTask {
  id: string;
  title: string;
  status: NormalizedStatus;
  assignee: User | null;
  annotationCount: number;
  updatedAt: number;
  meta: Record<string, unknown>;
}

export interface ImageTask extends BaseTask {
  type: 'image';
}

export interface AudioTask extends BaseTask {
  type: 'audio';
}

export interface TextTask extends BaseTask {
  type: 'text';
}

export interface UnknownTask extends BaseTask {
  type: 'unknown';
}

export type Task = ImageTask | AudioTask | TextTask | UnknownTask;

export interface RawTask {
  id: string;
  title: string;
  type: string;
  status: string;
  assignee: unknown;
  annotationCount: string | number;
  updatedAt: string | number;
  meta?: Record<string, unknown>;
}

export interface TasksResponse {
  page: number;
  pageSize: number;
  total: number;
  items: RawTask[];
}

export type WebSocketEventKind = 'task.updated' | 'task.assigned' | 'annotation.created';

export interface TaskUpdatedEvent {
  kind: 'task.updated';
  payload: {
    id: string;
    status: string;
    updatedAt: number;
  };
}

export interface TaskAssignedEvent {
  kind: 'task.assigned';
  payload: {
    id: string;
    assignee: unknown;
  };
}

export interface AnnotationCreatedEvent {
  kind: 'annotation.created';
  payload: {
    taskId: string;
    by: string;
    at: number;
  };
}

export type WebSocketEvent = TaskUpdatedEvent | TaskAssignedEvent | AnnotationCreatedEvent;

export interface TaskFilters {
  type?: TaskType;
  status?: NormalizedStatus;
  search?: string;
}
