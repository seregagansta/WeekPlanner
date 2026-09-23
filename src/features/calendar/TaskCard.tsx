import { useDraggable } from '@dnd-kit/core'
import { Check, GripVertical, Flag } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Task } from '../../types/planner'
export function TaskCard({
  task,
  top,
  height,
  lane,
  lanes,
  category,
  disabled,
  onEdit,
  onToggle,
}: {
  task: Task
  top: number
  height: number
  lane: number
  lanes: number
  category?: string
  disabled: boolean
  onEdit(task: Task): void
  onToggle(task: Task): void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled,
  })
  const style = {
    '--task-color': task.color,
    top,
    height,
    left: `calc(${(lane / lanes) * 100}% + 5px)`,
    width: `calc(${100 / lanes}% - 10px)`,
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    zIndex: isDragging ? 30 : 2,
  } as CSSProperties
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-card ${task.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''} ${height < 66 ? 'compact' : ''}`}
    >
      <div className="task-meta">
        <span>
          {task.start_time.slice(0, 5)} – {task.end_time.slice(0, 5)}
        </span>
        <button
          className="drag-handle"
          disabled={disabled}
          {...listeners}
          {...attributes}
          aria-label={`Перенести: ${task.title}`}
          title="Потяните для переноса; с клавиатуры: пробел, стрелки, пробел"
        >
          <GripVertical size={14} />
        </button>
      </div>
      <button
        className="task-title"
        onClick={() => onEdit(task)}
        title={`${task.title}\n${task.description}`}
      >
        {task.priority === 'high' && <Flag size={11} />} {task.title}
      </button>
      {height >= 100 && <span className="task-category">{category}</span>}
      <button
        className="task-check"
        disabled={disabled}
        aria-label={`${task.completed ? 'Вернуть в работу' : 'Выполнить'}: ${task.title}`}
        aria-pressed={task.completed}
        onClick={() => onToggle(task)}
      >
        {task.completed && <Check size={11} />}
      </button>
    </article>
  )
}
