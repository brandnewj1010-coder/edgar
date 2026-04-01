-- 생성된 리포트 전체 저장 (마크다운 + 퀴즈 + 메타)
-- Supabase SQL Editor에서 search_history 이후에 실행하세요.

create table if not exists public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('dart', 'edgar')),
  query text not null,
  report_markdown text not null,
  quiz jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analysis_reports_created_at_idx
  on public.analysis_reports (created_at desc);

alter table public.analysis_reports enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on table public.analysis_reports to anon, authenticated;

create policy "analysis_reports_select_anon"
  on public.analysis_reports for select
  to anon, authenticated
  using (true);

create policy "analysis_reports_insert_anon"
  on public.analysis_reports for insert
  to anon, authenticated
  with check (true);
