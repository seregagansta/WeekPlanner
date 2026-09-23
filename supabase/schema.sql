-- WeekPlanner / run once in Supabase SQL Editor (new project).
begin;
create extension if not exists pgcrypto;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name), unique (id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null default '',
  date date not null,
  start_time time(0) not null,
  end_time time(0) not null,
  category uuid not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  completed boolean not null default false,
  notes text not null default '',
  recurrence jsonb,
  series_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category, user_id) references public.categories(id, user_id),
  check (end_time > start_time),
  check (start_time < time '24:00' and end_time < time '24:00'),
  check (extract(second from start_time) = 0 and extract(second from end_time) = 0),
  check (recurrence is null or jsonb_typeof(recurrence) = 'object')
);
create index tasks_user_date_idx on public.tasks(user_id, date, start_time);
create index tasks_user_series_idx on public.tasks(user_id, series_id) where series_id is not null;
create index categories_user_idx on public.categories(user_id);

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); new.created_at = old.created_at; new.user_id = old.user_id; return new; end;
$$;
create trigger tasks_updated_at before update on public.tasks for each row execute function public.touch_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function public.touch_updated_at();

alter table public.tasks enable row level security;
alter table public.categories enable row level security;
revoke all on public.tasks, public.categories from anon;
grant select, insert, update, delete on public.tasks, public.categories to authenticated;
create policy tasks_select on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy tasks_insert on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tasks_update on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tasks_delete on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);
create policy categories_select on public.categories for select to authenticated using ((select auth.uid()) = user_id);
create policy categories_insert on public.categories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy categories_update on public.categories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy categories_delete on public.categories for delete to authenticated using ((select auth.uid()) = user_id);

create function public.seed_planner_categories(owner_id uuid) returns void language sql security definer set search_path = '' as $$
  insert into public.categories(user_id, name, color, position) values
    (owner_id, 'Работа', '#5979d7', 0), (owner_id, 'Заказы', '#d29438', 1),
    (owner_id, '3D / CGI', '#8f6bc4', 2), (owner_id, 'Поиск работы', '#cd7285', 3),
    (owner_id, 'Английский', '#379b8f', 4), (owner_id, 'Обучение', '#498cbd', 5),
    (owner_id, 'Личное', '#78a04c', 6), (owner_id, 'Другое', '#89909c', 7)
  on conflict (user_id, name) do nothing;
$$;
revoke all on function public.seed_planner_categories(uuid) from public, anon, authenticated;
create function public.handle_planner_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.seed_planner_categories(new.id); return new; end;
$$;
revoke all on function public.handle_planner_user() from public, anon, authenticated;
create trigger on_planner_user_created after insert on auth.users for each row execute function public.handle_planner_user();
-- Also initialize users who signed up before running this migration.
select public.seed_planner_categories(id) from auth.users;

alter publication supabase_realtime add table public.tasks, public.categories;
commit;
