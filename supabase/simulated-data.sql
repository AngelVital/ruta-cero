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

-- Últimos 120 días (sin hoy ni domingos), alternando las rutas. Cada día tiene su propio volumen
-- (los lunes llega lo acumulado del fin de semana) y su propia proporción de cartón y papel.
drop table if exists pg_temp.sim_days;
create temp table sim_days as
select d::date as day,
       case when extract(doy from d)::int % 2 = 0 then 'SIM-R1' else 'SIM-R2' end as route_id,
       (0.45 + random() * 1.1) * case extract(isodow from d) when 1 then 1.4 when 6 then 0.7 else 1 end as volume,
       0.4 + random() * 1.4 as carton_mix,
       0.4 + random() * 1.4 as paper_mix
from generate_series(
  (now() at time zone 'America/Mazatlan')::date - 120,
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

-- Un reporte por contenedor y día. Los random() van en la lista de columnas (se evalúan por fila):
-- dentro de un LATERAL que solo depende de p.i, Postgres reutilizaba el resultado y repetía los kg cada día.
with base as materialized (
  select s.day, s.route_id, s.volume, s.carton_mix, s.paper_mix, p.container_id, p.i,
         random() as x, random() as r1, random() as r2, random() as r3, random() as r4, random() as r5, random() as r6, random() as minutes
  from sim_days s
  join public.route_configurations r on r.id = s.route_id
  cross join lateral unnest(r.point_ids) with ordinality as p(container_id, i)
), f as (
  select *,
         case when x < 0.2 then 'low' when x < 0.6 then 'medium' else 'full' end as fill,
         (case when x < 0.2 then 3 when x < 0.6 then 10 else 22 end) * volume as scale
  from base
), w as (
  select *,
         case when fill <> 'low' or r1 < 0.5 then round((scale * (0.4 + r2))::numeric, 1) else 0 end as plastico,
         case when r3 < 0.7 then round((scale * carton_mix * (0.2 + r4 * 0.8))::numeric, 1) else 0 end as carton,
         case when r5 < 0.6 then round((scale * paper_mix * (0.1 + r6 * 0.6))::numeric, 1) else 0 end as papel
  from f
)
insert into public.container_reports
  (route_id, container_id, fill_level, collected_kg, materials, material_weights, incidents, incident_comments, created_at)
select w.route_id, w.container_id, w.fill,
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
         when w.x < 0.05 then '{"damaged": true}'
         when w.x > 0.95 then '{"outsideWaste": true, "mixedWaste": true}'
         else '{}'
       end::jsonb,
       case when w.x < 0.05 or w.x > 0.95 then 'Incidencia simulada' else '' end,
       (w.day + time '08:30' + (w.i - 1) * interval '50 minutes' + (w.minutes * 20) * interval '1 minute')
         at time zone 'America/Mazatlan'
from w;

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

-- Carga de combustible lunes y jueves.
insert into public.fuel_loads (route_id, unit_id, liters, amount, created_at)
select route_id, 'SIM-UNIDAD', l.liters, round(l.liters * 24.5, 2),
       (day + time '13:30') at time zone 'America/Mazatlan'
from sim_days
cross join lateral (select round((35 + random() * 35 + 0 * extract(doy from day))::numeric, 1) as liters) l
where extract(isodow from day) in (1, 4);

-- Unas 12 incidencias repartidas en el periodo.
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
