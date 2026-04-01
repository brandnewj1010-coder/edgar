-- InsightAnalyzer: Vercel 배포 후 Supabase SQL Editor에서 실행하거나
-- supabase db push 로 적용하세요.

create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('dart', 'edgar')),
  query text not null,
  created_at timestamptz not null default now()
);

create index if not exists search_history_created_at_idx
  on public.search_history (created_at desc);

alter table public.search_history enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on table public.search_history to anon, authenticated;

-- anon 키(프론트)로 읽기·쓰기 — Phase 3에서 Auth·user_id 기반 정책으로 교체 권장
create policy "search_history_select_anon"
  on public.search_history for select
  to anon, authenticated
  using (true);

create policy "search_history_insert_anon"
  on public.search_history for insert
  to anon, authenticated
  with check (true);
