import { createClient } from '@supabase/supabase-js';
import { getOperationalDate, getRouteForDate } from './routeConfiguration.js';
import { formatClockTime } from '../utils/format.js';

const environment = import.meta.env || {};
const supabaseUrl = environment.VITE_SUPABASE_URL;
const supabaseAnonKey = environment.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  // The session is kept on the device, so a field phone stays signed in while offline.
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = Boolean(supabase);

function requireSupabase() {
  if (!supabase) {
    throw new Error('La base de datos no está configurada (faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).');
  }

  return supabase;
}

export async function getSupabaseSession() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

/** Roles of the signed-in account as { admin, field }; RLS lets each account read only its own rows. */
export async function getCurrentUserRoles() {
  const client = requireSupabase();
  const [admin, field] = await Promise.all([
    client.from('admin_users').select('user_id').maybeSingle(),
    client.from('field_users').select('user_id').maybeSingle()
  ]);

  if (admin.error) throw admin.error;
  if (field.error) throw field.error;
  return { admin: Boolean(admin.data), field: Boolean(field.data) };
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
      .select('route_id, scheduled_for, status, stops_done, completed_point_ids, started_at, completed_at, assigned_by')
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
      fieldScheduledDates: schedules
        .filter((schedule) => schedule.route_id === route.id && schedule.assigned_by === 'field')
        .map((schedule) => schedule.scheduled_for),
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

/** Field fallback when the admin scheduled nothing for the day; `at` is when the crew chose it. */
export async function claimRouteForToday(routeId, at) {
  const { error } = await requireSupabase().rpc('claim_route_for_today', {
    p_route_id: routeId,
    p_at: at
  });

  if (error) throw error;
}

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

export function subscribeToAdminUpdates(onChange) {
  return subscribeToTables('admin-field-updates', [
    'route_configurations',
    'route_schedules',
    'container_reports'
  ], onChange);
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

// Photos go to Storage as JPEG files and rows keep only the path (`<table>/<id>/<name>.jpg`).
// Rows saved before this hold the data URL itself; both are still shown.
const photoBucket = 'field-photos';
const photoPathPattern = /^[a-z_]+\/[0-9a-f-]+\/[\w-]+\.jpg$/;
const isDataUrlPhoto = (value) => typeof value === 'string' && value.startsWith('data:image/');

/**
 * Uploads a data URL photo to `path` and returns the path; other values pass through.
 * The path comes from the record id, so a retried sync finds the file already uploaded.
 */
async function uploadPhoto(path, photo) {
  if (!isDataUrlPhoto(photo)) return photo ?? null;
  const blob = await (await fetch(photo)).blob();
  const { error } = await requireSupabase().storage
    .from(photoBucket)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

  if (error && error.status !== 409 && String(error.statusCode) !== '409') {
    // fieldSync reads an error without `code` as "offline"; a Storage rejection gets one.
    if (error.status) error.code = `STORAGE_${error.statusCode || error.status}`;
    throw error;
  }
  return path;
}

const uploadPhotoList = (folder, photos = []) => Promise.all(
  photos.map((photo, index) => uploadPhoto(`${folder}/${index + 1}.jpg`, photo))
);

async function uploadPhotoMap(folder, photos = {}) {
  const entries = await Promise.all(Object.entries(photos).map(async ([key, photo]) => (
    [key, await uploadPhoto(`${folder}/${key}.jpg`, photo)]
  )));
  return Object.fromEntries(entries);
}

/** Stored photo values as displayable URLs: Storage paths get a 1-hour signed URL, anything unknown is null. */
async function resolvePhotoUrls(values) {
  const paths = values.filter((value) => typeof value === 'string' && photoPathPattern.test(value));
  const signedUrls = new Map();
  if (paths.length) {
    const { data, error } = await requireSupabase().storage.from(photoBucket).createSignedUrls(paths, 3600);
    if (error) throw error;
    data.forEach((item) => signedUrls.set(item.path, item.signedUrl));
  }
  return values.map((value) => (isDataUrlPhoto(value) ? value : signedUrls.get(value) || null));
}

/** `id` and `createdAt` come from the device, so a retried insert is detected as a duplicate (23505). */
export async function insertContainerReport(routeId, containerId, report, { id, createdAt, crew } = {}) {
  if (!supabase) {
    return false;
  }

  // Reports queued before photos were kept have none.
  const photos = await uploadPhotoMap(`container_reports/${id}`, report.photos);
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
      photos,
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
  const photos = await uploadPhotoList(`incident_reports/${id}`, incident.photos);
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
      photos,
      latitude: incident.latitude,
      longitude: incident.longitude
    });

  if (error) throw error;
}

export async function insertFuelLoad(fuelLoad, { id, createdAt, crew } = {}) {
  const ticketPhoto = await uploadPhoto(`fuel_loads/${id}/ticket.jpg`, fuelLoad.ticketPhoto);
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
      ticket_photo: ticketPhoto,
      latitude: fuelLoad.latitude,
      longitude: fuelLoad.longitude
    });

  if (error) throw error;
}

export async function insertDispatchInspection(inspection, { id, createdAt, crew } = {}) {
  const odometerPhoto = await uploadPhoto(`dispatch_inspections/${id}/odometer.jpg`, inspection.odometerPhoto);
  const { error } = await requireSupabase()
    .from('dispatch_inspections')
    .insert({
      id,
      created_at: createdAt,
      route_id: inspection.routeId || '',
      ...crewColumns(crew),
      results: inspection.results,
      comments: inspection.comments,
      fuel_liters: inspection.fuelLiters,
      odometer_photo: odometerPhoto
    });

  if (error) throw error;
}

export async function insertRouteCompletion(completion, { id, createdAt, crew } = {}) {
  const photos = await uploadPhotoList(`route_completions/${id}`, completion.photos);
  const { error } = await requireSupabase()
    .from('route_completions')
    .insert({
      id,
      created_at: createdAt,
      route_id: completion.routeId || '',
      ...crewColumns(crew),
      photos
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

export async function fetchAdminDispatchInspections() {
  const { data, error } = await requireSupabase()
    .from('dispatch_inspections')
    .select('id, route_id, unit_id, driver_id, assistant_id, results, comments, fuel_liters, created_at')
    .order('created_at', { ascending: false })
    .limit(recentFieldEventLimit);

  if (error) throw error;
  return data;
}

export async function fetchAdminRouteCompletions() {
  const { data, error } = await requireSupabase()
    .from('route_completions')
    .select('id, route_id, unit_id, driver_id, assistant_id, created_at')
    .order('created_at', { ascending: false })
    .limit(recentFieldEventLimit);

  if (error) throw error;
  return data;
}

/** Photos of one container report as { initialExterior: url, … }; the list leaves them out. */
export async function fetchContainerReportPhotos(id) {
  const { data, error } = await requireSupabase()
    .from('container_reports')
    .select('photos')
    .eq('id', id)
    .single();

  if (error) throw error;
  const entries = Object.entries(data.photos || {});
  const urls = await resolvePhotoUrls(entries.map(([, photo]) => photo));
  return Object.fromEntries(entries.map(([key], index) => [key, urls[index]]));
}

const fieldEventPhotoColumns = { fuel_loads: 'ticket_photo', dispatch_inspections: 'odometer_photo' };

/** Photo URLs of one incident, fuel load, dispatch inspection or route closure (by table). */
export async function fetchFieldEventPhotos(table, id) {
  const column = fieldEventPhotoColumns[table] || 'photos';
  const { data, error } = await requireSupabase()
    .from(table)
    .select(column)
    .eq('id', id)
    .single();

  if (error) throw error;
  return (await resolvePhotoUrls([data[column]].flat().filter(Boolean))).filter(Boolean);
}
