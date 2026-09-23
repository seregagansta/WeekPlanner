import { CalendarDays, Check, Cloud, Layers3, Moon, Sparkles, Sun } from 'lucide-react'
import { usePlanner } from '../hooks/usePlanner'
import { MiniCalendar } from './MiniCalendar'
export function Sidebar({
  start,
  onWeek,
  category,
  onCategory,
  onAssistant,
  onAccount,
  theme,
  onTheme,
}: {
  start: string
  onWeek(date: string): void
  category: string
  onCategory(id: string): void
  onAssistant(): void
  onAccount(): void
  theme: string
  onTheme(): void
}) {
  const { categories, cloud, session, updateCategory, reportError, online } = usePlanner()
  return (
    <aside className="sidebar">
      <a className="brand" href={import.meta.env.BASE_URL} aria-label="WeekPlanner — главная">
        <span className="brand-icon">
          <CalendarDays size={21} />
        </span>
        weekplanner<span className="brand-dot">.</span>
      </a>
      <div className="workspace-label">ЛИЧНОЕ ПРОСТРАНСТВО</div>
      <button className="nav-active" onClick={() => onCategory('all')}>
        <CalendarDays size={17} />
        Моя неделя<span>7</span>
      </button>
      <MiniCalendar start={start} onSelect={onWeek} />
      <div className="section-label">
        КАТЕГОРИИ<span>{categories.length}</span>
      </div>
      <button
        className={`category-button ${category === 'all' ? 'active' : ''}`}
        onClick={() => onCategory('all')}
      >
        <Layers3 size={15} />
        Все категории{category === 'all' && <Check size={14} />}
      </button>
      <div className="category-list">
        {categories.map((c) => (
          <div className={`category-row ${category === c.id ? 'active' : ''}`} key={c.id}>
            <input
              title={`Цвет категории «${c.name}» — для новых задач`}
              aria-label={`Цвет категории ${c.name}`}
              type="color"
              disabled={cloud && !online}
              value={c.color}
              onChange={(e) => {
                void updateCategory(c.id, e.target.value).catch(reportError)
              }}
            />
            <button onClick={() => onCategory(category === c.id ? 'all' : c.id)}>
              {c.name}
              {category === c.id && <Check size={14} />}
            </button>
          </div>
        ))}
      </div>
      <div className="sidebar-bottom">
        <button className="assistant-nav" onClick={onAssistant}>
          <Sparkles size={18} />
          <span>
            AI Assistant<small>Пространство для идей</small>
          </span>
          <span className="soon">скоро</span>
        </button>
        <div className="sidebar-divider" />
        <button className="account-button" onClick={onAccount}>
          <span className="avatar">{session?.user.email?.[0]?.toUpperCase() || 'Я'}</span>
          <span>
            {session ? 'Мой аккаунт' : 'Мой планировщик'}
            <small>
              <Cloud size={11} />
              {cloud ? 'Supabase' : 'Деморежим'}
            </small>
          </span>
        </button>
        <button className="theme-button" onClick={onTheme}>
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
        </button>
      </div>
    </aside>
  )
}
