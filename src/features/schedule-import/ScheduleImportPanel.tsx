import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCheck, ClipboardPaste, CalendarDays } from 'lucide-react'
import { Panel } from '../../components/Panel'
import { usePlanner } from '../../hooks/usePlanner'
import { monday, parseDate, weekLabel } from '../../lib/dates'
import type { TaskImportEntry } from '../../types/planner'
import { parseSchedule, reviewSchedule, scheduleExample } from './parseSchedule'

export function ScheduleImportPanel({
  weekStart,
  initialText = '',
  onClose,
  onApplied,
}: {
  weekStart: string
  initialText?: string
  onClose(): void
  onApplied(date: string): void
}) {
  const { actions, tasks, categories, cloud, online, session } = usePlanner()
  const [text, setText] = useState(initialText)
  const [week, setWeek] = useState(weekStart)
  const [prepared, setPrepared] = useState<{ source: string; entries: TaskImportEntry[] } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [acceptedConflicts, setAcceptedConflicts] = useState(false)
  const [success, setSuccess] = useState<{ created: number; skipped: number; date: string } | null>(
    null,
  )
  const locked = useRef(false)
  const parsed = useMemo(() => parseSchedule(text, week, categories), [text, week, categories])
  const reviewed = reviewSchedule(parsed.rows, tasks)
  const newCount = reviewed.filter((row) => !row.duplicate).length
  const skipped = reviewed.length - newCount
  const conflictCount = reviewed.filter((row) => row.conflicts.length).length
  const unavailable = !categories.length || (cloud && (!online || !session))
  const source = `${week}\n${text}`
  const previewing = prepared?.source === source
  const reset = () => {
    setPrepared(null)
    setError('')
    setAcceptedConflicts(false)
  }
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (locked.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [])
  const prepare = () => {
    setError('')
    setAcceptedConflicts(false)
    setPrepared({
      source,
      entries: parsed.rows.map((row) => ({ id: crypto.randomUUID(), input: row.input })),
    })
  }
  const apply = async () => {
    if (
      locked.current ||
      !prepared ||
      !previewing ||
      parsed.errors.length ||
      unavailable ||
      (conflictCount > 0 && !acceptedConflicts)
    )
      return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      const result = await actions.importTasks(prepared.entries)
      const date = result.created[0]?.date || prepared.entries[0].input.date
      setSuccess({ created: result.created.length, skipped: result.skipped, date })
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : 'Не удалось подтвердить сохранение.'} Повторите добавление. Уже принятые задачи из этой попытки не будут созданы повторно.`,
      )
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <Panel
      title="Вставить расписание"
      className="import-panel"
      onClose={() => {
        if (!locked.current) onClose()
      }}
    >
      <div className="panel-content">
        {success ? (
          <div className="import-success">
            <div className="feature-icon">
              <CheckCheck size={28} />
            </div>
            <h2>Расписание в плане</h2>
            <p role="status">
              Добавлено задач: {success.created}. Пропущено повторов: {success.skipped}.
            </p>
            <p className="muted">
              Задачи уже сохранены. Теперь их можно переносить и редактировать как обычно.
            </p>
            <button className="primary" onClick={() => onApplied(success.date)}>
              <CalendarDays size={17} />
              Открыть неделю
            </button>
          </div>
        ) : (
          <>
            <div className="import-intro">
              <ClipboardPaste size={25} />
              <div>
                <h2>Из нашего разговора — в неделю</h2>
                <p className="muted">
                  Обсудите план в чате, скопируйте готовое расписание и вставьте его сюда.
                </p>
              </div>
            </div>
            <label>
              Неделя для дней без даты
              <input
                aria-label="Неделя расписания"
                type="date"
                value={week}
                disabled={busy}
                onChange={(e) => {
                  if (e.target.value) {
                    setWeek(monday(e.target.value))
                    reset()
                  }
                }}
              />
            </label>
            <label htmlFor="schedule-text">Готовое расписание</label>
            <textarea
              id="schedule-text"
              className="schedule-text"
              rows={10}
              value={text}
              disabled={busy}
              maxLength={50000}
              onChange={(e) => {
                setText(e.target.value)
                reset()
              }}
              placeholder={scheduleExample(week)}
              autoFocus
            />
            <div className="import-text-actions">
              <span>До 200 задач за раз</span>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setText(scheduleExample(week))
                  reset()
                }}
              >
                Вставить пример
              </button>
            </div>
            <details className="import-help">
              <summary>Какой текст подготовить в чате</summary>
              <p>
                Попросите: «Выдай согласованное расписание для вставки в WeekPlanner». Формат каждой
                задачи:
              </p>
              <code>10:00–13:00 | Название | Категория</code>
              <p>
                Перед задачами укажите день недели или точную дату: <code>2026-09-14</code> либо{' '}
                <code>14.09.2026</code>. Строка <code>Неделя: ГГГГ-ММ-ДД</code> в начале задаёт
                понедельник и имеет приоритет над выбором выше.
              </p>
              <p>
                Категория необязательна — по умолчанию «Другое». Доступны:{' '}
                {categories.map((c) => c.name).join(', ')}.
              </p>
              <p>
                Можно добавить через <code>|</code>: <code>Описание: …</code>,{' '}
                <code>Заметки: …</code>, <code>Приоритет: высокий</code> (или обычный/низкий). Время
                и день нужны для каждой задачи; свободный рассказ пока не распознаётся.
              </p>
            </details>
            {!previewing && (
              <button
                className="primary wide"
                disabled={!text.trim() || unavailable || busy}
                onClick={prepare}
              >
                Проверить расписание
              </button>
            )}
            {previewing && (
              <section className="import-preview" aria-label="Предварительный просмотр расписания">
                <h3>Предварительный просмотр</h3>
                <p className="muted">
                  {weekLabel(parsed.weekStart)} · новых: {newCount} · повторов: {skipped}
                </p>
                {parsed.errors.length > 0 && (
                  <div className="error-box" role="alert">
                    <strong>Исправьте текст — задачи ещё не добавлены.</strong>
                    <ul>
                      {parsed.errors.map((issue, index) => (
                        <li key={index}>
                          {issue.line ? `Строка ${issue.line}: ` : ''}
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="import-rows">
                  {reviewed.map((row) => (
                    <article
                      key={row.line}
                      className={`import-row ${row.duplicate ? 'is-duplicate' : ''}`}
                    >
                      <div>
                        <strong>{row.input.title}</strong>
                        <span>
                          {parseDate(row.input.date).toLocaleDateString('ru-RU', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          · {row.input.start_time}–{row.input.end_time}
                        </span>
                      </div>
                      <span className="import-category">
                        <i style={{ background: row.input.color }} />
                        {categories.find((c) => c.id === row.input.category)?.name}
                      </span>
                      {row.duplicate && <small>Уже есть — будет пропущена</small>}
                      {row.conflicts.length > 0 && (
                        <small className="conflict-text">
                          Пересекается: {row.conflicts.join(', ')}
                        </small>
                      )}
                    </article>
                  ))}
                </div>
                {conflictCount > 0 && (
                  <label className="import-confirm">
                    <input
                      type="checkbox"
                      checked={acceptedConflicts}
                      disabled={busy}
                      onChange={(e) => setAcceptedConflicts(e.target.checked)}
                    />
                    Добавить с пересечениями ({conflictCount}). Существующие задачи останутся на
                    месте.
                  </label>
                )}
                {error && (
                  <p className="error-box" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="primary wide"
                  disabled={
                    busy ||
                    unavailable ||
                    parsed.errors.length > 0 ||
                    !newCount ||
                    (conflictCount > 0 && !acceptedConflicts)
                  }
                  onClick={() => void apply()}
                >
                  {busy ? 'Добавляем расписание…' : `Добавить в план · ${newCount}`}
                </button>
                {!newCount && !parsed.errors.length && (
                  <p className="success" role="status">
                    Все задачи уже есть в плане. Повторно добавлять их не нужно.
                  </p>
                )}
              </section>
            )}
            {unavailable && (
              <p className="info-box">
                Для добавления облачных задач войдите в аккаунт и подключитесь к интернету.
              </p>
            )}
            <p className="fine-print">
              После добавления задачи сохраняются автоматически. Этот импорт создаёт новые задачи;
              переносить существующие можно в календаре.
            </p>
          </>
        )}
      </div>
    </Panel>
  )
}
