-- Datos simulados para probar el panel (resumen, tablero, calendario y eventos de campo).
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de schema.sql. Se puede volver a ejecutar:
-- primero borra la simulación anterior. Todo lo simulado usa rutas con id 'SIM-…'.
-- Para quitarlo, ejecuta solo el bloque "Limpieza" del final.

-- Un solo bloque: el SQL Editor no conserva la tabla temporal entre sentencias, y así todo es atómico.
do $$
begin

-- Limpieza de una ejecución anterior.
delete from public.container_reports where route_id like 'SIM-%';
delete from public.dispatch_inspections where route_id like 'SIM-%';
delete from public.route_completions where route_id like 'SIM-%';
delete from public.fuel_loads where route_id like 'SIM-%';
delete from public.incident_reports where route_id like 'SIM-%';
delete from public.route_configurations where id like 'SIM-%'; -- borra sus asignaciones del calendario en cascada

-- Dos rutas con los puntos de src/data/collectionPoints.js.
insert into public.route_configurations (id, zone, point_ids) values
  ('SIM-R1', 'Simulada · Norte', '{CONT-02,CONT-03,CONT-04,CONT-07}'),
  ('SIM-R2', 'Simulada · Sur', '{CONT-01,CONT-05,CONT-06,CONT-08}');

-- Últimos 60 días (sin hoy ni domingos), alternando las rutas.
drop table if exists pg_temp.sim_days;
create temp table sim_days as
select d::date as day,
       case when extract(doy from d)::int % 2 = 0 then 'SIM-R1' else 'SIM-R2' end as route_id
from generate_series(
  (now() at time zone 'America/Mazatlan')::date - 60,
  (now() at time zone 'America/Mazatlan')::date - 1,
  interval '1 day'
) d
where extract(isodow from d) <> 7;

-- Calendario: solo en días libres, para no pisar asignaciones reales.
insert into public.route_schedules (scheduled_for, route_id, status, stops_done, completed_point_ids, started_at, completed_at)
select s.day, s.route_id, 'completed', cardinality(r.point_ids), r.point_ids,
       (s.day + time '08:00') at time zone 'America/Mazatlan',
       (s.day + time '14:00') at time zone 'America/Mazatlan'
from sim_days s
join public.route_configurations r on r.id = s.route_id
on conflict (scheduled_for) do nothing;

-- Un reporte por contenedor y día. "0 * p.i" obliga a recalcular random() en cada fila.
insert into public.container_reports
  (route_id, container_id, fill_level, collected_kg, materials, material_weights, incidents, incident_comments, created_at)
select s.route_id, p.container_id, f.fill,
       w.plastico + w.carton + w.papel,
       array_remove(array[
         case when w.plastico > 0 then 'plastico' end,
         case when w.carton > 0 then 'carton' end,
         case when w.papel > 0 then 'papel' end
       ], null),
       jsonb_strip_nulls(jsonb_build_object(
         'plastico', nullif(w.plastico, 0),
         'carton', nullif(w.carton, 0),
         'papel', nullif(w.papel, 0)
       )),
       case
         when f.x < 0.05 then '{"damaged": true}'
         when f.x > 0.95 then '{"outsideWaste": true, "mixedWaste": true}'
         else '{}'
       end::jsonb,
       case when f.x < 0.05 or f.x > 0.95 then 'Incidencia simulada' else '' end,
       (s.day + time '08:30' + (p.i - 1) * interval '50 minutes' + (random() * 20) * interval '1 minute')
         at time zone 'America/Mazatlan'
from sim_days s
join public.route_configurations r on r.id = s.route_id
cross join lateral unnest(r.point_ids) with ordinality as p(container_id, i)
cross join lateral (
  select x,
         case when x < 0.2 then 'low' when x < 0.6 then 'medium' else 'full' end as fill,
         case when x < 0.2 then 3 when x < 0.6 then 10 else 22 end as scale
  from (select random() + 0 * p.i as x) q
) f
cross join lateral (
  select case when f.fill <> 'low' or random() + 0 * p.i < 0.5 then round((f.scale * (0.4 + random()))::numeric, 1) else 0 end as plastico,
         case when random() + 0 * p.i < 0.7 then round((f.scale * (0.2 + random() * 0.8))::numeric, 1) else 0 end as carton,
         case when random() + 0 * p.i < 0.6 then round((f.scale * (0.1 + random() * 0.6))::numeric, 1) else 0 end as papel
) w;

-- Los reportes marcan la ruta "En ruta" (trigger); se deja como programada.
update public.route_configurations
set stops_done = 0, last_update = '--:--', status = 'scheduled', status_label = 'Programada', sync_label = 'Sin iniciar'
where id like 'SIM-%';

-- Inspección 360° al salir; a veces llantas o luces en REGULAR con comentario.
insert into public.dispatch_inspections (route_id, results, comments, fuel_liters, created_at)
select s.route_id,
       jsonb_build_object(
         'tires', case when q.x < 0.15 then 'REGULAR' else 'BIEN' end,
         'fluids', 'BIEN', 'hydraulics', 'BIEN',
         'lights', case when q.x > 0.9 then 'REGULAR' else 'BIEN' end,
         'brakes', 'BIEN', 'wipers', 'BIEN', 'mirrors', 'BIEN', 'safetyGear', 'BIEN', 'extinguisher', 'BIEN'
       ),
       case
         when q.x < 0.15 then '{"tires": "Desgaste visible en llanta trasera"}'
         when q.x > 0.9 then '{"lights": "Faro izquierdo intermitente"}'
         else '{}'
       end::jsonb,
       round((40 + random() * 40)::numeric),
       (s.day + time '07:45') at time zone 'America/Mazatlan'
from sim_days s
cross join lateral (select random() + 0 * extract(doy from s.day) as x) q;

-- Cierre en la estación de regreso (sin fotos).
insert into public.route_completions (route_id, created_at)
select route_id, (day + time '14:00') at time zone 'America/Mazatlan'
from sim_days;

-- Carga de combustible lunes y jueves; el odómetro avanza.
insert into public.fuel_loads (route_id, unit_id, liters, amount, odometer_km, created_at)
select route_id, 'SIM-UNIDAD', l.liters, round(l.liters * 24.5, 2),
       50000 + row_number() over (order by day) * 180,
       (day + time '13:30') at time zone 'America/Mazatlan'
from sim_days
cross join lateral (select round((35 + random() * 35 + 0 * extract(doy from day))::numeric, 1) as liters) l
where extract(isodow from day) in (1, 4);

-- Unas 6 incidencias repartidas en el periodo.
insert into public.incident_reports (route_id, unit_id, incident_type, severity, description, created_at)
select route_id, 'SIM-UNIDAD',
       (array['collision', 'mechanical', 'flat_tire', 'road_block', 'other'])[1 + floor(random() * 5)::int],
       (array['low', 'medium', 'high'])[1 + floor(random() * 3)::int],
       'Incidencia simulada para pruebas',
       (day + time '10:15') at time zone 'America/Mazatlan'
from sim_days
where random() + 0 * extract(doy from day) < 0.12;

drop table sim_days;
end $$;

-- Resultado
select count(*) as reportes, round(sum(collected_kg), 1) as kg, min(created_at)::date as desde, max(created_at)::date as hasta
from public.container_reports where route_id like 'SIM-%';


-- ===================== Limpieza (ejecutar solo este bloque para quitar la simulación) =====================
-- delete from public.container_reports where route_id like 'SIM-%';
-- delete from public.dispatch_inspections where route_id like 'SIM-%';
-- delete from public.route_completions where route_id like 'SIM-%';
-- delete from public.fuel_loads where route_id like 'SIM-%';
-- delete from public.incident_reports where route_id like 'SIM-%';
-- delete from public.route_configurations where id like 'SIM-%';
