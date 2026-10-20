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
