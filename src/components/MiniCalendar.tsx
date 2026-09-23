import { addDays, dateKey, monday, parseDate, today } from '../lib/dates'
export function MiniCalendar({ start, onSelect }: { start: string; onSelect(date: string): void }) {
  const selected = parseDate(addDays(start, 3))
  const monthStart = dateKey(new Date(selected.getFullYear(), selected.getMonth(), 1))
  const gridStart = monday(monthStart)
  return (
    <div className="mini-calendar">
      <div className="mini-month">
        {selected.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
      </div>
      <div className="mini-grid">
        {['П', 'В', 'С', 'Ч', 'П', 'С', 'В'].map((d, i) => (
          <span className="mini-weekday" key={i}>
            {d}
          </span>
        ))}
        {Array.from({ length: 42 }, (_, i) => {
          const date = addDays(gridStart, i)
          const day = parseDate(date)
          return (
            <button
              key={date}
              aria-label={day.toLocaleDateString('ru-RU', { dateStyle: 'full' })}
              aria-current={date === today() ? 'date' : undefined}
              onClick={() => onSelect(monday(date))}
              className={`${date >= start && date <= addDays(start, 6) ? 'selected-week' : ''} ${day.getMonth() !== selected.getMonth() ? 'other-month' : ''} ${date === today() ? 'mini-today' : ''}`}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
