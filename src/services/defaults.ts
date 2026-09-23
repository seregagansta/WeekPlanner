import type { Category, Task, TaskInput } from '../types/planner'
import { addDays, monday, today } from '../lib/dates'
export const defaultCategories = [
  ['Работа', '#5979d7'],
  ['Заказы', '#d29438'],
  ['3D / CGI', '#8f6bc4'],
  ['Поиск работы', '#cd7285'],
  ['Английский', '#379b8f'],
  ['Обучение', '#498cbd'],
  ['Личное', '#78a04c'],
  ['Другое', '#89909c'],
]
export const demoUser = '00000000-0000-4000-8000-000000000001'
export function emptyTask(date: string, category: Category, start = '10:00'): TaskInput {
  const hour = Math.min(22, Number(start.slice(0, 2)))
  return {
    title: 'Новая задача',
    description: '',
    date,
    start_time: `${String(hour).padStart(2, '0')}:00`,
    end_time: `${String(hour + 1).padStart(2, '0')}:00`,
    category: category.id,
    color: category.color,
    priority: 'medium',
    completed: false,
    notes: '',
    recurrence: null,
    series_id: null,
  }
}
export function makeDemoData() {
  const categories = defaultCategories.map(([name, color]) => ({
    id: crypto.randomUUID(),
    user_id: demoUser,
    name,
    color,
  }))
  const start = monday(today())
  const examples: [string, number, string, string, number, boolean, string][] = [
    ['План недели', 0, '09:00', '09:45', 0, true, 'Определить три главных результата недели.'],
    [
      'MAX450 · моделирование',
      0,
      '10:00',
      '12:30',
      2,
      false,
      'Проработка формы и деталей корпуса.',
    ],
    ['Английский', 0, '15:00', '15:40', 4, false, 'Разговорная практика'],
    [
      'MAX450 · материалы',
      1,
      '10:00',
      '12:00',
      2,
      false,
      'Подготовить материалы и тестовые рендеры.',
    ],
    ['Созвон с клиентом', 1, '14:00', '15:00', 1, false, 'Обсудить первую подачу.'],
    [
      'Обновить портфолио',
      2,
      '09:30',
      '11:00',
      3,
      false,
      'Выбрать три проекта для новой подборки.',
    ],
    ['Английский', 2, '13:00', '13:40', 4, false, 'Практика аудирования'],
    ['Свет и композиция', 3, '10:00', '12:00', 5, false, 'Разбор референсов и практика.'],
    ['Созвон с клиентом', 3, '15:00', '16:00', 1, false, 'Промежуточный просмотр'],
    [
      'MAX450 · финальный рендер',
      4,
      '10:00',
      '13:00',
      2,
      false,
      'Проверить детали перед отправкой.',
    ],
    ['Английский', 4, '15:00', '15:40', 4, false, 'Повторение недели'],
    ['Прогулка без телефона', 5, '11:00', '12:30', 6, false, ''],
    ['Подвести итоги', 6, '16:00', '17:00', 6, false, 'Что получилось и что хочется изменить?'],
  ]
  const tasks: Task[] = examples.map(
    ([title, day, start_time, end_time, cat, completed, description], i) => ({
      ...emptyTask(addDays(start, day), categories[cat]),
      title,
      start_time,
      end_time,
      completed,
      description,
      priority: i === 9 ? 'high' : 'medium',
      id: crypto.randomUUID(),
      user_id: demoUser,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  )
  return { categories, tasks }
}
