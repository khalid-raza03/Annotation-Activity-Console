/**
 * Redux Toolkit slice for task management.
 * Uses createEntityAdapter for normalized storage and efficient lookups.
 * Includes thunks for fetching tasks from the API.
 */

import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
  PayloadAction,
} from "@reduxjs/toolkit";
import { Task, TasksResponse, NormalizedStatus, RawTask } from "../types";
import { normalizeTask, normalizeTasks } from "../normalize";

// Entity adapter for normalized storage
const tasksAdapter = createEntityAdapter<Task>({
  selectId: (task) => task.id,
  sortComparer: (a, b) => b.updatedAt - a.updatedAt, // newest first by default
});

// Return type includes the server's pagination metadata so we can store it
interface FetchTasksResult {
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
}

// Async thunk for fetching tasks with pagination
export const fetchTasks = createAsyncThunk<
  FetchTasksResult,
  { page: number; pageSize: number; apiBase: string },
  { rejectValue: string }
>("tasks/fetchTasks", async ({ page, pageSize, apiBase }, { rejectWithValue }) => {
  try {
    const url = new URL(`${apiBase}/api/tasks`);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      return rejectWithValue(`HTTP ${response.status}`);
    }

    const data: TasksResponse = await response.json();
    return {
      tasks: normalizeTasks(data.items),
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
    };
  } catch (err) {
    return rejectWithValue(err instanceof Error ? err.message : "Unknown error");
  }
});

// Fetch a single task by ID
export const fetchTaskById = createAsyncThunk<
  Task,
  { id: string; apiBase: string },
  { rejectValue: string }
>(
  "tasks/fetchTaskById",
  async ({ id, apiBase }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${apiBase}/api/tasks/${id}`);
      if (!response.ok) {
        return rejectWithValue(`HTTP ${response.status}`);
      }
      const raw: RawTask = await response.json();
      return normalizeTask(raw);
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : "Unknown error"
      );
    }
  }
);

export interface TasksState {
  ids: string[];
  entities: Record<string, Task>;
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

const initialState = tasksAdapter.getInitialState({
  loading: false,
  error: null as string | null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,
});

export const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    // Load cached tasks into state without overwriting fresher data.
    // Used on mount before the live fetch completes.
    setCachedTasks: (state, action: PayloadAction<Task[]>) => {
      tasksAdapter.setAll(state, action.payload);
      // Don't update totalCount here; it will be set correctly when the live fetch completes.
    },
    // Update a task's status (for real-time events)
    updateTaskStatus: (
      state,
      action: PayloadAction<{ id: string; status: NormalizedStatus }>
    ) => {
      const task = state.entities[action.payload.id];
      if (task) {
        task.status = action.payload.status;
        task.updatedAt = Date.now();
      }
    },
    // Update a task's assignee (for real-time events)
    updateTaskAssignee: (
      state,
      action: PayloadAction<{ id: string; assignee: unknown }>
    ) => {
      const task = state.entities[action.payload.id];
      if (task) {
        // Normalize the assignee from the event
        const assignee = action.payload.assignee;
        if (
          typeof assignee === "object" &&
          assignee !== null &&
          "id" in assignee &&
          "name" in assignee &&
          typeof (assignee as Record<string, unknown>).id === "string" &&
          typeof (assignee as Record<string, unknown>).name === "string"
        ) {
          task.assignee = {
            id: (assignee as Record<string, string>).id,
            name: (assignee as Record<string, string>).name,
          };
        } else {
          task.assignee = null;
        }
        task.updatedAt = Date.now();
      }
    },
    // Increment annotation count (for real-time events)
    incrementAnnotationCount: (state, action: PayloadAction<{ id: string }>) => {
      const task = state.entities[action.payload.id];
      if (task) {
        task.annotationCount += 1;
        task.updatedAt = Date.now();
      }
    },
    // Set pagination params
    setPagination: (
      state,
      action: PayloadAction<{ page: number; pageSize: number }>
    ) => {
      state.currentPage = action.payload.page;
      state.pageSize = action.payload.pageSize;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        // Replace all tasks with the fetched ones
        tasksAdapter.setAll(state, action.payload.tasks);
        // Store the authoritative total and page from the server
        state.totalCount = action.payload.total;
        state.currentPage = action.payload.page;
        state.pageSize = action.payload.pageSize;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch tasks";
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        // Upsert the task (add or update)
        tasksAdapter.upsertOne(state, action.payload);
      });
  },
});

export const {
  setCachedTasks,
  updateTaskStatus,
  updateTaskAssignee,
  incrementAnnotationCount,
  setPagination,
} = tasksSlice.actions;

export default tasksSlice.reducer;

// Exported selectors from the adapter
export const tasksSelectors = tasksAdapter.getSelectors(
  (state: TasksState) => state
);
