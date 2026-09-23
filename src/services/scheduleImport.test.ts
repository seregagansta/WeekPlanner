import { describe, expect, it, vi } from 'vitest'
import { importSchedule } from './scheduleImport'
import type { Task, TaskImportEntry } from '../types/planner'
const entry = (title: string): TaskImportEntry => ({
  id: crypto.randomUUID(),
  input: {
    title,
    description: '',
    date: '2026-09-14',
    start_time: '10:00',
    end_time: '11:00',
    category: 'cat',
    color: '#89909c',
    priority: 'medium',
    completed: false,
    notes: '',
    recurrence: null,
    series_id: null,
  },
})
describe('Schedule import action', () => {
  it('validates the entire plan before issuing one batch write', async () => {
    const createMany = vi.fn()
    await expect(
      importSchedule({ getTasks: () => [], createMany }, [entry('Хорошая'), entry('')]),
    ).rejects.toThrow()
    expect(createMany).not.toHaveBeenCalled()
  })
  it('skips existing tasks and duplicates within the pasted plan', async () => {
    const first = entry('Первый'),
      second = entry('Второй')
    const createMany = vi.fn(async (entries) =>
      entries.map((e: TaskImportEntry) => ({ ...e.input, id: e.id }) as Task),
    )
    const result = await importSchedule(
      { getTasks: () => [{ ...first.input, id: first.id } as Task], createMany },
      [first, second, entry('Второй')],
    )
    expect(createMany).toHaveBeenCalledOnce()
    expect(createMany).toHaveBeenCalledWith([second])
    expect(result.skipped).toBe(2)
  })
  it('keeps client IDs on retry after a response is lost', async () => {
    const entries = [entry('План')]
    const createMany = vi
      .fn()
      .mockRejectedValueOnce(new Error('Connection lost'))
      .mockResolvedValue([])
    const gateway = { getTasks: () => [], createMany }
    await expect(importSchedule(gateway, entries)).rejects.toThrow('Connection lost')
    await importSchedule(gateway, entries)
    expect(createMany.mock.calls[0][0][0].id).toBe(createMany.mock.calls[1][0][0].id)
  })
})
