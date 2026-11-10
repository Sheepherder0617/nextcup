-- NextCup database schema for Supabase.
-- Run once: Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
-- Safe to re-run: it only creates what doesn't exist yet and replaces policies/functions.
--
-- Design: each row stores one app record as JSON in `data`, keyed by (user_id, id).
-- Row Level Security makes every row visible only to the signed-in user who owns it.

-- ---------- Tables ----------

create table if not exists public.profiles (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.events (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.notes (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Daily AI request counter, used by /api/ai to cap each person's usage.
create table if not exists public.ai_usage (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day     date not null default current_date,
  count   integer not null default 0,
  primary key (user_id, day)
);

-- ---------- Row Level Security: everyone sees only their own rows ----------

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.events   enable row level security;
alter table public.notes    enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own contacts" on public.contacts;
create policy "own contacts" on public.contacts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own events" on public.events;
create policy "own events" on public.events for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "read own ai usage" on public.ai_usage;
create policy "read own ai usage" on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()));

-- Signed-in users can use the tables (RLS above still limits them to their own rows).
grant select, insert, update, delete on public.profiles, public.contacts, public.events, public.notes to authenticated;
grant select on public.ai_usage to authenticated;
revoke all on public.profiles, public.contacts, public.events, public.notes, public.ai_usage from anon;

-- ---------- AI usage counter ----------
-- Adds 1 to today's count for the signed-in user and returns the new total.
create or replace function public.bump_ai_usage()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.ai_usage (user_id, day, count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into n;
  return n;
end;
$$;

revoke all on function public.bump_ai_usage() from public, anon;
grant execute on function public.bump_ai_usage() to authenticated;

-- ---------- Handy views for analysis (read-only, respect RLS) ----------

create or replace view public.chat_funnel with (security_invoker = true) as
select
  c.user_id,
  count(distinct c.id)                                                                    as contacts_added,
  count(distinct e.data->>'contactId') filter (where e.data->>'kind' = 'coffee')           as chats_scheduled,
  count(distinct e.data->>'contactId') filter (where e.data->>'kind' = 'coffee'
                                                 and e.data->>'status' = 'done')           as chats_completed,
  count(distinct e.data->>'contactId') filter (where e.data->>'kind' <> 'coffee'
                                                 and e.data->>'status' = 'done')           as followed_up
from public.contacts c
left join public.events e on e.user_id = c.user_id
group by c.user_id;
