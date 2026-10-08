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

create table if not exists public.route_configurations (
  id text primary key,
  zone text not null,
  point_ids text[] not null default '{}',
  is_selected boolean not null default false,
  stops_done integer not null default 0,
  last_update text not null default '--:--',
  status text not null default 'scheduled',
  status_label text not null default 'Programada',
  sync_label text not null default 'Sin iniciar',
  updated_at timestamptz not null default now(),
  constraint route_configurations_points_not_empty check (cardinality(point_ids) > 0)
);

alter table public.route_configurations enable row level security;
grant select on public.route_configurations to anon, authenticated;

drop policy if exists "Field users can read route configurations"
  on public.route_configurations;

create policy "Field users can read route configurations"
  on public.route_configurations
  for select
  to anon, authenticated
  using (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'route_configurations'
    ) then
    alter publication supabase_realtime add table public.route_configurations;
  end if;
end $$;

create or replace function public.replace_route_configurations(
  p_routes jsonb,
  p_selected_route_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.admin_users where user_id = auth.uid()
  ) then
    raise exception 'Solo un administrador puede modificar las rutas.';
  end if;

  if jsonb_typeof(p_routes) is distinct from 'array' then
    raise exception 'La configuración de rutas debe ser una lista.';
  end if;

  if jsonb_array_length(p_routes) = 0 then
    raise exception 'Debe existir al menos una ruta.';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(p_routes) route
    where route->>'id' = p_selected_route_id
  ) then
    raise exception 'Debe existir una ruta seleccionada dentro de la configuración.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_routes) route
    where coalesce(route->>'id', '') = ''
      or coalesce(route->>'zone', '') = ''
      or case
        when jsonb_typeof(route->'point_ids') = 'array' then
          jsonb_array_length(route->'point_ids') = 0
          or exists (
            select 1
            from jsonb_array_elements_text(route->'point_ids') point_id
            where point_id not in ('CONT-01', 'CONT-02', 'CONT-03', 'CONT-04', 'CONT-05', 'CONT-06', 'CONT-07', 'CONT-08')
          )
        else true
      end
  ) then
    raise exception 'Cada ruta necesita nombre y al menos un punto.';
  end if;

  delete from public.route_configurations
  where id not in (
    select route->>'id' from jsonb_array_elements(p_routes) route
  );

  insert into public.route_configurations (
    id, zone, point_ids, is_selected, stops_done, last_update,
    status, status_label, sync_label, updated_at
  )
  select
    route->>'id',
    route->>'zone',
    array(select jsonb_array_elements_text(route->'point_ids')),
    route->>'id' = p_selected_route_id,
    coalesce((route->>'stops_done')::integer, 0),
    coalesce(route->>'last_update', '--:--'),
    coalesce(route->>'status', 'scheduled'),
    coalesce(route->>'status_label', 'Programada'),
    coalesce(route->>'sync_label', 'Sin iniciar'),
    now()
  from jsonb_array_elements(p_routes) route
  on conflict (id) do update set
    zone = excluded.zone,
    point_ids = excluded.point_ids,
    is_selected = excluded.is_selected,
    stops_done = excluded.stops_done,
    last_update = excluded.last_update,
    status = excluded.status,
    status_label = excluded.status_label,
    sync_label = excluded.sync_label,
    updated_at = now();
end;
$$;

revoke all on function public.replace_route_configurations(jsonb, text) from public, anon;
grant execute on function public.replace_route_configurations(jsonb, text) to authenticated;

create or replace function public.start_route_configuration(p_route_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.route_configurations
  set status = 'active',
      status_label = 'En ruta',
      stops_done = 0,
      last_update = to_char(now() at time zone 'America/Mazatlan', 'HH24:MI'),
      updated_at = now()
  where id = p_route_id
    and is_selected;

  if not found then
    raise exception 'La ruta no existe o no está asignada al campo.';
  end if;
end;
$$;

revoke all on function public.start_route_configuration(text) from public;
grant execute on function public.start_route_configuration(text) to anon, authenticated;