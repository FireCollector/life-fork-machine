-- TASK-045: immutable creator versions and role-gated publication workflow.
create table if not exists public.creator_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'publisher', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.current_creator_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.creator_roles where user_id = auth.uid()
$$;

create or replace function public.is_creator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_creator_role() is not null
$$;

create or replace function public.is_publisher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_creator_role() in ('publisher', 'admin')
$$;

create table if not exists public.scenario_versions (
  id uuid primary key default gen_random_uuid(),
  scenario_key text not null check (scenario_key ~ '^[a-z0-9-]{3,64}$'),
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'retired')),
  title text not null check (char_length(title) between 1 and 280),
  source_snapshot jsonb not null,
  original_pack jsonb not null,
  editor_pack jsonb not null,
  validation jsonb not null default '{}'::jsonb,
  change_reason text not null check (char_length(change_reason) between 4 and 240),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  retired_at timestamptz,
  unique (scenario_key, version)
);

create table if not exists public.scenario_release_audit (
  id uuid primary key default gen_random_uuid(),
  scenario_version_id uuid not null references public.scenario_versions(id) on delete cascade,
  action text not null check (action in ('created', 'submitted', 'returned', 'published', 'retired')),
  actor_id uuid not null references auth.users(id),
  reason text not null,
  created_at timestamptz not null default now()
);

create or replace function public.guard_scenario_version_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id <> old.id or new.scenario_key <> old.scenario_key or new.version <> old.version or
     new.created_by <> old.created_by or new.created_at <> old.created_at then
    raise exception 'scenario identity and authorship are immutable';
  end if;
  if new.original_pack <> old.original_pack or new.source_snapshot <> old.source_snapshot then
    raise exception 'the original draft and source snapshot are immutable';
  end if;
  if old.status = 'retired' and new.status <> old.status then
    raise exception 'retired versions are immutable; create a new draft to restore content';
  end if;
  if old.status = 'published' and new.status not in ('published', 'retired') then
    raise exception 'a published version may only be retired';
  end if;
  if old.status in ('published', 'retired') and (
    new.editor_pack <> old.editor_pack or new.original_pack <> old.original_pack or new.source_snapshot <> old.source_snapshot or
    new.title <> old.title or new.scenario_key <> old.scenario_key or new.version <> old.version
  ) then
    raise exception 'published and retired content cannot be edited';
  end if;
  if new.status = 'published' and old.status <> 'in_review' then
    raise exception 'only an in-review version may be published';
  end if;
  if new.status = 'retired' and old.status <> 'published' then
    raise exception 'only a published version may be retired';
  end if;
  new.updated_at = now();
  if new.status = 'published' and old.status <> 'published' then new.published_at = now(); end if;
  if new.status = 'retired' and old.status <> 'retired' then new.retired_at = now(); end if;
  return new;
end;
$$;

drop trigger if exists scenario_version_guard on public.scenario_versions;
create trigger scenario_version_guard
before update on public.scenario_versions
for each row execute function public.guard_scenario_version_change();

create or replace function public.audit_scenario_version_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare action_name text;
begin
  if tg_op = 'INSERT' then action_name := 'created';
  elsif new.status = 'in_review' and old.status = 'draft' then action_name := 'submitted';
  elsif new.status = 'draft' and old.status = 'in_review' then action_name := 'returned';
  elsif new.status = 'published' then action_name := 'published';
  elsif new.status = 'retired' then action_name := 'retired';
  else return new;
  end if;
  insert into public.scenario_release_audit (scenario_version_id, action, actor_id, reason)
  values (new.id, action_name, auth.uid(), new.change_reason);
  return new;
end;
$$;

drop trigger if exists scenario_version_audit on public.scenario_versions;
create trigger scenario_version_audit
after insert or update on public.scenario_versions
for each row execute function public.audit_scenario_version_change();

alter table public.creator_roles enable row level security;
alter table public.scenario_versions enable row level security;
alter table public.scenario_release_audit enable row level security;

drop policy if exists "creator reads own role" on public.creator_roles;
create policy "creator reads own role" on public.creator_roles
for select to authenticated using (user_id = auth.uid());

drop policy if exists "creators read scenario versions" on public.scenario_versions;
create policy "creators read scenario versions" on public.scenario_versions
for select to authenticated using (public.is_creator());
drop policy if exists "creators create drafts" on public.scenario_versions;
create policy "creators create drafts" on public.scenario_versions
for insert to authenticated with check (public.is_creator() and created_by = auth.uid() and status = 'draft');
drop policy if exists "creators edit working versions" on public.scenario_versions;
create policy "creators edit working versions" on public.scenario_versions
for update to authenticated using (public.is_creator() and status in ('draft', 'in_review'))
with check (public.is_creator() and status in ('draft', 'in_review'));
drop policy if exists "publishers change release state" on public.scenario_versions;
create policy "publishers change release state" on public.scenario_versions
for update to authenticated using (public.is_publisher() and status in ('in_review', 'published'))
with check (public.is_publisher());

drop policy if exists "creators read release audit" on public.scenario_release_audit;
create policy "creators read release audit" on public.scenario_release_audit
for select to authenticated using (public.is_creator());

-- Bootstrap one owner only after they have used email login once:
-- insert into public.creator_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'your-email@example.com'
-- on conflict (user_id) do update set role = excluded.role;
