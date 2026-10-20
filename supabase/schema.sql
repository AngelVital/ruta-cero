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
grant insert on public.container_reports to anon, authenticated;

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
  add column if not exists completed_at timestamptz;

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
grant select on public.route_schedules to anon, authenticated;

drop policy if exists "Field users can read route schedules"
  on public.route_schedules;

create policy "Field users can read route schedules"
  on public.route_schedules
  for select
  to anon, authenticated
  using (true);

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

-- The single-argument versions are replaced by ones that accept the device time.
drop function if exists public.start_route_configuration(text);
drop function if exists public.complete_route_configuration(text);

create or replace function public.start_route_configuration(p_route_id text, p_at timestamptz default now())
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- p_at: when it happened on the device (offline sync); never in the future.
  v_at timestamptz := least(coalesce(p_at, now()), now());
begin
  update public.route_schedules
  set status = 'active',
      stops_done = 0,
      completed_point_ids = '{}',
      started_at = v_at,
      completed_at = null
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

revoke all on function public.start_route_configuration(text, timestamptz) from public;
grant execute on function public.start_route_configuration(text, timestamptz) to anon, authenticated;

create or replace function public.complete_route_configuration(p_route_id text, p_at timestamptz default now())
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
      completed_at = v_at
  where schedule.route_id = p_route_id
    and schedule.scheduled_for = (v_at at time zone 'America/Mazatlan')::date
    and schedule.status <> 'completed';
end;
$$;

revoke all on function public.complete_route_configuration(text, timestamptz) from public;
grant execute on function public.complete_route_configuration(text, timestamptz) to anon, authenticated;

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
set search_path = public
as $$
begin
  -- Reports captured offline keep their device time, but never a future one.
  new.created_at := least(coalesce(new.created_at, now()), now());
  new.received_at := now();
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