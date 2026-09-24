import { test, expect } from '@playwright/test'

const api = 'https://weekplanner-test.supabase.co'
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'planner@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: { full_name: 'Planner Test' },
  created_at: '2026-01-01T00:00:00Z',
}
const jwtPart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
const token = `${jwtPart({ alg: 'HS256', typ: 'JWT' })}.${jwtPart({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`

test.beforeEach(async ({ context }) => {
  // No real Supabase/Google traffic; the actual browser SDK still handles PKCE and storage.
  await context.route(`${api}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/authorize')) {
      await route.fulfill({ contentType: 'text/html', body: '<h1>Mock Google provider</h1>' })
    } else if (path.endsWith('/token')) {
      await route.fulfill({
        json: {
          access_token: token,
          refresh_token: 'test-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
          user,
        },
      })
    } else if (path.endsWith('/user')) {
      await route.fulfill({ json: user })
    } else if (path.endsWith('/logout')) {
      await route.fulfill({ status: 204 })
    } else if (path.endsWith('/otp')) {
      await route.fulfill({ json: {} })
    } else if (path.startsWith('/rest/v1/')) {
      await route.fulfill({ json: [] })
    } else {
      await route.abort()
    }
  })
  await context.routeWebSocket('wss://weekplanner-test.supabase.co/**', (socket) => socket.close())
})

test('Google PKCE login, app-root callback, reload and logout', async ({ page, baseURL }) => {
  const exchanges: { auth_code: string; code_verifier: string }[] = []
  page.on('request', (request) => {
    if (request.url().includes('/auth/v1/token')) exchanges.push(request.postDataJSON())
  })
  await page.goto(baseURL!)
  await page.getByRole('button', { name: 'Войти в аккаунт', exact: true }).click()
  await page.getByRole('button', { name: 'Продолжить с Google' }).click()
  await page.waitForURL(`${api}/auth/v1/authorize?**`)
  const authorize = new URL(page.url())
  expect(authorize.searchParams.get('provider')).toBe('google')
  expect(authorize.searchParams.get('prompt')).toBe('select_account')
  expect(authorize.searchParams.get('code_challenge')).toBeTruthy()
  expect(authorize.searchParams.get('code_challenge_method')?.toLowerCase()).toBe('s256')
  const callback = new URL(authorize.searchParams.get('redirect_to')!)
  expect(`${callback.origin}${callback.pathname}`).toBe(baseURL)
  callback.searchParams.set('code', 'test-single-use-code')
  await page.goto(callback.href)
  await expect(page.getByRole('button', { name: /Мой аккаунт/ })).toBeVisible()
  await expect(page).toHaveURL(baseURL!)
  expect(exchanges).toHaveLength(1)
  expect(exchanges[0]?.auth_code).toBe('test-single-use-code')
  expect(exchanges[0]?.code_verifier).toBeTruthy()
  await page.reload()
  await page.getByRole('button', { name: /Мой аккаунт/ }).click()
  await expect(page.getByRole('dialog')).toContainText('planner@example.com')
  await page.evaluate(
    (id) => localStorage.setItem(`weekplanner.cache.${id}`, '{"tasks":[],"categories":[]}'),
    user.id,
  )
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Войти в аккаунт', exact: true })).toBeVisible()
  expect(
    await page.evaluate((id) => localStorage.getItem(`weekplanner.cache.${id}`), user.id),
  ).toBeNull()
})

test('cancelled Google login clears callback and allows another attempt', async ({
  page,
  baseURL,
}) => {
  await page.goto(`${baseURL}#error=access_denied&error_description=access_denied`)
  await expect(page.getByRole('alert')).toContainText('Вход отменён')
  await expect(page).toHaveURL(baseURL!)
  await page.getByRole('button', { name: 'Войти в аккаунт', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Продолжить с Google' })).toBeEnabled()
})

test('missing PKCE verifier shows recovery without a permanent loading screen', async ({
  page,
  baseURL,
}) => {
  await page.goto(`${baseURL}?code=expired-or-other-browser`)
  await expect(page.getByRole('alert')).toContainText('том же браузере')
  await expect(page).toHaveURL(baseURL!)
  await expect(page.getByRole('button', { name: 'Войти в аккаунт', exact: true })).toBeEnabled()
})

test('email alternative preserves the app path and shows delivery feedback', async ({
  page,
  baseURL,
}) => {
  await page.goto(baseURL!)
  await page.getByRole('button', { name: 'Войти в аккаунт', exact: true }).click()
  await page.getByLabel('Email', { exact: true }).fill('planner@example.com')
  const requestPromise = page.waitForRequest(`${api}/auth/v1/otp?**`)
  await page.getByRole('button', { name: 'Получить ссылку' }).click()
  const request = await requestPromise
  const redirect = new URL(new URL(request.url()).searchParams.get('redirect_to')!)
  expect(`${redirect.origin}${redirect.pathname}`).toBe(baseURL)
  expect(request.postDataJSON().email).toBe('planner@example.com')
  await expect(page.getByRole('status')).toContainText('Письмо отправлено')
})

test('expired code returns a recoverable error after a real SDK exchange attempt', async ({
  page,
  context,
  baseURL,
}) => {
  await context.route(`${api}/auth/v1/token?**`, (route) =>
    route.fulfill({
      status: 400,
      json: { code: 'flow_state_expired', message: 'Flow state expired' },
    }),
  )
  await page.goto(baseURL!)
  await page.getByRole('button', { name: 'Войти в аккаунт', exact: true }).click()
  await page.getByRole('button', { name: 'Продолжить с Google' }).click()
  await page.waitForURL(`${api}/auth/v1/authorize?**`)
  const callback = new URL(new URL(page.url()).searchParams.get('redirect_to')!)
  callback.searchParams.set('code', 'expired-code')
  await page.goto(callback.href)
  await expect(page.getByRole('alert')).toContainText('устарела')
  await expect(page).toHaveURL(baseURL!)
  await expect(page.getByRole('button', { name: 'Войти в аккаунт', exact: true })).toBeEnabled()
})

test('email network failure is visible inside the panel and permits retry', async ({
  page,
  context,
  baseURL,
}) => {
  await context.route(`${api}/auth/v1/otp?**`, (route) => route.abort('internetdisconnected'))
  await page.goto(baseURL!)
  await page.getByRole('button', { name: 'Войти в аккаунт', exact: true }).click()
  await page.getByLabel('Email', { exact: true }).fill('planner@example.com')
  await page.getByRole('button', { name: 'Получить ссылку' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('интернет')
  await expect(page.getByRole('button', { name: 'Получить ссылку' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Продолжить с Google' })).toBeEnabled()
})
