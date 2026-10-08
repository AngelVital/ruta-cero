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