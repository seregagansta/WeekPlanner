import { useEffect, useRef, useState } from 'react'
import { Check, Clock3, Trash2 } from 'lucide-react'
import { Panel } from '../../components/Panel'
import { usePlanner } from '../../hooks/usePlanner'
import { duration } from '../../lib/dates'
import { validateTask } from './validation'
import type { Task, TaskPatch } from '../../types/planner'

export function TaskEditor({ task, onClose }: { task: Task; onClose(): void }) {
  const { actions, categories, pending, online, cloud } = usePlanner()
  const [draft, setDraft] = useState(task)
  const [status, setStatus] = useState('Все изменения сохранены')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const changes = useRef<TaskPatch>({})
  const draftRef = useRef(draft)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saving = useRef<Promise<boolean>>(Promise.resolve(true))
  const inFlight = useRef(new Map<number, TaskPatch>())
  const revision = useRef(0)
  const flush = async (): Promise<boolean> => {
    clearTimeout(timer.current)
    const patch = changes.current
    if (!Object.keys(patch).length) return saving.current
    try {
      validateTask(draftRef.current)
    } catch (e) {
      setError((e as Error).message)
      setStatus('Не сохранено')
      return false
    }
    changes.current = {}
    setStatus('Сохраняем…')
    setError('')
    const version = ++revision.current
    inFlight.current.set(version, patch)
    const run = saving.current.then(async () => {
      try {
        await actions.updateTask(task.id, patch)
        if (!Object.keys(changes.current).length && inFlight.current.size === 1)
          setStatus('Все изменения сохранены')
        return true
      } catch (e) {
        changes.current = { ...patch, ...changes.current }
        setError(e instanceof Error ? e.message : 'Не удалось сохранить. Проверьте подключение.')
        setStatus('Не сохранено')
        return false
      } finally {
        inFlight.current.delete(version)
      }
    })
    saving.current = run
    return run
  }
  const change = (patch: TaskPatch) => {
    draftRef.current = { ...draftRef.current, ...patch }
    setDraft(draftRef.current)
    changes.current = { ...changes.current, ...patch }
    setStatus('Есть изменения…')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void flush()
    }, 650)
  }
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (Object.keys(changes.current).length) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', leave)
    return () => {
      clearTimeout(timer.current)
      window.removeEventListener('beforeunload', leave)
    }
  }, [])
  // Realtime updates merge only untouched fields; unsaved edits remain visible.
  useEffect(() => {
    draftRef.current = Object.assign({}, task, ...inFlight.current.values(), changes.current)
    setDraft(draftRef.current)
  }, [task])
  return (
    <Panel
      title="Задача"
      onClose={() => {
        void flush().then((ok) => {
          if (ok) onClose()
        })
      }}
    >
      <div className="panel-content editor">
        <div className="save-status" role="status">
          <span className={error ? 'status-dot warning' : 'status-dot'} />
          {status}
        </div>
        {cloud && !online && (
          <p className="info-box">
            Без сети доступен просмотр. Подключитесь, чтобы сохранить изменения.
          </p>
        )}
        <label className="sr-only" htmlFor="task-title">
          Название
        </label>
        <input
          id="task-title"
          className="title-input"
          value={draft.title}
          maxLength={200}
          onChange={(e) => change({ title: e.target.value })}
          autoFocus
        />
        <button
          className={`completion ${draft.completed ? 'is-complete' : ''}`}
          onClick={() => change({ completed: !draft.completed })}
        >
          <span className="check-box">{draft.completed && <Check size={14} />}</span>
          {draft.completed ? 'Выполнено' : 'Отметить выполненной'}
        </button>
        <label>
          Дата
          <input
            aria-label="Дата задачи"
            type="date"
            value={draft.date}
            onChange={(e) => change({ date: e.target.value })}
          />
        </label>
        <div className="form-row">
          <label>
            Начало
            <input
              type="time"
              value={draft.start_time.slice(0, 5)}
              onChange={(e) => change({ start_time: e.target.value })}
            />
          </label>
          <span className="time-dash">—</span>
          <label>
            Окончание
            <input
              type="time"
              value={draft.end_time.slice(0, 5)}
              onChange={(e) => change({ end_time: e.target.value })}
            />
          </label>
        </div>
        <div className="duration">
          <Clock3 size={14} />
          {Math.max(0, duration(draft.start_time, draft.end_time))} мин
        </div>
        <label>
          Категория
          <select
            value={draft.category}
            onChange={(e) =>
              change({
                category: e.target.value,
                color: categories.find((c) => c.id === e.target.value)!.color,
              })
            }
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            Приоритет
            <select
              value={draft.priority}
              onChange={(e) => change({ priority: e.target.value as Task['priority'] })}
            >
              <option value="low">Низкий</option>
              <option value="medium">Обычный</option>
              <option value="high">Высокий</option>
            </select>
          </label>
          <label className="color-field">
            Цвет
            <input
              type="color"
              value={draft.color}
              onChange={(e) => change({ color: e.target.value })}
            />
          </label>
        </div>
        <label>
          Описание
          <textarea
            aria-label="Описание"
            rows={3}
            value={draft.description}
            placeholder="Что нужно сделать?"
            onChange={(e) => change({ description: e.target.value })}
          />
        </label>
        <label>
          Заметки
          <textarea
            aria-label="Заметки"
            rows={3}
            value={draft.notes}
            placeholder="Ссылки, идеи и детали…"
            onChange={(e) => change({ notes: e.target.value })}
          />
        </label>
        {error && (
          <div className="error-box" role="alert">
            {error}
            <button className="secondary" onClick={() => void flush()}>
              Повторить сохранение
            </button>
            <button
              className="text-button"
              onClick={() => {
                changes.current = {}
                onClose()
              }}
            >
              Закрыть без несохранённых изменений
            </button>
          </div>
        )}
        <div className="editor-footer">
          {deleting ? (
            <>
              <p>Удалить эту задачу?</p>
              <div className="form-row">
                <button
                  className="danger"
                  disabled={pending > 0}
                  onClick={async () => {
                    clearTimeout(timer.current)
                    await saving.current
                    try {
                      await actions.deleteTask(task.id)
                      changes.current = {}
                      onClose()
                    } catch {
                      setError('Не удалось удалить задачу.')
                    }
                  }}
                >
                  Да, удалить
                </button>
                <button className="secondary" onClick={() => setDeleting(false)}>
                  Отмена
                </button>
              </div>
            </>
          ) : (
            <button className="text-button danger-text" onClick={() => setDeleting(true)}>
              <Trash2 size={16} />
              Удалить задачу
            </button>
          )}
        </div>
      </div>
    </Panel>
  )
}
