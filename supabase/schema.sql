create table if not exists public.container_reports (
  id uuid primary key default gen_random_uuid(),
  route_id text not null,
  container_id text not null,
  fill_level text not null check (fill_level in ('low', 'medium', 'full')),
  collected_kg numeric not null default 0 check (collected_kg >= 0),
  materials text[] not null default '{}',
  material_weights jsonb not null default '{}',
  photo_evidence jsonb not null default '{}',
  incidents jsonb not null default '{}',
  incident_comments text not null default '',
  created_at timestamptz not null default now()
);

alter table public.container_reports
  drop constraint if exists container_reports_fill_level_check;

do $$
declare
  fill_level_type text;
begin
  select data_type into fill_level_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'container_reports'
    and column_name = 'fill_level';

  if fill_level_type = 'integer' then
    alter table public.container_reports
      alter column fill_level type text
      using case
        when fill_level <= 50 then 'low'
        when fill_level <= 75 then 'medium'
        else 'full'
      end;
  end if;
end $$;

alter table public.container_reports
  add constraint container_reports_fill_level_check
  check (fill_level in ('low', 'medium', 'full'));

alter table public.container_reports enable row level security;

drop policy if exists "Allow anonymous report inserts for testing"
  on public.container_reports;

create policy "Allow anonymous report inserts for testing"
  on public.container_reports
  for insert
  to anon, authenticated
  with check (true);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admin_users enable row level security;

grant select on public.admin_users to authenticated;
grant select on public.container_reports to authenticated;

drop policy if exists "Admins can read their own admin record"
  on public.admin_users;

create policy "Admins can read their own admin record"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can read container reports"
  on public.container_reports;

create policy "Admins can read container reports"
  on public.container_reports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where user_id = auth.uid()
    )
  );