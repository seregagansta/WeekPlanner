import type { Task, TaskImportEntry } from '../types/planner'
import { validateTask } from '../features/tasks/validation'
import { scheduleIdentity } from '../features/schedule-import/parseSchedule'
export interface ImportGateway {
  getTasks(): Task[]
  createMany(entries: TaskImportEntry[]): Promise<Task[]>
}
export async function importSchedule(gateway: ImportGateway, entries: TaskImportEntry[]) {
  if (!entries.length || entries.length > 200) throw new Error('Нужно от 1 до 200 задач.')
  const ids = new Set<string>()
  for (const entry of entries) {
    validateTask(entry.input)
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.id) ||
      ids.has(entry.id)
    )
      throw new Error('Некорректный идентификатор импорта. Повторите предварительный просмотр.')
    ids.add(entry.id)
  }
  const seen = new Set(gateway.getTasks().map(scheduleIdentity))
  const fresh = entries.filter((entry) => {
    const identity = scheduleIdentity(entry.input)
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
  const created = fresh.length ? await gateway.createMany(fresh) : []
  return { created, skipped: entries.length - created.length }
}
