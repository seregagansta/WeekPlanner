import { useState } from 'react'
import { Cloud, LogOut, Mail } from 'lucide-react'
import { Panel } from '../../components/Panel'
import { supabase } from '../../lib/supabase'
import { usePlanner } from '../../hooks/usePlanner'
export function AccountPanel({ onClose }: { onClose(): void }) {
  const { session, pending, reportError } = usePlanner()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  return (
    <Panel title="Облачная синхронизация" onClose={onClose}>
      <div className="panel-content">
        <div className="feature-icon">
          <Cloud size={28} />
        </div>
        <h2>
          Одна неделя.
          <br />
          На всех устройствах.
        </h2>
        {!supabase ? (
          <>
            <p className="muted">
              Сейчас включён деморежим. Задачи сохраняются только в этом браузере.
            </p>
            <div className="info-box">
              Подключите проект Supabase по инструкции в README и добавьте URL и публичный ключ в{' '}
              <code>.env.local</code>. Затем перезапустите приложение.
            </div>
            <p className="muted">
              После подключения войдите с одним email на Mac и Windows. Демозадачи не переносятся в
              облако автоматически.
            </p>
          </>
        ) : session ? (
          <>
            <p>
              Вы вошли как <strong>{session.user.email}</strong>
            </p>
            <p className="muted">
              Откройте приложение на другом устройстве и войдите с тем же email.
            </p>
            <button
              className="secondary"
              disabled={busy || pending > 0}
              onClick={async () => {
                setBusy(true)
                const { error } = await supabase!.auth.signOut()
                setBusy(false)
                if (error) reportError(error)
                else {
                  localStorage.removeItem(`weekplanner.cache.${session.user.id}`)
                  onClose()
                }
              }}
            >
              <LogOut size={16} /> Выйти
            </button>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              const { error } = await supabase!.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: window.location.origin },
              })
              setBusy(false)
              if (error) reportError(error)
              else setSent(true)
            }}
          >
            <p className="muted">Пришлём ссылку для входа. Пароль не нужен.</p>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <button className="primary wide" disabled={busy}>
              <Mail size={16} />
              {busy ? 'Отправляем…' : 'Получить ссылку'}
            </button>
            {sent && (
              <p className="success" role="status">
                Письмо отправлено. Откройте ссылку в браузере на этом устройстве.
              </p>
            )}
          </form>
        )}
      </div>
    </Panel>
  )
}
