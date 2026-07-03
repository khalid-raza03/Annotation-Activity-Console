/**
 * Memoized selectors for derived views of the task state.
 * These selectors efficiently compute filtered, sorted, and paginated views.
 */

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "./index";
import { tasksSelectors } from "./tasks";
import { Task } from "../types";

// Select all tasks (via adapter)
const selectAllTasks = createSelector(
  (state: RootState) => state.tasks,
  (tasks) => tasksSelectors.selectAll(tasks)
);

// Select tasks count (number of tasks currently in the store)
export const selectTasksCount = createSelector(
  (state: RootState) => state.tasks,
  (tasks) => tasksSelectors.selectTotal(tasks)
);

// Select the authoritative server total (from the last successful fetchTasks)
export const selectServerTotal = (state: RootState) => state.tasks.totalCount;

// Select a specific task by ID
export const selectTaskById = createSelector(
  [(state: RootState) => state.tasks, (_: RootState, id: string) => id],
  (tasks, id) => tasksSelectors.selectById(tasks, id)
);

// Select the selected task ID
export const selectSelectedTaskId = (state: RootState) =>
  state.ui.selectedTaskId;

// Select the selected task
export const selectSelectedTask = createSelector(
  [selectAllTasks, selectSelectedTaskId],
  (tasks, selectedId) => tasks.find((t) => t.id === selectedId) || null
);

// Select filters
export const selectFilters = (state: RootState) => state.ui.filters;
export const selectSearchQuery = (state: RootState) =>
  state.ui.filters.search;
export const selectFilterType = (state: RootState) => state.ui.filters.type;
export const selectFilterStatus = (state: RootState) =>
  state.ui.filters.status;

// Select sort settings
export const selectSortField = (state: RootState) => state.ui.sortField;
export const selectSortDirection = (state: RootState) =>
  state.ui.sortDirection;

// Select summary loading state
export const selectSummaryLoading = (state: RootState) =>
  state.ui.summaryLoading;
export const selectSummaryError = (state: RootState) => state.ui.summaryError;

// Filtered tasks: apply type, status, and search filters
export const selectFilteredTasks = createSelector(
  [
    selectAllTasks,
    selectFilterType,
    selectFilterStatus,
    selectSearchQuery,
  ],
  (tasks, filterType, filterStatus, searchQuery) => {
    return tasks.filter((task) => {
      // Filter by type
      if (filterType && task.type !== filterType) {
        return false;
      }

      // Filter by status
      if (filterStatus && task.status !== filterStatus) {
        return false;
      }

      // Filter by search query (search in title)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches = task.title.toLowerCase().includes(query);
        if (!matches) {
          return false;
        }
      }

      return true;
    });
  }
);

// Sorted tasks: sort by updatedAt or annotationCount, asc or desc
export const selectSortedTasks = createSelector(
  [selectFilteredTasks, selectSortField, selectSortDirection],
  (tasks, sortField, sortDirection) => {
    const sorted = [...tasks];
    sorted.sort((a, b) => {
      let diff: number;
      if (sortField === "annotationCount") {
        diff = a.annotationCount - b.annotationCount;
      } else {
        // Default: updatedAt
        diff = a.updatedAt - b.updatedAt;
      }
      return sortDirection === "desc" ? -diff : diff;
    });
    return sorted;
  }
);

// Paginated tasks (client-side slice of the sorted filtered list)
export const selectPaginatedTasks = createSelector(
  [
    selectSortedTasks,
    (state: RootState) => state.tasks.currentPage,
    (state: RootState) => state.tasks.pageSize,
  ],
  (tasks, page, pageSize) => {
    const start = (page - 1) * pageSize;
    return tasks.slice(start, start + pageSize);
  }
);

// Pagination info — uses server total for the authoritative count,
// falls back to local count when total hasn't been set yet (e.g. cached data).
export const selectPaginationInfo = createSelector(
  [
    selectSortedTasks,
    selectServerTotal,
    (state: RootState) => state.tasks.currentPage,
    (state: RootState) => state.tasks.pageSize,
  ],
  (tasks, serverTotal, page, pageSize) => {
    // Use server total when available; fall back to local visible count
    const total = serverTotal > 0 ? serverTotal : tasks.length;
    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasNextPage: page < Math.ceil(total / pageSize),
      hasPreviousPage: page > 1,
    };
  }
);

// Loading and error states
export const selectTasksLoading = (state: RootState) => state.tasks.loading;
export const selectTasksError = (state: RootState) => state.tasks.error;

// Count tasks by status (for stats)
export const selectTasksByStatus = createSelector(
  [selectAllTasks],
  (tasks) => {
    const counts: Record<string, number> = {
      in_progress: 0,
      done: 0,
      qa: 0,
      todo: 0,
      blocked: 0,
    };

    tasks.forEach((task) => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });

    return counts;
  }
);

// Get unique task types present in the data
export const selectAvailableTaskTypes = createSelector(
  [selectAllTasks],
  (tasks) => {
    const types = new Set<string>();
    tasks.forEach((t) => {
      types.add(t.type);
    });
    return Array.from(types).sort();
  }
);
