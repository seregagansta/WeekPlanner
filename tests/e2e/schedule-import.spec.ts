import { test, expect } from '@playwright/test'
const schedule =
  'Неделя: 2026-11-02\n\nПонедельник\n10:00–13:00 | MAX450 из чата | 3D / CGI\n15:00–15:40 | Практика английского | Английский\n\nЧетверг\n15:00–16:00 | Созвон из чата | Заказы | Описание: Обсудить рендер'
test('paste, preview, import, reload, and prevent duplicate import', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Вставить расписание', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'Вставить расписание' })
  await panel.getByLabel('Готовое расписание').fill(schedule)
  await panel.getByRole('button', { name: 'Проверить расписание' }).click()
  await expect(panel.locator('.import-row')).toHaveCount(3)
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('weekplanner.demo.v1')!).tasks.length,
    ),
  ).toBe(13)
  await panel.getByRole('button', { name: 'Добавить в план · 3' }).click()
  await expect(panel.getByRole('status')).toContainText('Добавлено задач: 3')
  await panel.getByRole('button', { name: 'Открыть неделю' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('2 ноября')
  await expect(page.locator('.task-card')).toHaveCount(3)
  await page.reload()
  await page.getByRole('button', { name: 'Вставить расписание', exact: true }).click()
  await panel.getByLabel('Готовое расписание').fill(schedule)
  await panel.getByRole('button', { name: 'Проверить расписание' }).click()
  await expect(panel.getByRole('status')).toContainText('Все задачи уже есть')
  await expect(panel.getByRole('button', { name: 'Добавить в план · 0' })).toBeDisabled()
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('weekplanner.demo.v1')!).tasks.length,
    ),
  ).toBe(16)
  expect(errors).toEqual([])
})
test('blocks invalid text and requires acknowledgement for overlaps', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Вставить расписание', exact: true }).click()
  const panel = page.getByRole('dialog')
  const input = panel.getByLabel('Готовое расписание')
  await input.fill('Понедельник\n10:00–11:00 | Хорошая задача\nи ещё займись английским')
  await panel.getByRole('button', { name: 'Проверить расписание' }).click()
  await expect(panel.getByRole('alert')).toContainText('Строка 3')
  await expect(panel.getByRole('button', { name: /Добавить в план/ })).toBeDisabled()
  await input.fill('Неделя: 2026-11-02\nПонедельник\n10:00–11:00 | Первая\n10:30–12:00 | Вторая')
  await panel.getByRole('button', { name: 'Проверить расписание' }).click()
  await expect(panel.getByRole('button', { name: 'Добавить в план · 2' })).toBeDisabled()
  await panel.getByRole('checkbox').check()
  await panel.getByRole('button', { name: 'Добавить в план · 2' }).click()
  await expect(panel.getByRole('status')).toContainText('Добавлено задач: 2')
})
test('opens text import from assistant and fits narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть AI Assistant' }).click()
  await page.getByLabel('Будущая команда помощнику').fill(schedule)
  await page.getByRole('button', { name: /Вставить готовое расписание/ }).click()
  await expect(page.getByLabel('Готовое расписание')).toHaveValue(schedule)
  expect(
    await page
      .getByRole('dialog')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true)
})
