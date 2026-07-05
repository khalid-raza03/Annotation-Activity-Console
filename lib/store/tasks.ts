import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
  PayloadAction,
} from "@reduxjs/toolkit";
import { Task, TasksResponse, NormalizedStatus, RawTask } from "../types";
import { normalizeTask, normalizeTasks, normalizeAssignee } from "../normalize";

const tasksAdapter = createEntityAdapter<Task>({
  selectId: (task) => task.id,
  sortComparer: (a, b) => b.updatedAt - a.updatedAt,
});

export type TasksState = ReturnType<typeof tasksAdapter.getInitialState> & {
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
};

const initialState: TasksState = tasksAdapter.getInitialState({
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,
});

export const fetchTasks = createAsyncThunk<
  { tasks: Task[]; total: number; page: number; pageSize: number },
  { page: number; pageSize: number; apiBase: string },
  { rejectValue: string }
>("tasks/fetchTasks", async ({ page, pageSize, apiBase }, { rejectWithValue }) => {
  try {
    const url = new URL(`${apiBase}/api/tasks`);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());

    const response = await fetch(url.toString());
    if (!response.ok) return rejectWithValue(`HTTP ${response.status}`);

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

export const fetchTaskById = createAsyncThunk<
  Task,
  { id: string; apiBase: string },
  { rejectValue: string }
>("tasks/fetchTaskById", async ({ id, apiBase }, { rejectWithValue }) => {
  try {
    const response = await fetch(`${apiBase}/api/tasks/${id}`);
    if (!response.ok) return rejectWithValue(`HTTP ${response.status}`);
    const raw: RawTask = await response.json();
    return normalizeTask(raw);
  } catch (err) {
    return rejectWithValue(err instanceof Error ? err.message : "Unknown error");
  }
});

export const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    setCachedTasks: (state, action: PayloadAction<Task[]>) => {
      tasksAdapter.setAll(state, action.payload);
    },
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
    updateTaskAssignee: (
      state,
      action: PayloadAction<{ id: string; assignee: unknown }>
    ) => {
      const task = state.entities[action.payload.id];
      if (task) {
        task.assignee = normalizeAssignee(action.payload.assignee);
        task.updatedAt = Date.now();
      }
    },
    incrementAnnotationCount: (state, action: PayloadAction<{ id: string }>) => {
      const task = state.entities[action.payload.id];
      if (task) {
        task.annotationCount += 1;
        task.updatedAt = Date.now();
      }
    },
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
        tasksAdapter.setAll(state, action.payload.tasks);
        state.totalCount = action.payload.total;
        state.currentPage = action.payload.page;
        state.pageSize = action.payload.pageSize;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch tasks";
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
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

export const tasksSelectors = tasksAdapter.getSelectors(
  (state: TasksState) => state
);
