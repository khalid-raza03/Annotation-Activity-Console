/**
 * Redux Toolkit slice for UI state.
 * Manages filters, search, selected task, sorting, and summary loading state.
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TaskType, NormalizedStatus } from "../types";

// The two fields tasks can be sorted by.
// updatedAt: most-recently-modified first (default)
// annotationCount: most annotations first
export type SortField = "updatedAt" | "annotationCount";

export interface UIState {
  selectedTaskId: string | null;
  filters: {
    type?: TaskType;
    status?: NormalizedStatus;
    search: string;
  };
  sortField: SortField;
  sortDirection: "asc" | "desc";
  summaryLoading: boolean;
  summaryError: string | null;
}

const initialState: UIState = {
  selectedTaskId: null,
  filters: {
    search: "",
  },
  sortField: "updatedAt",
  sortDirection: "desc",
  summaryLoading: false,
  summaryError: null,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    selectTask: (state, action: PayloadAction<string | null>) => {
      state.selectedTaskId = action.payload;
    },
    setFilterType: (state, action: PayloadAction<TaskType | undefined>) => {
      state.filters.type = action.payload;
    },
    setFilterStatus: (
      state,
      action: PayloadAction<NormalizedStatus | undefined>
    ) => {
      state.filters.status = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.filters.search = action.payload;
    },
    clearFilters: (state) => {
      state.filters = { search: "" };
    },
    setSortField: (state, action: PayloadAction<SortField>) => {
      state.sortField = action.payload;
    },
    setSortDirection: (
      state,
      action: PayloadAction<"asc" | "desc">
    ) => {
      state.sortDirection = action.payload;
    },
    setSummaryLoading: (state, action: PayloadAction<boolean>) => {
      state.summaryLoading = action.payload;
      if (action.payload) {
        state.summaryError = null;
      }
    },
    setSummaryError: (state, action: PayloadAction<string | null>) => {
      state.summaryError = action.payload;
    },
  },
});

export const {
  selectTask,
  setFilterType,
  setFilterStatus,
  setSearchQuery,
  clearFilters,
  setSortField,
  setSortDirection,
  setSummaryLoading,
  setSummaryError,
} = uiSlice.actions;

export default uiSlice.reducer;
