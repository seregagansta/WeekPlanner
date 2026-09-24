import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getAuthErrorMessage,
  getAuthRedirectUrl,
  restoreAuthSession,
  signInWithGoogle,
} from './authService'

afterEach(() => vi.unstubAllGlobals())

function callbackWindow(href: string) {
  const location = { href }
  const replaceState = vi.fn((_state: unknown, _title: string, url: URL) => {
    location.href = url.href
  })
  vi.stubGlobal('window', { location, history: { state: null, replaceState } })
  return { location, replaceState }
}

function authClient(
  options: {
    callbackError?: unknown
    session?: unknown
    initialize?: () => Promise<{ error: null }>
  } = {},
) {
  return {
    auth: {
      initialize:
        options.initialize ?? vi.fn().mockResolvedValue({ error: options.callbackError ?? null }),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: options.session ?? null }, error: null }),
    },
  } as unknown as SupabaseClient
}

describe('OAuth callbacks', () => {
  it('returns to the local or Pages app root without copying query parameters', () => {
    expect(getAuthRedirectUrl('http://127.0.0.1:5173', '/')).toBe('http://127.0.0.1:5173/')
    expect(getAuthRedirectUrl('https://seregagansta.github.io', '/WeekPlanner/')).toBe(
      'https://seregagansta.github.io/WeekPlanner/',
    )
  })

  it('requests Google login without extra Google account permissions', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: 'https://example.supabase.co/auth/v1/authorize' },
      error: null,
    })
    const client = { auth: { signInWithOAuth } } as unknown as SupabaseClient
    expect(await signInWithGoogle(client, 'http://127.0.0.1:5173/')).toContain('/authorize')
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://127.0.0.1:5173/',
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    })
  })

  it('keeps an existing session after a cancelled login and cleans only callback fields', async () => {
    const { location } = callbackWindow(
      'https://example.com/WeekPlanner/?view=week#error=access_denied&error_description=cancelled',
    )
    const session = { user: { id: 'existing-user' } }
    const result = await restoreAuthSession(
      authClient({ session, callbackError: new Error('access_denied') }),
    )
    expect(result.session).toBe(session)
    expect(result.error).toContain('Вход отменён')
    expect(location.href).toBe('https://example.com/WeekPlanner/?view=week')
  })

  it('reports a missing verifier consistently when React mounts twice', async () => {
    const { location } = callbackWindow('http://127.0.0.1:5173/?code=one-use&sb_flow_id=test')
    const client = authClient()
    const results = await Promise.all([restoreAuthSession(client), restoreAuthSession(client)])
    expect(results.every((result) => result.error?.includes('том же браузере'))).toBe(true)
    expect(location.href).toBe('http://127.0.0.1:5173/')
  })

  it('lets the SDK consume the code before reading the restored session', async () => {
    const { location } = callbackWindow('http://127.0.0.1:5173/?code=one-use')
    const session = { user: { id: 'new-user' } }
    const result = await restoreAuthSession(
      authClient({
        session,
        initialize: async () => {
          expect(location.href).toContain('code=one-use')
          location.href = 'http://127.0.0.1:5173/'
          return { error: null }
        },
      }),
    )
    expect(result).toEqual({ session, error: null })
  })

  it('preserves ordinary links without a callback', async () => {
    const { replaceState } = callbackWindow('http://127.0.0.1:5173/?view=week#today')
    expect(await restoreAuthSession(authClient())).toEqual({ session: null, error: null })
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('shows actionable errors without echoing arbitrary provider text', () => {
    expect(getAuthErrorMessage(new Error('Failed to fetch'))).toContain('интернет')
    expect(
      getAuthErrorMessage(new Error('Unsupported provider: provider is not enabled')),
    ).toContain('Providers')
    expect(getAuthErrorMessage({ code: 'flow_state_expired' })).toContain('устарела')
    expect(getAuthErrorMessage(new Error('sensitive provider details'))).not.toContain('sensitive')
  })
})
