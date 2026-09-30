import { createClient } from '@supabase/supabase-js';

const environment = import.meta.env || {};
const supabaseUrl = environment.VITE_SUPABASE_URL;
const supabaseAnonKey = environment.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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