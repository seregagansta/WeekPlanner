import { minutes, parseDate, dateKey } from '../../lib/dates'
import type { TaskInput } from '../../types/planner'
export function validateTask(task: TaskInput) {
  if (!task.title.trim()) throw new Error('Добавьте название задачи.')
  if (task.title.length > 200) throw new Error('Название должно быть короче 200 символов.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(task.date) || dateKey(parseDate(task.date)) !== task.date)
    throw new Error('Укажите корректную дату.')
  for (const t of [task.start_time, task.end_time]) {
    if (!/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(t)) throw new Error('Укажите корректное время.')
  }
  if (minutes(task.end_time) <= minutes(task.start_time))
    throw new Error('Окончание должно быть позже начала. Ночные задачи разделите на два дня.')
  if (!/^#[0-9a-f]{6}$/i.test(task.color)) throw new Error('Некорректный цвет.')
  if (!['low', 'medium', 'high'].includes(task.priority)) throw new Error('Некорректный приоритет.')
}
