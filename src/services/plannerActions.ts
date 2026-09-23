import { addDays, minutes, timeString } from '../lib/dates'
import type { Task, TaskInput, TaskPatch, TaskImportEntry } from '../types/planner'
import { importSchedule } from './scheduleImport'
import { validateTask } from '../features/tasks/validation'
export interface ActionGateway {
  getTasks(): Task[]
  create(input: TaskInput): Promise<Task>
  createMany(entries: TaskImportEntry[]): Promise<Task[]>
  update(id: string, patch: TaskPatch): Promise<Task>
  remove(id: string): Promise<void>
}
export interface FreeSlot {
  date: string
  start_time: string
  end_time: string
}
export interface RescheduleChange {
  id: string
  patch: TaskPatch
}
export function findFreeSlots(
  tasks: Task[],
  date: string,
  durationMinutes: number,
  from = '09:00',
  until = '20:00',
): FreeSlot[] {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0)
    throw new Error('Длительность должна быть больше нуля.')
  const busy = tasks
    .filter((t) => t.date === date)
    .sort((a, b) => minutes(a.start_time) - minutes(b.start_time))
  const slots: FreeSlot[] = []
  let cursor = minutes(from)
  const limit = minutes(until)
  for (const task of busy) {
    const end = Math.min(minutes(task.start_time), limit)
    if (end - cursor >= durationMinutes)
      slots.push({ date, start_time: timeString(cursor), end_time: timeString(end) })
    cursor = Math.max(cursor, minutes(task.end_time))
    if (cursor >= limit) break
  }
  if (limit - cursor >= durationMinutes)
    slots.push({ date, start_time: timeString(cursor), end_time: timeString(limit) })
  return slots
}
// Scheduling changes are proposals. A future LLM must show them before applying.
export function createPlannerActions(gateway: ActionGateway) {
  const getTask = (id: string) => {
    const task = gateway.getTasks().find((t) => t.id === id)
    if (!task) throw new Error('Задача не найдена.')
    return task
  }
  const updateTask = (id: string, patch: TaskPatch) => {
    validateTask({ ...getTask(id), ...patch })
    return gateway.update(id, patch)
  }
  const getDaySchedule = (date: string) =>
    gateway
      .getTasks()
      .filter((t) => t.date === date)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  return {
    importTasks(entries: TaskImportEntry[]) {
      return importSchedule(gateway, entries)
    },
    createTask(input: TaskInput) {
      validateTask(input)
      return gateway.create({ ...input, title: input.title.trim() })
    },
    updateTask,
    deleteTask: gateway.remove,
    moveTask(id: string, date: string, start_time?: string) {
      const task = getTask(id)
      const patch: TaskPatch = { date }
      if (start_time) {
        patch.start_time = start_time
        patch.end_time = timeString(
          minutes(start_time) + minutes(task.end_time) - minutes(task.start_time),
        )
      }
      return updateTask(id, patch)
    },
    getDaySchedule,
    getWeekSchedule(start: string) {
      return gateway
        .getTasks()
        .filter((t) => t.date >= start && t.date <= addDays(start, 6))
        .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))
    },
    findFreeSlots(date: string, length: number, from?: string, until?: string) {
      return findFreeSlots(gateway.getTasks(), date, length, from, until)
    },
    rescheduleDay(date: string, shiftMinutes: number): RescheduleChange[] {
      return getDaySchedule(date)
        .filter((t) => !t.completed)
        .map((task) => {
          const patch = {
            start_time: timeString(minutes(task.start_time) + shiftMinutes),
            end_time: timeString(minutes(task.end_time) + shiftMinutes),
          }
          validateTask({ ...task, ...patch })
          return { id: task.id, patch }
        })
    },
    rescheduleWeek(start: string, shiftDays: number): RescheduleChange[] {
      if (!Number.isInteger(shiftDays)) throw new Error('Сдвиг должен быть целым числом дней.')
      return gateway
        .getTasks()
        .filter((t) => !t.completed && t.date >= start && t.date <= addDays(start, 6))
        .map((t) => ({ id: t.id, patch: { date: addDays(t.date, shiftDays) } }))
    },
  }
}
export type PlannerActions = ReturnType<typeof createPlannerActions>
