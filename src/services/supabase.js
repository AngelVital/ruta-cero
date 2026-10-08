import { createClient } from '@supabase/supabase-js';

const environment = import.meta.env || {};
const supabaseUrl = environment.VITE_SUPABASE_URL;
const supabaseAnonKey = environment.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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

export async function fetchAdminContainerReports() {
  const { data, error } = await requireSupabase()
    .from('container_reports')
    .select('id, route_id, container_id, fill_level, collected_kg, materials, material_weights, photo_evidence, incidents, incident_comments, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return data;
}

export async function fetchRouteConfigurations() {
  const { data, error } = await requireSupabase()
    .from('route_configurations')
    .select('id, zone, point_ids, is_selected, stops_done, last_update, status, status_label, sync_label')
    .order('id');

  if (error) throw error;
  return data.map((route) => ({
    id: route.id,
    zone: route.zone,
    pointIds: route.point_ids || [],
    stopsDone: route.stops_done || 0,
    stopsTotal: (route.point_ids || []).length,
    lastUpdate: route.last_update || '--:--',
    status: route.status || 'scheduled',
    statusLabel: route.status_label || 'Programada',
    syncLabel: route.sync_label || 'Sin iniciar',
    isSelected: route.is_selected
  }));
}

export async function saveRouteConfigurations(routes, selectedRouteId) {
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
    })),
    p_selected_route_id: selectedRouteId
  });

  if (error) throw error;
}

export function subscribeToRouteConfigurations(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('route-configurations')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'route_configurations'
    }, onChange)
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export async function insertContainerReport(routeId, containerId, report) {
  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from('container_reports')
    .insert({
      route_id: routeId,
      container_id: containerId,
      fill_level: report.fillLevel,
      collected_kg: report.collectedKg,
      materials: report.materials,
      material_weights: report.materialWeights,
      photo_evidence: report.photoEvidence,
      incidents: report.incidents,
      incident_comments: report.incidentComments
    });

  if (error) {
    throw error;
  }

  return true;
}