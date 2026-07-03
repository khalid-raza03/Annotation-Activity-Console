/**
 * Tests for Redux selectors.
 * Verifies that selectors correctly compute filtered and sorted views.
 */

import {
  selectFilteredTasks,
  selectSortedTasks,
  selectPaginatedTasks,
  selectTasksByStatus,
} from '@/lib/store/selectors'
import { RootState } from '@/lib/store'
import { Task } from '@/lib/types'

describe('selectors', () => {
  const mockTasks: Task[] = [
    {
      id: 't1',
      title: 'Image Task',
      type: 'image',
      status: 'in_progress',
      assignee: { id: 'u1', name: 'Alice' },
      annotationCount: 5,
      updatedAt: 1000,
      meta: {},
    },
    {
      id: 't2',
      title: 'Audio Task',
      type: 'audio',
      status: 'done',
      assignee: null,
      annotationCount: 3,
      updatedAt: 2000,
      meta: {},
    },
    {
      id: 't3',
      title: 'Text Task',
      type: 'text',
      status: 'todo',
      assignee: { id: 'u2', name: 'Bob' },
      annotationCount: 0,
      updatedAt: 3000,
      meta: {},
    },
  ]

  const createMockState = (overrides?: Partial<RootState>): RootState => ({
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
      filters: {
        search: '',
      },
      sortField: 'updatedAt',
      sortDirection: 'desc',
      summaryLoading: false,
      summaryError: null,
    },
    ...overrides,
  } as unknown as RootState)

  describe('selectFilteredTasks', () => {
    it('returns all tasks when no filters applied', () => {
      const state = createMockState()
      const filtered = selectFilteredTasks(state)
      expect(filtered).toHaveLength(3)
    })

    it('filters by type', () => {
      const state = createMockState({
        ui: {
          ...createMockState().ui,
          filters: { search: '', type: 'image' },
        },
      })
      const filtered = selectFilteredTasks(state)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('t1')
    })

    it('filters by status', () => {
      const state = createMockState({
        ui: {
          ...createMockState().ui,
          filters: { search: '', status: 'done' },
        },
      })
      const filtered = selectFilteredTasks(state)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('t2')
    })

    it('filters by search query (title)', () => {
      const state = createMockState({
        ui: {
          ...createMockState().ui,
          filters: { search: 'text' },
        },
      })
      const filtered = selectFilteredTasks(state)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toContain('Text')
    })

    it('combines multiple filters', () => {
      const state = createMockState({
        ui: {
          ...createMockState().ui,
          filters: { search: '', type: 'image', status: 'in_progress' },
        },
      })
      const filtered = selectFilteredTasks(state)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('t1')
    })
  })

  describe('selectSortedTasks', () => {
    it('sorts by updatedAt descending (newest first)', () => {
      const state = createMockState({
        ui: {
          ...createMockState().ui,
          sortDirection: 'desc',
        },
      })
      const sorted = selectSortedTasks(state)
      expect(sorted[0].id).toBe('t3')
      expect(sorted[1].id).toBe('t2')
      expect(sorted[2].id).toBe('t1')
    })

    it('sorts by updatedAt ascending (oldest first)', () => {
      const state = createMockState({
        ui: {
          ...createMockState().ui,
          sortDirection: 'asc',
        },
      })
      const sorted = selectSortedTasks(state)
      expect(sorted[0].id).toBe('t1')
      expect(sorted[1].id).toBe('t2')
      expect(sorted[2].id).toBe('t3')
    })
  })

  describe('selectPaginatedTasks', () => {
    it('returns tasks for first page', () => {
      const state = createMockState({
        tasks: {
          ...createMockState().tasks,
          currentPage: 1,
          pageSize: 2,
        },
      })
      const paginated = selectPaginatedTasks(state)
      expect(paginated).toHaveLength(2)
    })

    it('returns tasks for second page', () => {
      const state = createMockState({
        tasks: {
          ...createMockState().tasks,
          currentPage: 2,
          pageSize: 2,
        },
      })
      const paginated = selectPaginatedTasks(state)
      expect(paginated).toHaveLength(1)
    })
  })

  describe('selectTasksByStatus', () => {
    it('counts tasks by status', () => {
      const state = createMockState()
      const counts = selectTasksByStatus(state)

      expect(counts.in_progress).toBe(1)
      expect(counts.done).toBe(1)
      expect(counts.todo).toBe(1)
      expect(counts.qa).toBe(0)
      expect(counts.blocked).toBe(0)
    })
  })
})
