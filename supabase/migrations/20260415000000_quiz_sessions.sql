-- 스터디 퀴즈 세션 아카이브
-- Supabase SQL Editor에서 analysis_reports 이후에 실행하세요.

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('dart', 'edgar')),
  query text not null,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  score integer,
  created_at timestamptz not null default now()
);

create index if not exists quiz_sessions_created_at_idx
  on public.quiz_sessions (created_at desc);

alter table public.quiz_sessions enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.quiz_sessions to anon, authenticated;

create policy "quiz_sessions_select_anon"
  on public.quiz_sessions for select
  to anon, authenticated
  using (true);

create policy "quiz_sessions_insert_anon"
  on public.quiz_sessions for insert
  to anon, authenticated
  with check (true);

create policy "quiz_sessions_update_anon"
  on public.quiz_sessions for update
  to anon, authenticated
  using (true);

create policy "quiz_sessions_delete_anon"
  on public.quiz_sessions for delete
  to anon, authenticated
  using (true);
