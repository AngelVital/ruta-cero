import { inspectionKeys } from '../data/inspectionItems.js';

export const requiresInspectionComment = (value) => value === 'REGULAR' || value === 'MAL';

/** Progress of the 360° inspection: reviewed points, odometer photo and required comments. */
export function getInspectionProgress(inspection360, comments = {}) {
  const total = inspectionKeys.length;
  const filled = inspectionKeys.filter((key) => inspection360[key] !== null && inspection360[key] !== undefined).length;
  const odometerPhotoCaptured = Boolean(inspection360.odometerPhotoEvidence);
  const missingCommentKeys = inspectionKeys.filter((key) => (
    requiresInspectionComment(inspection360[key]) && !(comments?.[key] || '').trim()
  ));
  const missingPoints = total - filled;

  return {
    total,
    filled,
    missingPoints,
    odometerPhotoCaptured,
    missingCommentKeys,
    ready: missingPoints === 0 && odometerPhotoCaptured && missingCommentKeys.length === 0
  };
}

/** What the dispatch sends to Supabase: each point's result, its comment if required, fuel and odometer photo. */
export function buildDispatchInspection({ inspection360, inspectionComments = {}, fuelLevel, route }) {
  const results = Object.fromEntries(inspectionKeys.map((key) => [key, inspection360[key] ?? null]));
  const comments = Object.fromEntries(inspectionKeys
    .filter((key) => requiresInspectionComment(results[key]))
    .map((key) => [key, (inspectionComments[key] || '').trim()]));
  const photo = inspection360.odometerPhotoEvidence;

  return {
    routeId: route.id,
    results,
    comments,
    fuelLiters: fuelLevel.liters,
    // Inspections saved before the photo was kept only stored `true`.
    odometerPhoto: typeof photo === 'string' ? photo : null
  };
}

export function getInspectionStatusLabel(progress) {
  const { ready, missingPoints, odometerPhotoCaptured, missingCommentKeys } = progress;
  const missingComments = missingCommentKeys.length;
  if (ready) return 'CONFIRMAR Y FIRMAR INSPECCIÓN';
  if (missingPoints > 0) {
    return `FALTAN ${missingPoints} PUNTO${missingPoints !== 1 ? 'S' : ''}${odometerPhotoCaptured ? '' : ' Y FOTO DEL ODÓMETRO'}`;
  }
  if (!odometerPhotoCaptured) return 'FALTA FOTO DEL ODÓMETRO';
  return `FALTA${missingComments !== 1 ? 'N' : ''} ${missingComments} COMENTARIO${missingComments !== 1 ? 'S' : ''}`;
}
