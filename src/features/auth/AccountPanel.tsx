import { useEffect, useState } from 'react'
import { Cloud, LogOut, Mail } from 'lucide-react'
import { Panel } from '../../components/Panel'
import { supabase } from '../../lib/supabase'
import { usePlanner } from '../../hooks/usePlanner'
import {
  getAuthErrorMessage,
  getAuthRedirectUrl,
  signInWithGoogle,
} from '../../services/authService'
import { GoogleSignInButton } from './GoogleSignInButton'

export function AccountPanel({ onClose }: { onClose(): void }) {
  const { session, pending, online } = usePlanner()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<'google' | 'email' | 'logout' | null>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const redirectTo = getAuthRedirectUrl(window.location.origin, import.meta.env.BASE_URL)
  const disabled = Boolean(busy) || !online

  useEffect(() => {
    // Browser Back can restore a panel whose previous redirect is still marked busy.
    const resume = () => setBusy(null)
    window.addEventListener('pageshow', resume)
    return () => window.removeEventListener('pageshow', resume)
  }, [])

  async function googleLogin() {
    if (!supabase) return
    setError(null)
    setBusy('google')
    try {
      const url = await signInWithGoogle(supabase, redirectTo)
      window.location.assign(url)
    } catch (cause) {
      setError(getAuthErrorMessage(cause))
      setBusy(null)
    }
  }

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
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {!online && (
          <p className="info-box" role="status">
            Для входа и выхода нужен интернет.
          </p>
        )}
        {!supabase ? (
          <>
            <p className="muted">
              Сейчас включён деморежим. Задачи сохраняются только в этом браузере.
            </p>
            <GoogleSignInButton disabled onClick={() => undefined} />
            <div className="info-box">
              Для входа подключите Supabase: добавьте URL проекта и публичный ключ в{' '}
              <code>.env.local</code> и перезапустите приложение. Затем включите Google в Supabase
              по инструкции <code>docs/google-login.md</code>.
            </div>
            <p className="muted">
              Войдите в один аккаунт на Mac и Windows. Демозадачи не переносятся в облако
              автоматически.
            </p>
          </>
        ) : session ? (
          <>
            <p>
              Вы вошли как <strong>{session.user.email}</strong>
            </p>
            <p className="muted">
              Откройте приложение на другом устройстве и войдите в тот же аккаунт.
            </p>
            <button
              className="secondary"
              disabled={disabled || pending > 0}
              onClick={async () => {
                if (!supabase) return
                setError(null)
                setBusy('logout')
                try {
                  const { error: authError } = await supabase.auth.signOut()
                  if (authError) throw authError
                  localStorage.removeItem(`weekplanner.cache.${session.user.id}`)
                  onClose()
                } catch (cause) {
                  setError(getAuthErrorMessage(cause))
                } finally {
                  setBusy(null)
                }
              }}
            >
              <LogOut size={16} /> {busy === 'logout' ? 'Выходим…' : 'Выйти'}
            </button>
          </>
        ) : (
          <>
            <p className="muted">Войдите, чтобы синхронизировать расписание между устройствами.</p>
            <GoogleSignInButton
              busy={busy === 'google'}
              disabled={disabled}
              onClick={() => void googleLogin()}
            />
            <p className="auth-divider">или по ссылке на почту</p>
            <form
              onSubmit={async (event) => {
                event.preventDefault()
                if (!supabase) return
                setError(null)
                setSent(false)
                setBusy('email')
                try {
                  const { error: authError } = await supabase.auth.signInWithOtp({
                    email: email.trim(),
                    options: { emailRedirectTo: redirectTo },
                  })
                  if (authError) throw authError
                  setSent(true)
                } catch (cause) {
                  setError(getAuthErrorMessage(cause))
                } finally {
                  setBusy(null)
                }
              }}
            >
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  disabled={disabled}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <button className="primary wide" disabled={disabled}>
                <Mail size={16} /> {busy === 'email' ? 'Отправляем…' : 'Получить ссылку'}
              </button>
              {sent && (
                <p className="success" role="status">
                  Письмо отправлено. Откройте ссылку в этом же браузере на этом устройстве.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </Panel>
  )
}
