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

-- When the report reached the server; created_at is the capture time on the device, which
-- can be much earlier when the field app was offline.
alter table public.container_reports
  add column if not exists received_at timestamptz not null default now();

-- The 4 evidence photos keyed like photo_evidence (which keeps the capture times): a path in the
-- field-photos Storage bucket, or a JPEG data URL in older rows. Kept apart from the admin list.
alter table public.container_reports
  add column if not exists photos jsonb not null default '{}';

create index if not exists container_reports_received_at_idx
  on public.container_reports (received_at);

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
-- Only signed-in field accounts write reports; the anon key alone can't (it ships inside the app).
revoke insert on public.container_reports from anon;
grant insert on public.container_reports to authenticated;

drop policy if exists "Allow anonymous report inserts for testing"
  on public.container_reports;

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

-- Accounts that use the field app (APK or web). The login reads this table and admin_users to
-- open the right panel; an account in neither can't sign in to any panel.
create table if not exists public.field_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.field_users enable row level security;

grant select on public.field_users to authenticated;

drop policy if exists "Field users can read their own field record"
  on public.field_users;

create policy "Field users can read their own field record"
  on public.field_users
  for select
  to authenticated
  using (user_id = auth.uid());

-- Definer so policies and RPCs can check it without reading field_users as the caller.
create or replace function public.is_field_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.field_users where user_id = auth.uid());
$$;

revoke all on function public.is_field_user() from public, anon;
grant execute on function public.is_field_user() to authenticated;

drop policy if exists "Field users can insert reports"
  on public.container_reports;

create policy "Field users can insert reports"
  on public.container_reports
  for insert
  to authenticated
  with check (public.is_field_user());

create table if not exists public.route_configurations (
  id text primary key,
  zone text not null,
  point_ids text[] not null default '{}',
  stops_done integer not null default 0,
  last_update text not null default '--:--',
  status text not null default 'scheduled',
  status_label text not null default 'Programada',
  sync_label text not null default 'Sin iniciar',
  updated_at timestamptz not null default now(),
  constraint route_configurations_points_not_empty check (cardinality(point_ids) > 0)
);

create table if not exists public.route_schedules (
  scheduled_for date primary key,
  route_id text not null references public.route_configurations(id) on delete cascade,
  status text not null default 'scheduled',
  stops_done integer not null default 0,
  completed_point_ids text[] not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.route_schedules
  add column if not exists status text not null default 'scheduled',
  add column if not exists stops_done integer not null default 0,
  add column if not exists completed_point_ids text[] not null default '{}',
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  -- Crew that ran the route (fleet_resources ids; foreign keys are added with that table).
  add column if not exists unit_id text,
  add column if not exists driver_id text,
  add column if not exists assistant_id text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'route_configurations'
      and column_name = 'scheduled_for'
  ) then
    insert into public.route_schedules (scheduled_for, route_id)
    select scheduled_for, id
    from public.route_configurations
    where scheduled_for is not null
    on conflict (scheduled_for) do nothing;

    drop index if exists public.route_configurations_one_route_per_date;
    alter table public.route_configurations drop column scheduled_for;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'route_configurations'
      and column_name = 'is_selected'
  ) then
    if not exists (select 1 from public.route_schedules) then
      insert into public.route_schedules (scheduled_for, route_id)
      select (now() at time zone 'America/Mazatlan')::date, id
      from public.route_configurations
      where is_selected
      order by updated_at desc
      limit 1
      on conflict (scheduled_for) do nothing;
    end if;
    alter table public.route_configurations drop column is_selected;
  end if;
end $$;

alter table public.route_schedules enable row level security;
revoke select on public.route_schedules from anon;
grant select on public.route_schedules to authenticated;

drop policy if exists "Field users can read route schedules"
  on public.route_schedules;

create policy "Field users can read route schedules"
  on public.route_schedules
  for select
  to authenticated
  using (
    public.is_field_user()
    or exists (select 1 from public.admin_users where user_id = auth.uid())
  );

alter table public.route_configurations enable row level security;
revoke select on public.route_configurations from anon;
grant select on public.route_configurations to authenticated;

drop policy if exists "Field users can read route configurations"
  on public.route_configurations;

create policy "Field users can read route configurations"
  on public.route_configurations
  for select
  to authenticated
  using (
    public.is_field_user()
    or exists (select 1 from public.admin_users where user_id = auth.uid())
  );

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

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'route_schedules'
    ) then
    alter publication supabase_realtime add table public.route_schedules;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'container_reports'
    ) then
    alter publication supabase_realtime add table public.container_reports;
  end if;
end $$;

drop function if exists public.replace_route_configurations(jsonb, text);

create or replace function public.replace_route_configurations(p_routes jsonb)
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
    id, zone, point_ids, stops_done, last_update,
    status, status_label, sync_label, updated_at
  )
  select
    route->>'id',
    route->>'zone',
    array(select jsonb_array_elements_text(route->'point_ids')),
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
    stops_done = excluded.stops_done,
    last_update = excluded.last_update,
    status = excluded.status,
    status_label = excluded.status_label,
    sync_label = excluded.sync_label,
    updated_at = now();
end;
$$;

revoke all on function public.replace_route_configurations(jsonb) from public, anon;
grant execute on function public.replace_route_configurations(jsonb) to authenticated;

create or replace function public.set_route_schedule(
  p_scheduled_for date,
  p_route_id text
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
    raise exception 'Solo un administrador puede programar rutas.';
  end if;

  if p_scheduled_for is null then
    raise exception 'Selecciona una fecha para programar la ruta.';
  end if;

  if p_scheduled_for < (now() at time zone 'America/Mazatlan')::date then
    raise exception 'No se pueden programar rutas en fechas pasadas.';
  end if;

  if p_route_id is null then
    delete from public.route_schedules where scheduled_for = p_scheduled_for;
    return;
  end if;

  if not exists (select 1 from public.route_configurations where id = p_route_id) then
    raise exception 'La ruta seleccionada no existe.';
  end if;

  insert into public.route_schedules (scheduled_for, route_id)
  values (p_scheduled_for, p_route_id)
  on conflict (scheduled_for) do update
    set status = case
          when route_schedules.route_id is distinct from excluded.route_id then 'scheduled'
          else route_schedules.status
        end,
        stops_done = case
          when route_schedules.route_id is distinct from excluded.route_id then 0
          else route_schedules.stops_done
        end,
        completed_point_ids = case
          when route_schedules.route_id is distinct from excluded.route_id then '{}'
          else route_schedules.completed_point_ids
        end,
        started_at = case
          when route_schedules.route_id is distinct from excluded.route_id then null
          else route_schedules.started_at
        end,
        completed_at = case
          when route_schedules.route_id is distinct from excluded.route_id then null
          else route_schedules.completed_at
        end,
        route_id = excluded.route_id,
        created_at = now();
end;
$$;

revoke all on function public.set_route_schedule(date, text) from public, anon;
grant execute on function public.set_route_schedule(date, text) to authenticated;

-- Earlier versions are replaced by ones that accept the device time and the crew.
drop function if exists public.start_route_configuration(text);
drop function if exists public.complete_route_configuration(text);
drop function if exists public.start_route_configuration(text, timestamptz);
drop function if exists public.complete_route_configuration(text, timestamptz);

-- Returns p_id when it is a registered fleet resource of that kind, otherwise null, so an
-- unknown crew id never makes the field app lose a route start or a report.
create or replace function public.known_fleet_resource_id(p_id text, p_kind text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- plpgsql resolves the table at run time; fleet_resources is created further down this file.
  return (select id from public.fleet_resources where id = p_id and kind = p_kind);
end;
$$;

revoke all on function public.known_fleet_resource_id(text, text) from public, anon, authenticated;

create or replace function public.start_route_configuration(
  p_route_id text,
  p_at timestamptz default now(),
  p_unit_id text default null,
  p_driver_id text default null,
  p_assistant_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- p_at: when it happened on the device (offline sync); never in the future.
  v_at timestamptz := least(coalesce(p_at, now()), now());
begin
  if not public.is_field_user() then
    raise exception 'Esta cuenta no es de campo.' using errcode = '42501';
  end if;

  update public.route_schedules
  set status = 'active',
      stops_done = 0,
      completed_point_ids = '{}',
      started_at = v_at,
      completed_at = null,
      unit_id = public.known_fleet_resource_id(p_unit_id, 'unit'),
      driver_id = public.known_fleet_resource_id(p_driver_id, 'driver'),
      assistant_id = public.known_fleet_resource_id(p_assistant_id, 'assistant')
  where route_id = p_route_id
    and scheduled_for = (v_at at time zone 'America/Mazatlan')::date
    and status <> 'completed';

  if not found then
    raise exception 'La ruta no existe o no está programada para hoy.';
  end if;

  update public.route_configurations
  set status = 'active',
      status_label = 'En curso',
      last_update = to_char(v_at at time zone 'America/Mazatlan', 'HH24:MI'),
      updated_at = now()
  where id = p_route_id;
end;
$$;

revoke all on function public.start_route_configuration(text, timestamptz, text, text, text) from public, anon;
grant execute on function public.start_route_configuration(text, timestamptz, text, text, text) to authenticated;

create or replace function public.complete_route_configuration(
  p_route_id text,
  p_at timestamptz default now(),
  p_unit_id text default null,
  p_driver_id text default null,
  p_assistant_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- p_at: when it happened on the device (offline sync); never in the future.
  v_at timestamptz := least(coalesce(p_at, now()), now());
  completed_points integer;
  completed_ids text[];
begin
  if not public.is_field_user() then
    raise exception 'Esta cuenta no es de campo.' using errcode = '42501';
  end if;

  select count(distinct report.container_id)::integer,
         coalesce(array_agg(distinct report.container_id), '{}'::text[])
  into completed_points, completed_ids
  from public.container_reports report
  join public.route_configurations route
    on route.id = report.route_id
   and report.container_id = any(route.point_ids)
  join public.route_schedules schedule
    on schedule.route_id = route.id
   and schedule.scheduled_for = (v_at at time zone 'America/Mazatlan')::date
   and schedule.status = 'active'
   and report.created_at >= schedule.started_at
  where route.id = p_route_id
    and (report.created_at at time zone 'America/Mazatlan')::date =
      (v_at at time zone 'America/Mazatlan')::date;

  if not exists (
    select 1
    from public.route_schedules
    where route_id = p_route_id
      and scheduled_for = (v_at at time zone 'America/Mazatlan')::date
  ) then
    raise exception 'La ruta no está programada para hoy.';
  end if;

  if completed_points < (
    select cardinality(point_ids)
    from public.route_configurations
    where id = p_route_id
  ) then
    raise exception 'Aún hay contenedores sin reporte en esta ruta.';
  end if;

  update public.route_schedules schedule
  set status = 'completed',
      stops_done = completed_points,
      completed_point_ids = completed_ids,
      completed_at = v_at,
      -- The crew that started keeps the credit; the closing crew fills in a start without one.
      unit_id = coalesce(schedule.unit_id, public.known_fleet_resource_id(p_unit_id, 'unit')),
      driver_id = coalesce(schedule.driver_id, public.known_fleet_resource_id(p_driver_id, 'driver')),
      assistant_id = coalesce(schedule.assistant_id, public.known_fleet_resource_id(p_assistant_id, 'assistant'))
  where schedule.route_id = p_route_id
    and schedule.scheduled_for = (v_at at time zone 'America/Mazatlan')::date
    and schedule.status <> 'completed';
end;
$$;

revoke all on function public.complete_route_configuration(text, timestamptz, text, text, text) from public, anon;
grant execute on function public.complete_route_configuration(text, timestamptz, text, text, text) to authenticated;

create or replace function public.update_route_progress_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_points integer;
  completed_ids text[];
begin
  update public.route_schedules
  set status = 'active',
      started_at = coalesce(started_at, new.created_at)
  where route_id = new.route_id
    and scheduled_for = (new.created_at at time zone 'America/Mazatlan')::date
    and status = 'scheduled';

  select count(distinct report.container_id)::integer,
         coalesce(array_agg(distinct report.container_id), '{}'::text[])
  into completed_points, completed_ids
  from public.container_reports report
  join public.route_configurations route on route.id = new.route_id
  join public.route_schedules schedule
    on schedule.route_id = route.id
    and schedule.scheduled_for = (new.created_at at time zone 'America/Mazatlan')::date
    and schedule.status <> 'completed'
  where report.route_id = route.id
    and report.container_id = any(route.point_ids)
    and report.created_at >= schedule.started_at
    and (report.created_at at time zone 'America/Mazatlan')::date = schedule.scheduled_for;

  update public.route_schedules schedule
  set stops_done = least(cardinality(route.point_ids), completed_points),
      completed_point_ids = completed_ids,
      status = case
        when schedule.status = 'scheduled' and completed_points > 0 then 'active'
        else schedule.status
      end,
      started_at = case
        when schedule.started_at is null and completed_points > 0 then new.created_at
        else schedule.started_at
      end
  from public.route_configurations route
  where schedule.route_id = new.route_id
    and schedule.route_id = route.id
    and schedule.scheduled_for = (new.created_at at time zone 'America/Mazatlan')::date
    and schedule.status <> 'completed';

  update public.route_configurations route
  set stops_done = least(cardinality(route.point_ids), completed_points),
      last_update = to_char(new.created_at at time zone 'America/Mazatlan', 'HH24:MI'),
      status = case
        when completed_points > 0 then 'active'
        else route.status
      end,
      status_label = case
        when completed_points > 0 then 'En ruta'
        else route.status_label
      end,
      updated_at = now()
      where route.id = new.route_id
        and exists (
          select 1
          from public.route_schedules schedule
          where schedule.route_id = route.id
            and schedule.scheduled_for = (new.created_at at time zone 'America/Mazatlan')::date
        );

  return new;
end;
$$;

revoke all on function public.update_route_progress_from_report() from public, anon, authenticated;

create or replace function public.prepare_container_report()
returns trigger
language plpgsql
-- Definer: known_fleet_resource_id is revoked from anon/authenticated, the field roles that insert.
security definer
set search_path = public
as $$
begin
  -- Reports captured offline keep their device time, but never a future one.
  new.created_at := least(coalesce(new.created_at, now()), now());
  new.received_at := now();
  -- Unknown crew ids are dropped instead of rejecting the report (and stranding it in the queue).
  new.unit_id := public.known_fleet_resource_id(new.unit_id, 'unit');
  new.driver_id := public.known_fleet_resource_id(new.driver_id, 'driver');
  new.assistant_id := public.known_fleet_resource_id(new.assistant_id, 'assistant');
  return new;
end;
$$;

revoke all on function public.prepare_container_report() from public, anon, authenticated;

drop trigger if exists container_report_prepare
  on public.container_reports;

create trigger container_report_prepare
  before insert on public.container_reports
  for each row
  execute function public.prepare_container_report();

drop trigger if exists container_report_updates_route_progress
  on public.container_reports;

create trigger container_report_updates_route_progress
  after insert on public.container_reports
  for each row
  execute function public.update_route_progress_from_report();

with route_progress as (
  select
    schedule.scheduled_for,
    schedule.route_id,
    route.id,
    least(cardinality(route.point_ids), count(distinct report.container_id)::integer) as stops_done,
    coalesce(array_agg(distinct report.container_id) filter (
      where report.container_id is not null
    ), '{}'::text[]) as completed_point_ids
  from public.route_schedules schedule
  join public.route_configurations route
    on route.id = schedule.route_id
  left join public.container_reports report
    on report.route_id = route.id
    and report.container_id = any(route.point_ids)
    and report.created_at >= schedule.started_at
    and (report.created_at at time zone 'America/Mazatlan')::date = schedule.scheduled_for
  group by schedule.scheduled_for, schedule.route_id, route.id, route.point_ids
)
update public.route_schedules schedule
set stops_done = progress.stops_done,
    completed_point_ids = progress.completed_point_ids,
    status = case
      when schedule.status = 'scheduled' and progress.stops_done > 0 then 'active'
      else schedule.status
    end,
    started_at = case
      when schedule.started_at is null and progress.stops_done > 0 then now()
      else schedule.started_at
    end
from route_progress progress
where schedule.route_id = progress.route_id
  and schedule.scheduled_for = progress.scheduled_for;
-- Field events that don't stop the route: incidents (crash, breakdown…) and fuel loads.
-- Photos are paths in the field-photos Storage bucket (older rows hold JPEG data URLs).
create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  route_id text not null default '',
  unit_id text not null default '',
  stop_id text,
  incident_type text not null
    check (incident_type in ('collision', 'injuries', 'mechanical', 'flat_tire', 'road_block', 'other')),
  severity text not null check (severity in ('low', 'medium', 'high')),
  description text not null default '',
  photos text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  received_at timestamptz not null default now()
);

create table if not exists public.fuel_loads (
  id uuid primary key default gen_random_uuid(),
  route_id text not null default '',
  unit_id text not null default '',
  liters numeric not null check (liters > 0),
  amount numeric check (amount >= 0),
  odometer_km numeric check (odometer_km >= 0),
  ticket_photo text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  received_at timestamptz not null default now()
);

-- 360° inspection recorded at dispatch, sent when the route starts. `results` maps each
-- checklist key (tires, brakes…) to BIEN / REGULAR / MAL; `comments` holds the REGULAR/MAL notes.
create table if not exists public.dispatch_inspections (
  id uuid primary key default gen_random_uuid(),
  route_id text not null default '',
  unit_id text,
  driver_id text,
  assistant_id text,
  results jsonb not null default '{}' check (jsonb_typeof(results) = 'object'),
  comments jsonb not null default '{}' check (jsonb_typeof(comments) = 'object'),
  fuel_liters numeric check (fuel_liters >= 0),
  odometer_photo text,
  created_at timestamptz not null default now(),
  received_at timestamptz not null default now()
);

create index if not exists dispatch_inspections_created_at_idx
  on public.dispatch_inspections (created_at desc);

-- Evidence photos taken at the return station when the route is closed.
create table if not exists public.route_completions (
  id uuid primary key default gen_random_uuid(),
  route_id text not null default '',
  unit_id text,
  driver_id text,
  assistant_id text,
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  received_at timestamptz not null default now()
);

create index if not exists route_completions_created_at_idx
  on public.route_completions (created_at desc);

create index if not exists incident_reports_created_at_idx
  on public.incident_reports (created_at desc);

create index if not exists fuel_loads_created_at_idx
  on public.fuel_loads (created_at desc);

do $$
declare
  field_table text;
begin
  foreach field_table in array array['incident_reports', 'fuel_loads', 'dispatch_inspections', 'route_completions'] loop
    execute format('alter table public.%I enable row level security', field_table);
    execute format('revoke insert on public.%I from anon', field_table);
    execute format('grant insert on public.%I to authenticated', field_table);
    execute format('grant select on public.%I to authenticated', field_table);

    execute format('drop policy if exists "Field app can insert" on public.%I', field_table);
    execute format(
      'create policy "Field app can insert" on public.%I for insert to authenticated with check (public.is_field_user())',
      field_table
    );

    execute format('drop policy if exists "Admins can read" on public.%I', field_table);
    execute format(
      'create policy "Admins can read" on public.%I for select to authenticated
         using (exists (select 1 from public.admin_users where user_id = auth.uid()))',
      field_table
    );

    -- Same device-time handling as container reports (never a future created_at).
    execute format('drop trigger if exists %I on public.%I', field_table || '_prepare', field_table);
    execute format(
      'create trigger %I before insert on public.%I for each row execute function public.prepare_container_report()',
      field_table || '_prepare', field_table
    );

    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
      and not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = field_table
      ) then
      execute format('alter publication supabase_realtime add table public.%I', field_table);
    end if;
  end loop;
end $$;

-- Units, drivers and assistants registered by admins; the field app lists the active ones at
-- dispatch. The database gives each one an id (U-001, OP-001, AUX-001) that is never reused and
-- that field reports store. Deleting only archives (active = false) so old reports keep resolving.
create table if not exists public.fleet_resources (
  id text primary key,
  kind text not null check (kind in ('unit', 'driver', 'assistant')),
  name text not null check (btrim(name) <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create sequence if not exists public.fleet_unit_id_seq;
create sequence if not exists public.fleet_driver_id_seq;
create sequence if not exists public.fleet_assistant_id_seq;

create or replace function public.next_fleet_resource_id(p_kind text)
returns text
language sql
security definer
set search_path = public
as $$
  select case p_kind when 'unit' then 'U-' when 'driver' then 'OP-' else 'AUX-' end
    || lpad(nextval(format('public.fleet_%s_id_seq', p_kind)::regclass)::text, 3, '0');
$$;

revoke all on function public.next_fleet_resource_id(text) from public, anon, authenticated;

-- An earlier version of this table had no id and used (kind, name) as its key.
alter table public.fleet_resources
  add column if not exists id text,
  add column if not exists active boolean not null default true;

update public.fleet_resources
set id = public.next_fleet_resource_id(kind)
where id is null;

do $$
begin
  if not exists (
    select 1 from information_schema.key_column_usage
    where table_schema = 'public'
      and table_name = 'fleet_resources'
      and constraint_name = 'fleet_resources_pkey'
      and column_name = 'id'
  ) then
    alter table public.fleet_resources drop constraint if exists fleet_resources_pkey;
    alter table public.fleet_resources add primary key (id);
  end if;
end $$;

create or replace function public.assign_fleet_resource_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ids always come from the database, never from the client.
  new.id := public.next_fleet_resource_id(new.kind);
  return new;
end;
$$;

revoke all on function public.assign_fleet_resource_id() from public, anon, authenticated;

drop trigger if exists fleet_resource_assign_id on public.fleet_resources;
create trigger fleet_resource_assign_id
  before insert on public.fleet_resources
  for each row
  execute function public.assign_fleet_resource_id();

alter table public.fleet_resources enable row level security;
revoke delete on public.fleet_resources from authenticated;
revoke select on public.fleet_resources from anon;
grant select on public.fleet_resources to authenticated;
grant insert (kind, name) on public.fleet_resources to authenticated;
grant update (active) on public.fleet_resources to authenticated;

drop policy if exists "Field app can read fleet resources" on public.fleet_resources;
create policy "Field app can read fleet resources"
  on public.fleet_resources
  for select
  to authenticated
  using (
    public.is_field_user()
    or exists (select 1 from public.admin_users where user_id = auth.uid())
  );

drop policy if exists "Admins can add fleet resources" on public.fleet_resources;
create policy "Admins can add fleet resources"
  on public.fleet_resources
  for insert
  to authenticated
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "Admins can delete fleet resources" on public.fleet_resources;
drop policy if exists "Admins can archive fleet resources" on public.fleet_resources;
create policy "Admins can archive fleet resources"
  on public.fleet_resources
  for update
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

-- Crew chosen at dispatch (fleet_resources ids) on every field report and route run; null
-- means none. The foreign keys are NOT VALID so older rows that stored a name are kept.
do $$
declare
  crew_table text;
  crew_column text;
begin
  foreach crew_table in array array['container_reports', 'incident_reports', 'fuel_loads', 'dispatch_inspections', 'route_completions', 'route_schedules'] loop
    foreach crew_column in array array['unit_id', 'driver_id', 'assistant_id'] loop
      execute format('alter table public.%I add column if not exists %I text', crew_table, crew_column);
      execute format('alter table public.%I alter column %I drop not null, alter column %I drop default',
        crew_table, crew_column, crew_column);
      execute format('update public.%I set %I = null where %I = %L', crew_table, crew_column, crew_column, '');

      if not exists (
        select 1 from pg_constraint
        where conname = crew_table || '_' || crew_column || '_fkey'
          and conrelid = format('public.%I', crew_table)::regclass
      ) then
        execute format(
          'alter table public.%I add constraint %I foreign key (%I) references public.fleet_resources (id) not valid',
          crew_table, crew_table || '_' || crew_column || '_fkey', crew_column
        );
      end if;
    end loop;
  end loop;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'fleet_resources'
    ) then
    alter publication supabase_realtime add table public.fleet_resources;
  end if;
end $$;

-- Route ids (R-01, R-02…) come from the database and are never reused: a new route never takes
-- the id of a deleted one, whose reports would otherwise be credited to it.
create sequence if not exists public.route_id_seq;

create or replace function public.next_route_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  highest bigint;
  next_number bigint;
begin
  if not exists (
    select 1 from public.admin_users where user_id = auth.uid()
  ) then
    raise exception 'Solo un administrador puede crear rutas.';
  end if;

  -- Two admins creating routes at the same time get different ids.
  perform pg_advisory_xact_lock(hashtext('public.next_route_id'));

  -- Skips every id already used anywhere, including routes created before this sequence existed.
  select coalesce(max(substring(used.id from '^R-([0-9]+)$')::bigint), 0)
  into highest
  from (
    select id from public.route_configurations
    union all select route_id from public.route_schedules
    union all select route_id from public.container_reports
    union all select route_id from public.incident_reports
    union all select route_id from public.fuel_loads
  ) used(id);

  next_number := nextval('public.route_id_seq');
  if next_number <= highest then
    next_number := highest + 1;
    perform setval('public.route_id_seq', next_number);
  end if;

  return 'R-' || lpad(next_number::text, 2, '0');
end;
$$;

revoke all on function public.next_route_id() from public, anon;
grant execute on function public.next_route_id() to authenticated;

-- Field photos as JPEG files in Storage (its own 1 GB on the free plan) instead of base64 text in
-- rows. Paths are <table>/<record id>/<name>.jpg. The field app can only upload; admins read them
-- through short-lived signed URLs. Only field accounts upload; type and size are capped too.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('field-photos', 'field-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Field app can upload photos" on storage.objects;
create policy "Field app can upload photos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'field-photos' and public.is_field_user());

drop policy if exists "Admins can read photos" on storage.objects;
create policy "Admins can read photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'field-photos'
    and exists (select 1 from public.admin_users where user_id = auth.uid())
  );
