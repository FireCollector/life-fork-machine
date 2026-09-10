-- TASK-044: local-first cloud sync. Every user-owned row is protected by RLS.
create table if not exists public.decision_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_session_id text not null,
  payload jsonb not null,
  scenario_version text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(owner_id, client_session_id)
);
alter table public.decision_sessions enable row level security;
drop policy if exists "owner manages own decision sessions" on public.decision_sessions;
create policy "owner manages own decision sessions"
  on public.decision_sessions
  for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
-- Free text stays inside payload and is only uploaded after an authenticated user explicitly requests sync.
