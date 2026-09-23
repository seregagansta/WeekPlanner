import { describe, expect, it } from 'vitest'
import { parseSchedule, reviewSchedule, scheduleExample } from './parseSchedule'
import type { Category, Task } from '../../types/planner'
const categories: Category[] = [
  { id: 'other', user_id: 'user', name: 'Другое', color: '#89909c' },
  { id: 'cgi', user_id: 'user', name: '3D / CGI', color: '#8f6bc4' },
  { id: 'english', user_id: 'user', name: 'Английский', color: '#379b8f' },
  { id: 'orders', user_id: 'user', name: 'Заказы', color: '#d29438' },
  { id: 'jobs', user_id: 'user', name: 'Поиск работы', color: '#cd7285' },
]
describe('Paste schedule parser', () => {
  it('uses the explicit week rather than the currently viewed week', () => {
    const result = parseSchedule(scheduleExample('2026-09-14'), '2026-09-07', categories)
    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(4)
    expect(result.rows.map((row) => row.input.date)).toEqual([
      '2026-09-14',
      '2026-09-14',
      '2026-09-17',
      '2026-09-18',
    ])
    expect(result.rows[2].input.priority).toBe('high')
    expect(result.rows[0].input.color).toBe('#8f6bc4')
  })
  it('accepts Markdown, en/em dashes, short hour, exact dates and optional fields', () => {
    const text =
      '```text\n## **Пн**\n- 9:00—10:30 | Моделирование | 3d / cgi | Описание: Корпус | Заметки: Проверить\n\n16.09.2026:\n10.00-11.00 | Чтение\n```'
    const result = parseSchedule(text, '2026-09-14', categories)
    expect(result.errors).toEqual([])
    expect(result.rows[0].input).toMatchObject({
      date: '2026-09-14',
      start_time: '09:00',
      end_time: '10:30',
      category: 'cgi',
      description: 'Корпус',
      notes: 'Проверить',
    })
    expect(result.rows[1].input).toMatchObject({ date: '2026-09-16', category: 'other' })
  })
  it('never silently accepts unknown text, categories or missing dates', () => {
    for (const text of [
      'Сделай мне свободный вечер',
      '10:00–11:00 | Без дня',
      'Среда\n10:00–11:00 | Задача | Несуществующая',
      'Среда\n10:00–11:00 | Задача | Другое | Что-то ещё',
    ]) {
      expect(parseSchedule(text, '2026-09-07', categories).errors.length).toBeGreaterThan(0)
    }
  })
  it('rejects impossible dates, reversed times and ambiguous week changes', () => {
    for (const text of [
      '2026-02-30\n10:00–11:00 | Задача',
      'Среда\n20:00–11:00 | Задача',
      'Неделя: 2026-09-15\nСреда\n10:00–11:00 | Задача',
      'Среда\nНеделя: 2026-09-14\n10:00–11:00 | Задача',
    ]) {
      expect(parseSchedule(text, '2026-09-07', categories).errors.length).toBeGreaterThan(0)
    }
  })
  it('detects duplicates and overlapping intervals but not touching boundaries', () => {
    const parsed = parseSchedule(
      'Понедельник\n10:00–11:00 | Первый\n10:00–11:00 | первый\n10:30–11:30 | Второй\n11:30–12:00 | Третий',
      '2026-09-14',
      categories,
    )
    const review = reviewSchedule(parsed.rows, [])
    expect(review.map((row) => row.duplicate)).toEqual([false, true, false, false])
    expect(review[2].conflicts).toEqual(['Первый'])
    expect(review[3].conflicts).toEqual([])
    const existing = { ...parsed.rows[0].input, id: 'existing' } as Task
    expect(reviewSchedule(parsed.rows, [existing])[0].duplicate).toBe(true)
  })
  it('enforces a batch size limit', () => {
    const result = parseSchedule(
      `Понедельник\n${Array.from({ length: 201 }, (_, i) => `10:00–11:00 | Задача ${i}`).join('\n')}`,
      '2026-09-07',
      categories,
    )
    expect(result.errors[0].message).toContain('200')
  })
})
