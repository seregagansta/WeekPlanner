import { addDays, dateKey, minutes, monday, parseDate } from '../../lib/dates'
import type { Category, Task, TaskInput } from '../../types/planner'
import { validateTask } from '../tasks/validation'

export interface ScheduleRow {
  line: number
  input: TaskInput
}
export interface ScheduleIssue {
  line: number
  message: string
}
export interface ScheduleParseResult {
  rows: ScheduleRow[]
  errors: ScheduleIssue[]
  weekStart: string
}
const normalize = (text: string) =>
  text.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ')
const weekdays: Record<string, number> = {
  понедельник: 0,
  пн: 0,
  вторник: 1,
  вт: 1,
  среда: 2,
  ср: 2,
  четверг: 3,
  чт: 3,
  пятница: 4,
  пт: 4,
  суббота: 5,
  сб: 5,
  воскресенье: 6,
  вс: 6,
}
export const scheduleIdentity = (
  task: Pick<TaskInput, 'date' | 'start_time' | 'end_time' | 'title'>,
) =>
  [task.date, task.start_time.slice(0, 5), task.end_time.slice(0, 5), normalize(task.title)].join(
    '|',
  )

function readDate(value: string): string | null {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  const date = match ? `${match[3]}-${match[2]}-${match[1]}` : value
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && dateKey(parseDate(date)) === date ? date : null
}

export function parseSchedule(
  text: string,
  selectedWeek: string,
  categories: Category[],
): ScheduleParseResult {
  const result: ScheduleParseResult = { rows: [], errors: [], weekStart: monday(selectedWeek) }
  if (text.length > 50000) {
    result.errors.push({
      line: 0,
      message: 'Слишком большой текст. Вставьте не больше 50 000 символов.',
    })
    return result
  }
  let currentDate: string | null = null
  let hasWeek = false
  let sawDay = false
  const fallback = categories.find((c) => normalize(c.name) === 'другое') || categories[0]
  const lines = text.replace(/\r/g, '').split('\n')
  lines.forEach((raw, index) => {
    const line = index + 1
    // Accept a copied Markdown code block and common list/heading formatting.
    const value = raw
      .trim()
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[-*•]\s+/, '')
      .replace(/\*\*/g, '')
      .trim()
    if (!value || /^```(?:text|plaintext)?$/i.test(value)) return
    const fail = (message: string) => result.errors.push({ line, message })
    const week = value.match(/^неделя\s*:\s*(.+)$/i)
    if (week) {
      const date = readDate(week[1].trim())
      if (hasWeek || sawDay || result.rows.length) {
        fail('Укажите «Неделя: ГГГГ-ММ-ДД» один раз, перед днями и задачами.')
        return
      }
      hasWeek = true
      if (!date || monday(date) !== date) {
        fail('В строке «Неделя» нужна корректная дата понедельника.')
        return
      }
      result.weekStart = date
      return
    }
    const heading = value.replace(/:$/, '').trim()
    if (Object.hasOwn(weekdays, normalize(heading))) {
      currentDate = addDays(result.weekStart, weekdays[normalize(heading)])
      sawDay = true
      return
    }
    const explicitDate = readDate(heading)
    if (explicitDate) {
      currentDate = explicitDate
      sawDay = true
      return
    }
    if (/^\d{4}-\d{2}-\d{2}:?$|^\d{2}\.\d{2}\.\d{4}:?$/.test(value)) {
      currentDate = null
      fail('Некорректная дата.')
      return
    }

    const parts = value.split('|').map((part) => part.trim())
    const time = parts[0].match(/^(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})$/)
    if (!time || parts.length < 2) {
      fail('Ожидается день или строка «10:00–11:00 | Название | Категория».')
      return
    }
    if (!currentDate) {
      fail('Перед задачей укажите день недели или дату ГГГГ-ММ-ДД.')
      return
    }
    const category = parts[2]
      ? categories.find((c) => normalize(c.name) === normalize(parts[2]))
      : fallback
    if (!category) {
      fail(`Неизвестная категория «${parts[2] || ''}». Выберите одну из категорий планировщика.`)
      return
    }
    const input: TaskInput = {
      title: parts[1],
      date: currentDate,
      start_time: `${time[1].padStart(2, '0')}:${time[2]}`,
      end_time: `${time[3].padStart(2, '0')}:${time[4]}`,
      category: category.id,
      color: category.color,
      description: '',
      notes: '',
      priority: 'medium',
      completed: false,
      recurrence: null,
      series_id: null,
    }
    const used = new Set<string>()
    for (const extra of parts.slice(3)) {
      const field = extra.match(/^(описание|заметки|приоритет)\s*:\s*(.*)$/i)
      if (!field) {
        fail(
          'После категории допустимы «Описание: …», «Заметки: …», «Приоритет: высокий/обычный/низкий».',
        )
        return
      }
      const key = normalize(field[1])
      if (used.has(key)) {
        fail(`Поле «${field[1]}» повторяется.`)
        return
      }
      used.add(key)
      if (key === 'описание') input.description = field[2]
      else if (key === 'заметки') input.notes = field[2]
      else {
        const priorities = { высокий: 'high', обычный: 'medium', низкий: 'low' } as const
        const priority = priorities[normalize(field[2]) as keyof typeof priorities]
        if (!priority) {
          fail('Приоритет: высокий, обычный или низкий.')
          return
        }
        input.priority = priority
      }
    }
    try {
      validateTask(input)
      result.rows.push({ line, input })
    } catch (e) {
      fail((e as Error).message)
    }
  })
  if (result.rows.length > 200)
    result.errors.push({ line: 0, message: 'За один раз можно добавить не больше 200 задач.' })
  if (!result.rows.length && !result.errors.length)
    result.errors.push({ line: 0, message: 'Вставьте хотя бы одну задачу с днём и временем.' })
  return result
}

export function reviewSchedule(rows: ScheduleRow[], existing: Task[]) {
  const seen = new Set(existing.map(scheduleIdentity))
  const occupied: Pick<TaskInput, 'date' | 'start_time' | 'end_time' | 'title'>[] = [...existing]
  return rows.map((row) => {
    const identity = scheduleIdentity(row.input)
    const duplicate = seen.has(identity)
    const conflicts = duplicate
      ? []
      : occupied
          .filter(
            (task) =>
              task.date === row.input.date &&
              minutes(task.start_time) < minutes(row.input.end_time) &&
              minutes(row.input.start_time) < minutes(task.end_time),
          )
          .map((task) => task.title)
    seen.add(identity)
    if (!duplicate) occupied.push(row.input)
    return { ...row, duplicate, conflicts }
  })
}

export function scheduleExample(weekStart: string) {
  return `Неделя: ${weekStart}\n\nПонедельник\n10:00–13:00 | Работа над MAX450 | 3D / CGI\n15:00–15:40 | Английский | Английский\n\nЧетверг\n15:00–16:00 | Созвон с клиентом | Заказы | Приоритет: высокий\n\nПятница\n10:00–12:00 | Обновить портфолио | Поиск работы`
}
