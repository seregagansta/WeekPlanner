export type Priority = 'low' | 'medium' | 'high'
// Reserved for the recurrence engine. A task remains a concrete occurrence.
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly'
  interval: number
  until?: string
  weekdays?: number[]
}
export interface Task {
  id: string
  user_id: string
  title: string
  description: string
  date: string
  start_time: string
  end_time: string
  category: string
  color: string
  priority: Priority
  completed: boolean
  notes: string
  recurrence: RecurrenceRule | null
  series_id: string | null
  created_at: string
  updated_at: string
}
export type TaskInput = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type TaskPatch = Partial<TaskInput>
export interface TaskImportEntry {
  id: string
  input: TaskInput
}
export interface Category {
  id: string
  user_id: string
  name: string
  color: string
}
export interface PlannerSnapshot {
  tasks: Task[]
  categories: Category[]
}
export type ConnectionState = 'connecting' | 'connected' | 'disconnected'
export interface PlannerRepository {
  mode: 'demo' | 'cloud'
  load(): Promise<PlannerSnapshot>
  create(input: TaskInput): Promise<Task>
  createMany(entries: TaskImportEntry[]): Promise<Task[]>
  update(id: string, patch: TaskPatch): Promise<Task>
  remove(id: string): Promise<void>
  updateCategory(id: string, color: string): Promise<void>
  subscribe(onChange: () => void, onState: (state: ConnectionState) => void): () => void
}
