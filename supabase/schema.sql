-- taskboard-mobile: Supabase スキーマ
-- Supabase ダッシュボード > SQL Editor に貼り付けて実行してください。

create extension if not exists "pgcrypto";

-- ステータス（カンバンの列）
create table if not exists public.statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#6B7280',
  position integer not null default 0
);

-- タグ（カタログ。タスク側は名前・色をコピーして持つ）
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#8B93B0'
);

-- タスク
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status_id uuid not null references public.statuses (id) on delete cascade,
  title text not null default '',
  memo text not null default '',
  position integer not null default 0,
  subtasks jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_status_id_idx on public.tasks (status_id);
create index if not exists statuses_user_id_idx on public.statuses (user_id);
create index if not exists tags_user_id_idx on public.tags (user_id);

-- updated_at 自動更新
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

-- RLS: 自分の行のみ読み書きできる
alter table public.statuses enable row level security;
alter table public.tags enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "statuses_owner" on public.statuses;
create policy "statuses_owner" on public.statuses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "tags_owner" on public.tags;
create policy "tags_owner" on public.tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "tasks_owner" on public.tasks;
create policy "tasks_owner" on public.tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- テーブル権限: RLSがあってもこれが無いと "permission denied" になる
grant usage on schema public to anon, authenticated;
grant all on public.statuses, public.tags, public.tasks to authenticated;
grant select on public.statuses, public.tags, public.tasks to anon;
