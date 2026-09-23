import { describe, expect, it, vi } from 'vitest'
import { createPlannerActions, findFreeSlots } from './plannerActions'
import { addDays, monday } from '../lib/dates'
import { validateTask } from '../features/tasks/validation'
import { layoutTasks } from '../features/calendar/layout'
import type { Task } from '../types/planner'
const task = (patch: Partial<Task> = {}): Task => ({
  id: 'a',
  user_id: 'user',
  title: 'Focus',
  description: '',
  date: '2026-09-08',
  start_time: '10:00',
  end_time: '12:00',
  category: 'cat',
  color: '#5979d7',
  priority: 'medium',
  completed: false,
  notes: '',
  recurrence: null,
  series_id: null,
  created_at: '',
  updated_at: '',
  ...patch,
})
describe('Scheduling domain', () => {
  it('uses Monday weeks across year boundaries', () => {
    expect(monday('2027-01-03')).toBe('2026-12-28')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('merges overlapping busy intervals when finding free time', () => {
    const tasks = [
      task(),
      task({ id: 'b', start_time: '11:00', end_time: '13:00' }),
      task({ id: 'c', start_time: '15:00', end_time: '17:00' }),
    ]
    expect(findFreeSlots(tasks, '2026-09-08', 120)).toEqual([
      { date: '2026-09-08', start_time: '13:00', end_time: '15:00' },
      { date: '2026-09-08', start_time: '17:00', end_time: '20:00' },
    ])
  })
  it('clips intervals to working hours and rejects invalid duration', () => {
    expect(
      findFreeSlots(
        [
          task({ start_time: '07:00', end_time: '10:30' }),
          task({ start_time: '19:00', end_time: '23:00' }),
        ],
        '2026-09-08',
        120,
      ),
    ).toEqual([{ date: '2026-09-08', start_time: '10:30', end_time: '19:00' }])
    expect(() => findFreeSlots([], '2026-09-08', 0)).toThrow()
  })
  it('moves a task while preserving duration', async () => {
    const update = vi.fn(async (_id, patch) => task(patch))
    const actions = createPlannerActions({
      getTasks: () => [task()],
      create: vi.fn(),
      createMany: vi.fn(),
      update,
      remove: vi.fn(),
    })
    await actions.moveTask('a', '2026-09-09', '15:30')
    expect(update).toHaveBeenCalledWith('a', {
      date: '2026-09-09',
      start_time: '15:30',
      end_time: '17:30',
    })
    expect(() => actions.moveTask('a', '2026-09-09', '23:00')).toThrow()
  })
  it('rejects empty titles, reversed times and impossible dates', () => {
    for (const patch of [
      { title: '  ' },
      { end_time: '09:00' },
      { date: '2026-02-30' },
      { start_time: '25:00' },
    ])
      expect(() => validateTask(task(patch))).toThrow()
    expect(() => validateTask(task())).not.toThrow()
  })
  it('proposes rescheduling without mutating persisted data or completed tasks', () => {
    const update = vi.fn()
    const actions = createPlannerActions({
      getTasks: () => [task(), task({ id: 'b', completed: true })],
      create: vi.fn(),
      createMany: vi.fn(),
      update,
      remove: vi.fn(),
    })
    expect(actions.rescheduleDay('2026-09-08', 60)).toEqual([
      { id: 'a', patch: { start_time: '11:00', end_time: '13:00' } },
    ])
    expect(actions.rescheduleWeek('2026-09-07', 1)).toEqual([
      { id: 'a', patch: { date: '2026-09-09' } },
    ])
    expect(update).not.toHaveBeenCalled()
  })
  it('assigns overlapping tasks separate lanes and restores full width afterward', () => {
    const result = layoutTasks([
      task(),
      task({ id: 'b', start_time: '11:00', end_time: '13:00' }),
      task({ id: 'c', start_time: '14:00', end_time: '15:00' }),
    ])
    expect(result.map((r) => [r.lane, r.lanes])).toEqual([
      [0, 2],
      [1, 2],
      [0, 1],
    ])
  })
})
