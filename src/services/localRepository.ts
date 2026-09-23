import type { PlannerRepository, PlannerSnapshot } from '../types/planner'
import { demoUser, makeDemoData } from './defaults'
const key = 'weekplanner.demo.v1'
export function createLocalRepository(): PlannerRepository {
  const read = (): PlannerSnapshot => {
    const value = localStorage.getItem(key)
    if (value) return JSON.parse(value) as PlannerSnapshot
    const initial = makeDemoData()
    localStorage.setItem(key, JSON.stringify(initial))
    return initial
  }
  const write = (data: PlannerSnapshot) => {
    localStorage.setItem(key, JSON.stringify(data))
    window.dispatchEvent(new Event(key))
  }
  return {
    mode: 'demo',
    async load() {
      return read()
    },
    async create(input) {
      const data = read()
      const task = {
        ...input,
        id: crypto.randomUUID(),
        user_id: demoUser,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      data.tasks.push(task)
      write(data)
      return task
    },
    async update(id, patch) {
      const data = read()
      const index = data.tasks.findIndex((t) => t.id === id)
      if (index < 0) throw new Error('Задача уже удалена. Обновите неделю.')
      const task = { ...data.tasks[index], ...patch, updated_at: new Date().toISOString() }
      data.tasks[index] = task
      write(data)
      return task
    },
    async createMany(entries) {
      const data = read()
      const created: typeof data.tasks = []
      for (const { id, input } of entries) {
        if (data.tasks.some((task) => task.id === id)) continue
        const task = {
          ...input,
          id,
          user_id: demoUser,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        data.tasks.push(task)
        created.push(task)
      }
      write(data)
      return created
    },
    async remove(id) {
      const data = read()
      data.tasks = data.tasks.filter((t) => t.id !== id)
      write(data)
    },
    async updateCategory(id, color) {
      const data = read()
      data.categories = data.categories.map((c) => (c.id === id ? { ...c, color } : c))
      write(data)
    },
    subscribe(onChange, onState) {
      const storage = (e: StorageEvent) => {
        if (e.key === key) onChange()
      }
      window.addEventListener('storage', storage)
      window.addEventListener(key, onChange)
      onState('connected')
      return () => {
        window.removeEventListener('storage', storage)
        window.removeEventListener(key, onChange)
      }
    },
  }
}
