# Запуск WeekPlanner на GitHub Pages

GitHub-репозиторий хранит исходники. GitHub Pages публикует собранный интерфейс как сайт; отдельный VPS/Node.js-сервер не нужен. Supabase независимо хранит аккаунты, задачи и обеспечивает синхронизацию. Google — дополнительный способ входа, сейчас реализован вход по email.

## Один раз, без командной строки

1. В GitHub Desktop добавьте существующий репозиторий `C:\Users\Sergey\Documents\WeekPlanner`. Он уже связан с `seregagansta/WeekPlanner`.
2. Проверьте изменения, выполните **Commit to main**, затем **Push origin**. Среди файлов должна быть `.github/workflows/deploy-pages.yml`.
3. Откройте [Settings → Pages](https://github.com/seregagansta/WeekPlanner/settings/pages). В **Build and deployment → Source** выберите **GitHub Actions**.
4. На вкладке **Actions** выберите **Publish WeekPlanner to GitHub Pages**, затем **Run workflow → main → Run workflow**. Если публикация уже автоматически запустилась после push, достаточно дождаться её завершения.
5. После успешной сборки и публикации адрес появится в Settings → Pages и в выполненном workflow. Ожидаемый адрес для этого репозитория: `https://seregagansta.github.io/WeekPlanner/`.

Этот адрес пока не подтверждён как опубликованный. Подготовка файлов локально сама по себе не отправляет изменения на GitHub.

На GitHub Free для Pages нужен публичный репозиторий. Для приватного репозитория доступность Pages зависит от тарифа. Не меняйте видимость репозитория, если не хотите раскрывать исходники. Демо-данные хранятся в браузере; личные задачи пользователя не коммитятся в репозиторий.

Без переменных Supabase сайт работает как демоверсия. Можно тестировать задачи, вставку расписания, редактор и переносы. Чтобы получить общие задачи на Mac и Windows, подключите облако следующим шагом.

## Подключить синхронизацию

1. Выполните `supabase/schema.sql` в своём Supabase-проекте, если ещё не выполняли.
2. В GitHub откройте **Settings → Secrets and variables → Actions → Variables** и создайте две **Repository variables**: `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` (публичный anon/publishable key). В браузерной сборке эти значения видимы — `service_role` и любые секретные ключи сюда не добавляют.
3. В Supabase **Authentication → URL Configuration** задайте Site URL и добавьте в Redirect URLs полный адрес `https://seregagansta.github.io/WeekPlanner/`. Локальные разрешённые адреса можно сохранить.
4. Повторно запустите workflow. Войдите с одним email на обоих устройствах. Политики RLS из схемы отделяют ваши задачи от задач других пользователей.

Настоящий вход через Google пока не реализован: для него отдельно подключаются Google OAuth provider в Supabase и кнопка входа. На размещение сайта в GitHub Pages это не влияет.

## Что настроено в коде

- Workflow устанавливает зависимости, запускает lint и unit-тесты, собирает `dist` и публикует его через официальные GitHub Actions.
- Путь `/<имя репозитория>/` задаётся при сборке через `VITE_BASE_PATH`.
- PWA, иконки, ссылка на главную и возврат после входа учитывают этот путь.
- Локальный запуск через ярлык продолжает использовать `http://127.0.0.1:5173/`.
- При смене имени репозитория обновите разрешённый адрес в Supabase. Для собственного домена в workflow поменяйте `VITE_BASE_PATH` на `/`.

Документация: [Vite: GitHub Pages](https://vite.dev/guide/static-deploy#github-pages), [создание GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
