create table if not exists public.container_reports (
  id uuid primary key default gen_random_uuid(),
  route_id text not null,
  container_id text not null,
  fill_level integer not null check (fill_level between 0 and 100),
  collected_kg numeric not null default 0 check (collected_kg >= 0),
  materials text[] not null default '{}',
  material_weights jsonb not null default '{}',
  photo_evidence jsonb not null default '{}',
  incidents jsonb not null default '{}',
  incident_comments text not null default '',
  created_at timestamptz not null default now()
);

alter table public.container_reports enable row level security;

drop policy if exists "Allow anonymous report inserts for testing"
  on public.container_reports;

create policy "Allow anonymous report inserts for testing"
  on public.container_reports
  for insert
  to anon
  with check (true);