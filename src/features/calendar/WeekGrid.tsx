import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { minutes, parseDate, timeString, today, weekDates, weekdayNames } from '../../lib/dates'
import { usePlanner } from '../../hooks/usePlanner'
import { TaskCard } from './TaskCard'
import { layoutTasks } from './layout'
import type { Task } from '../../types/planner'
const hourHeight = 72
function DayColumn({
  date,
  tasks,
  firstHour,
  lastHour,
  onEdit,
  onCreate,
  disabled,
}: {
  date: string
  tasks: Task[]
  firstHour: number
  lastHour: number
  onEdit(t: Task): void
  onCreate(date: string, time?: string): void
  disabled: boolean
}) {
  const { categories, actions, reportError } = usePlanner()
  const { setNodeRef, isOver } = useDroppable({ id: date, disabled })
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return (
    <div
      ref={setNodeRef}
      className={`day-column ${date === today() ? 'today-column' : ''} ${isOver ? 'drop-target' : ''}`}
      style={{ height: (lastHour - firstHour) * hourHeight }}
    >
      {Array.from({ length: lastHour - firstHour }, (_, i) => (
        <button
          key={i}
          disabled={disabled}
          className="hour-cell"
          style={{ top: i * hourHeight, height: hourHeight }}
          aria-label={`Добавить задачу ${date} в ${timeString((i + firstHour) * 60)}`}
          onClick={() => onCreate(date, timeString((i + firstHour) * 60))}
        >
          <Plus size={15} />
        </button>
      ))}
      {layoutTasks(tasks).map(({ task, lane, lanes }) => (
        <TaskCard
          key={task.id}
          task={task}
          lane={lane}
          lanes={lanes}
          disabled={disabled}
          category={categories.find((c) => c.id === task.category)?.name}
          top={((minutes(task.start_time) - firstHour * 60) / 60) * hourHeight}
          height={Math.max(
            46,
            ((minutes(task.end_time) - minutes(task.start_time)) / 60) * hourHeight - 5,
          )}
          onEdit={onEdit}
          onToggle={(t) => {
            void actions.updateTask(t.id, { completed: !t.completed }).catch(reportError)
          }}
        />
      ))}
      {date === today() && nowMinutes >= firstHour * 60 && nowMinutes < lastHour * 60 && (
        <div
          className="now-line"
          style={{ top: ((nowMinutes - firstHour * 60) / 60) * hourHeight }}
        >
          <span />
        </div>
      )}
    </div>
  )
}
export function WeekGrid({
  start,
  tasks,
  disabled,
  onEdit,
  onCreate,
}: {
  start: string
  tasks: Task[]
  disabled: boolean
  onEdit(t: Task): void
  onCreate(date: string, time?: string): void
}) {
  const { actions, reportError } = usePlanner()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )
  const dates = weekDates(start)
  const firstHour = Math.min(8, ...tasks.map((t) => Math.floor(minutes(t.start_time) / 60)))
  const lastHour = Math.max(20, ...tasks.map((t) => Math.ceil(minutes(t.end_time) / 60)))
  return (
    <div className="calendar-scroll">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          if (event.over && !disabled) {
            void actions.moveTask(String(event.active.id), String(event.over.id)).catch(reportError)
          }
        }}
      >
        <div className="week-grid" style={{ '--hour-height': `${hourHeight}px` } as CSSProperties}>
          <div
            className="week-head timezone"
            title={Intl.DateTimeFormat().resolvedOptions().timeZone}
          >
            {new Date().toLocaleTimeString('en', { timeZoneName: 'short' }).split(' ').at(-1)}
          </div>
          {dates.map((date, index) => (
            <div
              key={date}
              className={`week-head day-heading ${date === today() ? 'is-today' : ''}`}
            >
              <span>{weekdayNames[index]}</span>
              <div>
                <strong>{parseDate(date).getDate()}</strong>
                <button
                  className="icon-button"
                  disabled={disabled}
                  aria-label={`Добавить задачу на ${weekdayNames[index]}`}
                  onClick={() => onCreate(date)}
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          ))}
          <div className="time-gutter" style={{ height: (lastHour - firstHour) * hourHeight }}>
            {Array.from({ length: lastHour - firstHour }, (_, i) => (
              <span key={i} style={{ top: i * hourHeight }}>
                {timeString((i + firstHour) * 60)}
              </span>
            ))}
          </div>
          {dates.map((date) => (
            <DayColumn
              key={date}
              date={date}
              tasks={tasks.filter((t) => t.date === date)}
              firstHour={firstHour}
              lastHour={lastHour}
              onEdit={onEdit}
              onCreate={onCreate}
              disabled={disabled}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}
