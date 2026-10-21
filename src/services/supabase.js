import { createClient } from '@supabase/supabase-js';
import { getOperationalDate, getRouteForDate } from './routeConfiguration.js';
import { formatClockTime } from '../utils/format.js';

const environment = import.meta.env || {};
const supabaseUrl = environment.VITE_SUPABASE_URL;
const supabaseAnonKey = environment.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = Boolean(supabase);

function requireSupabase() {
  if (!supabase) {
    throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para usar Supabase.');
  }

  return supabase;
}

export async function getSupabaseSession() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInAdmin(email, password) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function isCurrentUserAdmin() {
  const { data, error } = await requireSupabase()
    .from('admin_users')
    .select('user_id')
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

/**
 * Loads container reports, newest first. With `since`, only reports received at or after
 * that ISO timestamp are returned, so automatic refreshes don't download the whole history.
 * It filters by `received_at` because a report captured offline arrives with an older `created_at`.
 */
export async function fetchAdminContainerReports({ since = null } = {}) {
  const client = requireSupabase();
  const pageSize = 1000;
  const reports = [];
  let from = 0;

  while (true) {
    let query = client
      .from('container_reports')
      .select('id, route_id, container_id, fill_level, collected_kg, materials, material_weights, photo_evidence, incidents, incident_comments, unit_id, driver_id, assistant_id, created_at, received_at');
    if (since) query = query.gte('received_at', since);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    reports.push(...data);
    if (data.length < pageSize) return reports;
    from += pageSize;
  }
}

export async function fetchRouteConfigurations() {
  const client = requireSupabase();
  const today = getOperationalDate();
  const [{ data, error }, { data: schedules, error: schedulesError }] = await Promise.all([
    client
      .from('route_configurations')
      .select('id, zone, point_ids, stops_done, last_update, status, status_label, sync_label')
      .order('id'),
    client
      .from('route_schedules')
      .select('route_id, scheduled_for, status, stops_done, completed_point_ids, started_at, completed_at')
  ]);

  if (error) throw error;
  if (schedulesError) throw schedulesError;
  const scheduledDatesByRoute = new Map();
  schedules.forEach(({ route_id, scheduled_for }) => {
    const dates = scheduledDatesByRoute.get(route_id) || [];
    dates.push(scheduled_for);
    scheduledDatesByRoute.set(route_id, dates);
  });

  return data.map((route) => {
    const todaysSchedule = schedules.find((schedule) => (
      schedule.route_id === route.id && schedule.scheduled_for === today
    ));
    const status = !todaysSchedule
      ? 'unscheduled'
      : todaysSchedule.status || 'scheduled';

    return getRouteForDate({
      id: route.id,
      zone: route.zone,
      pointIds: route.point_ids || [],
      scheduledDates: scheduledDatesByRoute.get(route.id) || [],
      completedPointIds: todaysSchedule?.completed_point_ids || [],
      stopsDone: todaysSchedule?.stops_done || 0,
      stopsTotal: (route.point_ids || []).length,
      lastUpdate: todaysSchedule?.started_at ? formatClockTime(todaysSchedule.started_at) : '--:--',
      startedAt: todaysSchedule?.started_at || null,
      completedAt: todaysSchedule?.completed_at || null,
      status,
      statusDate: today,
      syncLabel: 'Sin iniciar'
    }, today);
  });
}

export async function saveRouteConfigurations(routes) {
  const { error } = await requireSupabase().rpc('replace_route_configurations', {
    p_routes: routes.map((route) => ({
      id: route.id,
      zone: route.zone,
      point_ids: route.pointIds,
      stops_done: route.stopsDone || 0,
      last_update: route.lastUpdate || '--:--',
      status: route.status || 'scheduled',
      status_label: route.statusLabel || 'Programada',
      sync_label: route.syncLabel || 'Sin iniciar'
    }))
  });

  if (error) throw error;
}

export async function saveRouteSchedule(scheduledFor, routeId) {
  const { error } = await requireSupabase().rpc('set_route_schedule', {
    p_scheduled_for: scheduledFor,
    p_route_id: routeId || null
  });

  if (error) throw error;
}

/** The database assigns route ids so a deleted route's id is never reused. */
export async function fetchNextRouteId() {
  const { data, error } = await requireSupabase().rpc('next_route_id');
  if (error) throw error;
  return data;
}

// RPC parameters for the crew chosen at dispatch.
const crewParams = (crew = {}) => ({
  p_unit_id: crew.unitId || null,
  p_driver_id: crew.driverId || null,
  p_assistant_id: crew.assistantId || null
});

/** `at` is when the route started on the device; it may be earlier than the sync time. */
export async function markRouteStarted(routeId, at, crew) {
  const { error } = await requireSupabase().rpc('start_route_configuration', {
    p_route_id: routeId,
    p_at: at,
    ...crewParams(crew)
  });

  if (error) throw error;
}

export async function markRouteCompleted(routeId, at, crew) {
  const { error } = await requireSupabase().rpc('complete_route_configuration', {
    p_route_id: routeId,
    p_at: at,
    ...crewParams(crew)
  });

  if (error) throw error;
}

function subscribeToTables(channelName, tables, onChange) {
  if (!supabase) return () => {};

  const channel = supabase.channel(channelName);
  tables.forEach((table) => {
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table
    }, onChange);
  });
  channel.subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToRouteConfigurations(onChange) {
  return subscribeToTables('route-configurations', ['route_configurations', 'route_schedules', 'fleet_resources'], onChange);
}

/** Active units, drivers and assistants as [{ id, kind: 'unit' | 'driver' | 'assistant', name }]. */
export async function fetchFleetResources() {
  const { data, error } = await requireSupabase()
    .from('fleet_resources')
    .select('id, kind, name')
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return data;
}

/** The database assigns the id (U-001, OP-001, AUX-001); returns the created record. */
export async function addFleetResource(kind, name) {
  const { data, error } = await requireSupabase()
    .from('fleet_resources')
    .insert({ kind, name })
    .select('id, kind, name')
    .single();

  if (error) throw error;
  return data;
}

/** Archives instead of deleting, so reports that store the id still know who it was. */
export async function archiveFleetResource(id) {
  const { data, error } = await requireSupabase()
    .from('fleet_resources')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) throw error;
  // RLS hides a rejected update as zero rows instead of an error.
  if (data.length === 0) throw new Error('No se encontró el registro o no tienes permiso para modificarlo.');
}

// Crew chosen at dispatch, stored on every field report.
const crewColumns = (crew = {}) => ({
  unit_id: crew.unitId || null,
  driver_id: crew.driverId || null,
  assistant_id: crew.assistantId || null
});

/** `id` and `createdAt` come from the device, so a retried insert is detected as a duplicate (23505). */
export async function insertContainerReport(routeId, containerId, report, { id, createdAt, crew } = {}) {
  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from('container_reports')
    .insert({
      id,
      created_at: createdAt,
      route_id: routeId,
      container_id: containerId,
      fill_level: report.fillLevel,
      collected_kg: report.collectedKg,
      materials: report.materials,
      material_weights: report.materialWeights,
      photo_evidence: report.photoEvidence,
      incidents: report.incidents,
      incident_comments: report.incidentComments,
      ...crewColumns(crew)
    });

  if (error) {
    throw error;
  }

  return true;
}

/** `id` and `createdAt` come from the device, so a retried insert is detected as a duplicate (23505). */
export async function insertIncidentReport(incident, { id, createdAt, crew } = {}) {
  const { error } = await requireSupabase()
    .from('incident_reports')
    .insert({
      id,
      created_at: createdAt,
      route_id: incident.routeId || '',
      ...crewColumns(crew),
      stop_id: incident.stopId || null,
      incident_type: incident.type,
      severity: incident.severity,
      description: incident.description,
      photos: incident.photos,
      latitude: incident.latitude,
      longitude: incident.longitude
    });

  if (error) throw error;
}

export async function insertFuelLoad(fuelLoad, { id, createdAt, crew } = {}) {
  const { error } = await requireSupabase()
    .from('fuel_loads')
    .insert({
      id,
      created_at: createdAt,
      route_id: fuelLoad.routeId || '',
      ...crewColumns(crew),
      liters: fuelLoad.liters,
      amount: fuelLoad.amount,
      odometer_km: fuelLoad.odometerKm,
      ticket_photo: fuelLoad.ticketPhoto,
      latitude: fuelLoad.latitude,
      longitude: fuelLoad.longitude
    });

  if (error) throw error;
}

// Admin lists leave the photos out (they weigh ~100 KB each); fetchFieldEventPhotos loads them on demand.
const recentFieldEventLimit = 100;

export async function fetchAdminIncidentReports() {
  const { data, error } = await requireSupabase()
    .from('incident_reports')
    .select('id, route_id, unit_id, driver_id, assistant_id, stop_id, incident_type, severity, description, latitude, longitude, created_at')
    .order('created_at', { ascending: false })
    .limit(recentFieldEventLimit);

  if (error) throw error;
  return data;
}

export async function fetchAdminFuelLoads() {
  const { data, error } = await requireSupabase()
    .from('fuel_loads')
    .select('id, route_id, unit_id, driver_id, assistant_id, liters, amount, odometer_km, latitude, longitude, created_at')
    .order('created_at', { ascending: false })
    .limit(recentFieldEventLimit);

  if (error) throw error;
  return data;
}

/** Photos of one incident (`incident_reports`) or fuel load (`fuel_loads`) as data URLs. */
export async function fetchFieldEventPhotos(table, id) {
  const column = table === 'fuel_loads' ? 'ticket_photo' : 'photos';
  const { data, error } = await requireSupabase()
    .from(table)
    .select(column)
    .eq('id', id)
    .single();

  if (error) throw error;
  return [data[column]].flat().filter(Boolean);
}
