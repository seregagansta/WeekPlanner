import { useState } from 'react'
import { ArrowUp, CalendarDays, Sparkles, Clock3, ClipboardPaste } from 'lucide-react'
import { Panel } from '../../components/Panel'
import { usePlanner } from '../../hooks/usePlanner'
import { addDays, today, parseDate } from '../../lib/dates'
import { MicrophoneButton } from './MicrophoneButton'
export function AssistantPanel({
  onClose,
  onImport,
}: {
  onClose(): void
  onImport(text: string): void
}) {
  const { actions } = usePlanner()
  const [command, setCommand] = useState('')
  const [answer, setAnswer] = useState('')
  const tomorrow = addDays(today(), 1)
  return (
    <Panel title="AI Assistant" className="assistant-panel" onClose={onClose}>
      <div className="panel-content assistant-content">
        <div className="assistant-orb">
          <Sparkles size={30} />
        </div>
        <span className="eyebrow">БОЛЬШЕ ВРЕМЕНИ НА ГЛАВНОЕ</span>
        <h2>
          Планируйте.
          <br />
          Своими словами.
        </h2>
        <p className="muted">
          Здесь появится помощник, который понимает вашу неделю. AI ещё не подключён; уже можно
          посмотреть расписание и свободное время.
        </p>
        <div className="suggestions">
          <button onClick={() => onImport(command)}>
            <ClipboardPaste size={17} />
            <span>
              Вставить готовое расписание<small>Перенести план из нашего разговора</small>
            </span>
          </button>
          <button
            onClick={() => {
              const tasks = actions.getDaySchedule(tomorrow)
              setAnswer(
                tasks.length
                  ? tasks
                      .map(
                        (t) =>
                          `${t.start_time.slice(0, 5)}–${t.end_time.slice(0, 5)}  ${t.title}${t.completed ? ' ✓' : ''}`,
                      )
                      .join('\n')
                  : 'Завтра пока нет задач.',
              )
            }}
          >
            <CalendarDays size={17} />
            <span>
              Что у меня завтра?
              <small>
                {parseDate(tomorrow).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </small>
            </span>
          </button>
          <button
            onClick={() => {
              const slots = actions.findFreeSlots(tomorrow, 120)
              setAnswer(
                slots.length
                  ? `Завтра между 09:00 и 20:00 есть свободные интервалы от двух часов:\n\n${slots.map((s) => `${s.start_time}–${s.end_time}`).join('\n')}`
                  : 'Завтра нет свободного двухчасового интервала между 09:00 и 20:00.',
              )
            }}
          >
            <Clock3 size={17} />
            <span>
              Найти два свободных часа<small>В расписании на завтра</small>
            </span>
          </button>
        </div>
        {answer && (
          <div className="assistant-answer" role="status">
            {answer}
          </div>
        )}
        <div className="assistant-compose">
          <label htmlFor="assistant-command">Будущая команда помощнику</label>
          <textarea
            id="assistant-command"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            rows={3}
            placeholder="Завтра с 10 до 13 поставь работу над MAX450…"
          />
          <div>
            <MicrophoneButton onTranscript={(text) => setCommand(text)} />
            <span>AI пока не подключён</span>
            <button
              className="send-button"
              aria-label="Проверить доступность AI"
              disabled={!command.trim()}
              onClick={() =>
                setAnswer(
                  'Команда получена, но языковая модель пока не подключена. Расписание не изменено. Сейчас используйте редактор задач или быстрые запросы выше.',
                )
              }
            >
              <ArrowUp size={19} />
            </button>
          </div>
        </div>
        <p className="fine-print">
          Диктовка использует службу браузера, если она доступна. Она может требовать интернет и
          обрабатывать голос на серверах поставщика браузера.
        </p>
      </div>
    </Panel>
  )
}
