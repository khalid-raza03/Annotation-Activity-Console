/**
 * Redux store configuration.
 */

import { configureStore } from "@reduxjs/toolkit";
import tasksReducer from "./tasks";
import uiReducer from "./ui";

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
