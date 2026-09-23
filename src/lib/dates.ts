export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const parseDate = (date: string) => new Date(`${date}T12:00:00`)
export function addDays(date: string, count: number) {
  const d = parseDate(date)
  d.setDate(d.getDate() + count)
  return dateKey(d)
}
export function monday(date: string) {
  return addDays(date, -((parseDate(date).getDay() + 6) % 7))
}
export const today = () => dateKey(new Date())
export const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
export const timeString = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
export const duration = (start: string, end: string) => minutes(end) - minutes(start)
export const weekDates = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i))
export const weekdayNames = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]
export function weekLabel(start: string) {
  const format = (d: string) =>
    parseDate(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  return `${format(start)} — ${format(addDays(start, 6))}`
}
