/**
 * Tests for the data normalization layer.
 * Verifies that messy backend data is correctly normalized.
 */

import { normalizeTask, normalizeTasks } from '@/lib/normalize'
import { RawTask, Task } from '@/lib/types'

describe('normalizeTask', () => {
  it('normalizes a complete, clean task', () => {
    const raw: RawTask = {
      id: 't1',
      title: 'Sample Task',
      type: 'image',
      status: 'in_progress',
      assignee: { id: 'u1', name: 'Alice' },
      annotationCount: 5,
      updatedAt: 1719600000000,
      meta: { priority: 'high' },
    }

    const normalized = normalizeTask(raw)

    expect(normalized.id).toBe('t1')
    expect(normalized.title).toBe('Sample Task')
    expect(normalized.type).toBe('image')
    expect(normalized.status).toBe('in_progress')
    expect(normalized.assignee).toEqual({ id: 'u1', name: 'Alice' })
    expect(normalized.annotationCount).toBe(5)
    expect(normalized.updatedAt).toBe(1719600000000)
  })

  it('handles unknown task types', () => {
    const raw: RawTask = {
      id: 't2',
      title: 'Unknown Type Task',
      type: 'video',
      status: 'done',
      assignee: null,
      annotationCount: 0,
      updatedAt: Date.now(),
    }

    const normalized = normalizeTask(raw)

    expect(normalized.type).toBe('unknown')
  })

  it('normalizes inconsistent status casing', () => {
    const testCases = [
      { raw: 'in_progress', expected: 'in_progress' },
      { raw: 'InProgress', expected: 'in_progress' },
      { raw: 'inprogress', expected: 'in_progress' },
      { raw: 'QA', expected: 'qa' },
      { raw: 'BLOCKED', expected: 'blocked' },
      { raw: 'unknown_status', expected: 'todo' }, // fallback
    ]

    testCases.forEach(({ raw, expected }) => {
      const task = normalizeTask({
        id: 't',
        title: 't',
        type: 'text',
        status: raw,
        assignee: null,
        annotationCount: 0,
        updatedAt: Date.now(),
      })
      expect(task.status).toBe(expected)
    })
  })

  it('converts annotationCount from string to number', () => {
    const asString: RawTask = {
      id: 't3',
      title: 'Test',
      type: 'text',
      status: 'done',
      assignee: null,
      annotationCount: '42',
      updatedAt: Date.now(),
    }

    const normalized = normalizeTask(asString)
    expect(normalized.annotationCount).toBe(42)
    expect(typeof normalized.annotationCount).toBe('number')
  })

  it('handles null assignee', () => {
    const raw: RawTask = {
      id: 't4',
      title: 'Test',
      type: 'text',
      status: 'todo',
      assignee: null,
      annotationCount: 0,
      updatedAt: Date.now(),
    }

    const normalized = normalizeTask(raw)
    expect(normalized.assignee).toBeNull()
  })

  it('normalizes updatedAt from ISO string', () => {
    const iso = '2024-07-01T12:00:00Z'
    const expectedMs = new Date(iso).getTime()

    const raw: RawTask = {
      id: 't5',
      title: 'Test',
      type: 'text',
      status: 'done',
      assignee: null,
      annotationCount: 0,
      updatedAt: iso,
    }

    const normalized = normalizeTask(raw)
    expect(normalized.updatedAt).toBe(expectedMs)
    expect(typeof normalized.updatedAt).toBe('number')
  })

  it('handles missing optional fields', () => {
    const minimal: RawTask = {
      id: 't6',
      title: 'Minimal',
      type: 'text',
      status: 'todo',
      assignee: null,
      annotationCount: 0,
      updatedAt: Date.now(),
    }

    const normalized = normalizeTask(minimal)
    expect(normalized.meta).toEqual({})
  })
})

describe('normalizeTasks', () => {
  it('normalizes an array of tasks', () => {
    const raw: RawTask[] = [
      {
        id: 't1',
        title: 'Task 1',
        type: 'image',
        status: 'in_progress',
        assignee: { id: 'u1', name: 'Alice' },
        annotationCount: 5,
        updatedAt: 1719600000000,
      },
      {
        id: 't2',
        title: 'Task 2',
        type: 'video',
        status: 'QA',
        assignee: null,
        annotationCount: '10',
        updatedAt: '2024-07-01T12:00:00Z',
      },
    ]

    const normalized = normalizeTasks(raw)

    expect(normalized).toHaveLength(2)
    expect(normalized[0].type).toBe('image')
    expect(normalized[1].type).toBe('unknown')
    expect(normalized[1].status).toBe('qa')
    expect(normalized[1].annotationCount).toBe(10)
  })
})
