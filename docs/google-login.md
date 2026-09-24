# Вход через Google: локально и на GitHub Pages

**Локально Google-вход работает.** Приложение открывается на вашем компьютере, а вход и данные обслуживает облачный Supabase. Отдельный сервер для приложения не нужен. Для входа требуется интернет.

## 1. Подключите Supabase

Если проект ещё не создан, создайте его в [Supabase](https://supabase.com/dashboard). В SQL Editor один раз выполните `supabase/schema.sql` для подготовки базы. Для уже настроенной базы повторно выполнять схему не нужно.

В папке `C:\Users\Sergey\Documents\WeekPlanner` создайте `.env.local` на основе `.env.example`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

Project URL и публичный anon/publishable key находятся в настройках проекта Supabase. Файл `.env.local` исключён из Git. Google Client Secret и Supabase secret/service_role key в приложение не добавляйте.

## 2. Создайте Google OAuth client

1. Откройте [Google Cloud Console](https://console.cloud.google.com/) и выберите или создайте проект.
2. Откройте **Google Auth Platform**. Настройте **Branding**: название WeekPlanner и email поддержки/контакта. В **Audience** выберите External для обычного личного Google-аккаунта. Если приложение в режиме Testing, добавьте свой Google email в Test users.
3. В **Data Access** настройте базовые scopes `openid`, `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`. Доступ к календарю, почте или Диску приложению не требуется.
4. В **Clients → Create client** выберите тип **Web application**.
5. В **Authorized JavaScript origins** добавьте адреса без пути:
   - `http://127.0.0.1:5173`
   - `http://localhost:5173`
   - `https://seregagansta.github.io`
6. В Supabase откройте **Authentication → Sign In / Providers → Google** (в некоторых версиях интерфейса — **Providers → Google**). Скопируйте показанный там Callback URL. Добавьте его в Google в **Authorized redirect URIs**. Для обычного облачного проекта он выглядит так:

   ```text
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```

7. Сохраните Google client. Скопируйте Client ID и Client Secret в настройки провайдера Google **в Supabase**, включите провайдера и сохраните.

Callback в Google ведёт в Supabase. Адрес приложения задаётся отдельно на следующем шаге. `localhost:54321` здесь не нужен: мы используем облачный Supabase, а локально запускаем только интерфейс.

## 3. Разрешите возврат в приложение

В Supabase **Authentication → URL Configuration** задайте:

**Site URL:**

```text
https://seregagansta.github.io/WeekPlanner/
```

В **Redirect URLs** добавьте каждый адрес отдельно:

```text
http://127.0.0.1:5173/
http://localhost:5173/
https://seregagansta.github.io/WeekPlanner/
```

Если проверяете production preview, дополнительно разрешите `http://127.0.0.1:4173/`. Приложение автоматически выбирает адрес, с которого вы начали вход, и учитывает `/WeekPlanner/`.

## 4. Проверьте локально без командной строки

1. После создания `.env.local` перезапустите dev-сервер: Vite обычно перезапускается при изменении env-файла; если приложение осталось в деморежиме, перезапустите компьютер и снова откройте ярлык **WeekPlanner**. Простое повторное нажатие ярлыка переиспользует уже запущенный сервер.
2. Нажмите **Войти для синхронизации → Продолжить с Google**.
3. Выберите свой Google-аккаунт. Завершайте вход в той же вкладке/браузере, в котором его начали. Приложение использует PKCE; `localhost` и `127.0.0.1` для браузера — разные адреса.
4. После возврата откройте панель аккаунта: там должен отображаться ваш email. Обновите страницу — вход должен сохраниться.
5. Создайте задачу. Войдите в тот же аккаунт на другом устройстве и проверьте синхронизацию. Демозадачи не импортируются автоматически.

Чтобы получить Google-вход на GitHub Pages, отправьте изменения через GitHub Desktop: **Commit → Push origin**. В Repository variables для GitHub Actions должны быть те же `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`, затем дождитесь новой публикации. **Google Client Secret на GitHub не добавляется.**

## Если вход не проходит

- Кнопка недоступна, показан деморежим: Supabase URL и публичный ключ ещё не настроены, либо требуется перезапуск приложения.
- `redirect_uri_mismatch` на странице Google: проверьте именно Supabase Callback URL в Google client, включая `/auth/v1/callback`.
- Google сообщает, что доступ запрещён: проверьте Audience/Test users и выбранный аккаунт.
- После входа открывается другой адрес: проверьте полный адрес приложения в Supabase Redirect URLs, порт, путь и завершающий `/`.
- Провайдер выключен: включите Google и сохраните Client ID/Secret в Supabase.
- Ссылка устарела или открыта в другом браузере: начните вход заново с нужного адреса. Коды входа одноразовые.
- Вход прошёл, но задачи не загружаются: выполните начальную SQL-схему, проверьте RLS и Realtime. Сам OAuth не создаёт таблицы.

## Что проверено автоматически

Проверяются переход к Google через Supabase с PKCE, возврат и восстановление сессии, отмена, истёкший код, выход и резервный вход по email. Браузерные тесты подменяют ответы Supabase и не обращаются к реальным Google-аккаунтам. Реальный вход и синхронизацию нужно проверить после настройки вашего проекта.

Официальные инструкции: [Supabase: Google login](https://supabase.com/docs/guides/auth/social-login/auth-google), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).
