import { useCallback, useEffect, useState } from 'react'
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Plus,
  Search,
  Sparkles,
  X,
  WifiOff,
  RefreshCw,
  Moon,
  Sun,
  ClipboardPaste,
} from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { WeekGrid } from '../features/calendar/WeekGrid'
import { TaskEditor } from '../features/tasks/TaskEditor'
import { AssistantPanel } from '../features/assistant/AssistantPanel'
import { AccountPanel } from '../features/auth/AccountPanel'
import { ScheduleImportPanel } from '../features/schedule-import/ScheduleImportPanel'
import { usePlanner } from '../hooks/usePlanner'
import { useTheme } from '../hooks/useTheme'
import { addDays, duration, monday, today, weekLabel, parseDate } from '../lib/dates'
import { emptyTask } from '../services/defaults'
import type { Task } from '../types/planner'
export function PlannerPage() {
  const planner = usePlanner()
  const { actions, categories, reportError } = planner
  const { theme, toggleTheme } = useTheme()
  const [start, setStart] = useState(monday(today()))
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panel, setPanel] = useState<'assistant' | 'account' | 'import' | null>(null)
  const [importText, setImportText] = useState('')
  const [creating, setCreating] = useState(false)
  const week = planner.tasks.filter((t) => t.date >= start && t.date <= addDays(start, 6))
  const shown = week.filter(
    (t) =>
      (category === 'all' || t.category === category) &&
      (status === 'all' ||
        (status === 'done'
          ? t.completed
          : status === 'high'
            ? t.priority === 'high'
            : !t.completed)) &&
      `${t.title} ${t.description} ${t.notes}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  )
  const selected = planner.tasks.find((t) => t.id === selectedId)
  const completed = week.filter((t) => t.completed).length
  const hours = week.reduce((sum, t) => sum + duration(t.start_time, t.end_time), 0) / 60
  const disabled =
    planner.loading ||
    creating ||
    !planner.categories.length ||
    (planner.cloud && (!planner.session || !planner.online))
  const create = useCallback(
    async (date: string, time?: string) => {
      if (disabled) return
      setCreating(true)
      try {
        const task = await actions.createTask(
          emptyTask(date, categories.find((c) => c.id === category) || categories[0], time),
        )
        setSelectedId(task.id)
      } catch (e) {
        reportError(e)
      } finally {
        setCreating(false)
      }
    },
    [disabled, actions, categories, reportError, category],
  )
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.closest('input,textarea,select,dialog') || event.target.isContentEditable)
      )
        return
      if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        void create(start === monday(today()) ? today() : start)
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [create, start])
  const openTask = (task: Task) => setSelectedId(task.id)
  const syncLabel = !planner.online
    ? 'Нет сети'
    : planner.pending
      ? 'Сохраняем…'
      : !planner.cloud
        ? 'Деморежим · на устройстве'
        : !planner.session
          ? 'Войти для синхронизации'
          : planner.connection === 'connected'
            ? 'Синхронизировано'
            : planner.connection === 'connecting'
              ? 'Подключение…'
              : 'Realtime недоступен'
  return (
    <div className="app-shell">
      <Sidebar
        start={start}
        onWeek={setStart}
        category={category}
        onCategory={setCategory}
        onAssistant={() => setPanel('assistant')}
        onAccount={() => setPanel('account')}
        theme={theme}
        onTheme={toggleTheme}
      />
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Моё пространство<span>/</span>
            <strong>Неделя</strong>
          </div>
          <div className="topbar-actions">
            <button className="sync-indicator" onClick={() => setPanel('account')}>
              {planner.online ? <Cloud size={15} /> : <WifiOff size={15} />}
              <span>{syncLabel}</span>
            </button>
            <button
              className="icon-button mobile-theme"
              onClick={toggleTheme}
              aria-label="Переключить тему"
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button
              className="icon-button assistant-top"
              onClick={() => setPanel('assistant')}
              aria-label="Открыть AI Assistant"
            >
              <Sparkles size={18} />
            </button>
          </div>
        </header>
        <div className="week-toolbar">
          <div>
            <div className="eyebrow">ВАШ НЕДЕЛЬНЫЙ ПЛАН · {parseDate(start).getFullYear()}</div>
            <h1>{weekLabel(start)}</h1>
          </div>
          <div className="week-controls">
            <div className="week-arrows">
              <button
                className="icon-button"
                aria-label="Предыдущая неделя"
                onClick={() => setStart(addDays(start, -7))}
              >
                <ChevronLeft size={19} />
              </button>
              <button
                className="icon-button"
                aria-label="Следующая неделя"
                onClick={() => setStart(addDays(start, 7))}
              >
                <ChevronRight size={19} />
              </button>
            </div>
            <button className="secondary" onClick={() => setStart(monday(today()))}>
              Сегодня
            </button>
            <button
              className="secondary import-launch"
              disabled={disabled}
              onClick={() => {
                setImportText('')
                setPanel('import')
              }}
            >
              <ClipboardPaste size={16} />
              Вставить расписание
            </button>
            <button
              className="primary"
              disabled={disabled}
              onClick={() => void create(start === monday(today()) ? today() : start)}
            >
              <Plus size={17} />
              {creating ? 'Создаём…' : 'Задача'}
              <kbd>N</kbd>
            </button>
          </div>
        </div>
        <div className="filterbar">
          <div className="week-summary">
            <span>
              <span className="tiny-dot" />
              {week.length} задач
            </span>
            <span>{Number(hours.toFixed(1))} ч в плане</span>
            <span className="done-summary">
              <CheckCheck size={15} />
              {completed} выполнено
            </span>
          </div>
          <div className="filters">
            <div className="search">
              <Search size={15} />
              <input
                aria-label="Поиск задач"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Найти задачу…"
              />
              {search && (
                <button
                  className="icon-button"
                  onClick={() => setSearch('')}
                  aria-label="Очистить поиск"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <select
              aria-label="Фильтр задач"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Все задачи</option>
              <option value="active">В работе</option>
              <option value="done">Выполненные</option>
              <option value="high">Высокий приоритет</option>
            </select>
          </div>
        </div>
        {!planner.cloud && (
          <div className="demo-banner">
            <span>Демопространство — изменения сохраняются в этом браузере.</span>
            <button onClick={() => setPanel('account')}>
              Подключить облако <span>↗</span>
            </button>
          </div>
        )}
        {planner.cloud && !planner.online && (
          <div className="demo-banner">
            Нет сети. Показана последняя загруженная версия; облачные изменения доступны после
            подключения.
          </div>
        )}
        {planner.error && (
          <div className="error-banner" role="alert">
            <span>{planner.error}</span>
            <button
              className="icon-button"
              aria-label="Повторить загрузку"
              onClick={() => {
                planner.clearError()
                void planner.refresh()
              }}
            >
              <RefreshCw size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Закрыть ошибку"
              onClick={planner.clearError}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {!planner.authReady || planner.loading ? (
          <div className="empty-state">
            <div className="loading-ring" />
            Загружаем вашу неделю…
          </div>
        ) : planner.cloud && !planner.session ? (
          <div className="empty-state">
            <Cloud size={38} />
            <h2>Ваша неделя ждёт вас</h2>
            <p>Войдите, чтобы открыть задачи и синхронизировать устройства.</p>
            <button className="primary" onClick={() => setPanel('account')}>
              Войти по email
            </button>
          </div>
        ) : (
          <>
            {(search || category !== 'all' || status !== 'all') && (
              <div className="filter-notice">
                Найдено: {shown.length}
                <button
                  onClick={() => {
                    setSearch('')
                    setCategory('all')
                    setStatus('all')
                  }}
                >
                  Сбросить фильтры
                </button>
              </div>
            )}
            <WeekGrid
              start={start}
              tasks={shown}
              disabled={disabled}
              onEdit={openTask}
              onCreate={(date, time) => void create(date, time)}
            />
          </>
        )}
        <footer className="calendar-footer">
          <span>
            <span className="status-dot" />
            {planner.pending ? 'Сохраняем изменения…' : 'Автосохранение включено'}
          </span>
          <span>Перетаскивайте карточку за ⋮⋮ · Нажмите на время, чтобы добавить задачу</span>
        </footer>
      </main>
      {selected && (
        <TaskEditor key={selected.id} task={selected} onClose={() => setSelectedId(null)} />
      )}
      {panel === 'assistant' && (
        <AssistantPanel
          onClose={() => setPanel(null)}
          onImport={(text) => {
            setImportText(text)
            setPanel('import')
          }}
        />
      )}
      {panel === 'account' && <AccountPanel onClose={() => setPanel(null)} />}
      {panel === 'import' && (
        <ScheduleImportPanel
          weekStart={start}
          initialText={importText}
          onClose={() => setPanel(null)}
          onApplied={(date) => {
            setStart(monday(date))
            setSearch('')
            setCategory('all')
            setStatus('all')
            setPanel(null)
          }}
        />
      )}
    </div>
  )
}
