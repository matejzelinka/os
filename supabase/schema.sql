create table if not exists public.os_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.os_state enable row level security;
grant select,insert,update,delete on public.os_state to authenticated;

drop policy if exists "os_state_select_own" on public.os_state;
create policy "os_state_select_own" on public.os_state for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "os_state_insert_own" on public.os_state;
create policy "os_state_insert_own" on public.os_state for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "os_state_update_own" on public.os_state;
create policy "os_state_update_own" on public.os_state for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.os_files (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  name text not null,
  type text,
  size bigint not null default 0,
  data text not null,
  created_at timestamptz not null default now()
);
create index if not exists os_files_user_task_idx on public.os_files(user_id,task_id);
alter table public.os_files enable row level security;
grant select,insert,update,delete on public.os_files to authenticated;

drop policy if exists "os_files_select_own" on public.os_files;
create policy "os_files_select_own" on public.os_files for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "os_files_insert_own" on public.os_files;
create policy "os_files_insert_own" on public.os_files for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "os_files_update_own" on public.os_files;
create policy "os_files_update_own" on public.os_files for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "os_files_delete_own" on public.os_files;
create policy "os_files_delete_own" on public.os_files for delete to authenticated using ((select auth.uid())=user_id);
