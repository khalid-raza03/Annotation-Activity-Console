/**
 * Tests for the TaskList component.
 * Verifies that filtering and selection work correctly.
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { TaskList } from '@/components/TaskList'
import tasksReducer from '@/lib/store/tasks'
import uiReducer, { selectTask } from '@/lib/store/ui'
import { Task } from '@/lib/types'

describe('TaskList component', () => {
  const mockTasks: Task[] = [
    {
      id: 't1',
      title: 'First Task',
      type: 'image',
      status: 'in_progress',
      assignee: { id: 'u1', name: 'Alice' },
      annotationCount: 5,
      updatedAt: Date.now() - 1000000,
      meta: {},
    },
    {
      id: 't2',
      title: 'Second Task',
      type: 'text',
      status: 'done',
      assignee: null,
      annotationCount: 3,
      updatedAt: Date.now(),
      meta: {},
    },
  ]

  function createTestStore() {
    return configureStore({
      reducer: {
        tasks: tasksReducer,
        ui: uiReducer,
      },
      preloadedState: {
        tasks: {
          ids: mockTasks.map((t) => t.id),
          entities: Object.fromEntries(mockTasks.map((t) => [t.id, t])),
          loading: false,
          error: null,
          totalCount: mockTasks.length,
          currentPage: 1,
          pageSize: 20,
        },
        ui: {
          selectedTaskId: null,
          filters: { search: '' },
          sortField: 'updatedAt',
          sortDirection: 'desc',
          summaryLoading: false,
          summaryError: null,
        },
      },
    })
  }

  it('renders task list', () => {
    const store = createTestStore()
    render(
      <Provider store={store}>
        <TaskList />
      </Provider>
    )

    expect(screen.getByText('First Task')).toBeInTheDocument()
    expect(screen.getByText('Second Task')).toBeInTheDocument()
  })

  it('selects a task when clicked', () => {
    const store = createTestStore()
    render(
      <Provider store={store}>
        <TaskList />
      </Provider>
    )

    const firstTask = screen.getByText('First Task').closest('div[class*="border"]')
    fireEvent.click(firstTask!)

    expect(store.getState().ui.selectedTaskId).toBe('t1')
  })

  it('highlights selected task', () => {
    const store = createTestStore()

    // Pre-select a task
    store.dispatch(selectTask('t1'))

    render(
      <Provider store={store}>
        <TaskList />
      </Provider>
    )

    const firstTask = screen.getByText('First Task').closest('div[class*="border"]')
    expect(firstTask).toHaveClass('bg-blue-50')
  })

  it('shows loading state when tasks are loading', () => {
    const store = configureStore({
      reducer: {
        tasks: tasksReducer,
        ui: uiReducer,
      },
      preloadedState: {
        tasks: {
          ids: [],
          entities: {},
          loading: true,
          error: null,
          totalCount: 0,
          currentPage: 1,
          pageSize: 20,
        },
        ui: {
          selectedTaskId: null,
          filters: { search: '' },
          sortField: 'updatedAt',
          sortDirection: 'desc',
          summaryLoading: false,
          summaryError: null,
        },
      },
    })

    render(
      <Provider store={store}>
        <TaskList />
      </Provider>
    )

    expect(screen.getByText('Loading tasks…')).toBeInTheDocument()
  })

  it('shows empty state when no tasks', () => {
    const store = configureStore({
      reducer: {
        tasks: tasksReducer,
        ui: uiReducer,
      },
      preloadedState: {
        tasks: {
          ids: [],
          entities: {},
          loading: false,
          error: null,
          totalCount: 0,
          currentPage: 1,
          pageSize: 20,
        },
        ui: {
          selectedTaskId: null,
          filters: { search: '' },
          sortField: 'updatedAt',
          sortDirection: 'desc',
          summaryLoading: false,
          summaryError: null,
        },
      },
    })

    render(
      <Provider store={store}>
        <TaskList />
      </Provider>
    )

    expect(screen.getByText('No tasks found')).toBeInTheDocument()
  })
})
