import type { SupabaseClient } from '@supabase/supabase-js'

/** Keep OAuth on the app root, including the GitHub Pages repository path. */
export function getAuthRedirectUrl(origin: string, basePath: string) {
  return new URL(basePath, origin).href
}

export function getAuthErrorMessage(error: unknown): string {
  const details = error && typeof error === 'object' ? error : {}
  const code = 'code' in details ? String(details.code) : ''
  const message = 'message' in details ? String(details.message) : String(error)
  const text = `${code} ${message}`.toLowerCase()
  if (/access_denied|access denied|cancelled|canceled/.test(text))
    return 'Вход отменён. Нажмите «Продолжить с Google», чтобы попробовать ещё раз.'
  if (/provider.*(disabled|not enabled)|unsupported provider/.test(text))
    return 'Вход через Google ещё не включён в Supabase. Включите Google в настройках Authentication → Providers.'
  if (/code.verifier|flow_state|pkce|expired|invalid.*code|otp_expired/.test(text))
    return 'Ссылка для входа устарела или открыта в другом браузере. Начните вход заново и завершите его в том же браузере.'
  if (/fetch|network|offline/.test(text))
    return 'Не удалось подключиться. Проверьте интернет и попробуйте войти снова.'
  if (/rate.limit|too many|over_.*rate/.test(text))
    return 'Слишком много попыток входа. Подождите немного и попробуйте снова.'
  return 'Не удалось войти. Попробуйте ещё раз. Если ошибка повторится, проверьте настройки входа и разрешённые адреса в Supabase.'
}

export async function signInWithGoogle(client: SupabaseClient, redirectTo: string) {
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, queryParams: { prompt: 'select_account' }, skipBrowserRedirect: true },
  })
  if (error) throw error
  if (!data.url) throw new Error('Missing OAuth URL')
  return data.url
}

/** Called only after the SDK has consumed the callback. Never strip the code before exchange. */
function clearFailedAuthCallback() {
  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.slice(1))
  const keys = ['code', 'sb_flow_id', 'error', 'error_code', 'error_description']
  const hasQuery = keys.some((key) => url.searchParams.has(key))
  const hasHash = keys.some((key) => hash.has(key))
  if (!hasQuery && !hasHash) return
  for (const key of keys) {
    url.searchParams.delete(key)
    hash.delete(key)
  }
  if (hasHash) url.hash = hash.toString()
  window.history.replaceState(window.history.state, '', url)
}

export async function restoreAuthSession(client: SupabaseClient) {
  // initialize() is memoized by the SDK: StrictMode must not exchange a code twice.
  const { error: callbackError } = await client.auth.initialize()
  // The SDK ignores a code if its PKCE verifier is absent (e.g. another browser).
  const unconsumedCode = new URL(window.location.href).searchParams.has('code')
  const { data, error: sessionError } = await client.auth.getSession()
  const error =
    callbackError || sessionError || (unconsumedCode ? new Error('PKCE verifier missing') : null)
  if (error) clearFailedAuthCallback()
  return { session: data.session, error: error ? getAuthErrorMessage(error) : null }
}
