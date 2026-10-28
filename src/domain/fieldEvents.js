/**
 * Eventos de campo que no detienen la ruta: incidencias del vehículo y cargas de combustible.
 */

export const incidentTypes = [
  { key: 'collision', label: 'Choque', icon: 'car_crash' },
  { key: 'injuries', label: 'Accidente con lesionados', icon: 'personal_injury' },
  { key: 'mechanical', label: 'Avería mecánica', icon: 'car_repair' },
  { key: 'flat_tire', label: 'Llanta ponchada', icon: 'tire_repair' },
  { key: 'road_block', label: 'Bloqueo vial', icon: 'block' },
  { key: 'other', label: 'Otro', icon: 'more_horiz' }
];

export const incidentSeverities = [
  { key: 'low', label: 'BAJA' },
  { key: 'medium', label: 'MEDIA' },
  { key: 'high', label: 'ALTA' }
];

export const maxIncidentPhotos = 3;

export const getIncidentTypeLabel = (key) => incidentTypes.find((type) => type.key === key)?.label || 'Otro';
export const getSeverityLabel = (key) => incidentSeverities.find((severity) => severity.key === key)?.label || key;

export function validateIncident({ type, severity, description, photos = [] }) {
  if (!incidentTypes.some((item) => item.key === type)) return 'Selecciona el tipo de incidencia';
  if (!incidentSeverities.some((item) => item.key === severity)) return 'Selecciona la gravedad';
  if (type === 'other' && !String(description || '').trim()) return 'Describe la incidencia';
  if (photos.length > maxIncidentPhotos) return `Máximo ${maxIncidentPhotos} fotos por incidencia`;
  return null;
}

const toNumber = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

export function validateFuelLoad({ liters, amount, ticketPhoto }) {
  const litersValue = toNumber(liters);
  if (!Number.isFinite(litersValue) || litersValue <= 0 || litersValue > 1000) return 'Registra los litros cargados (mayor a 0)';
  const amountValue = toNumber(amount);
  if (amountValue !== null && (!Number.isFinite(amountValue) || amountValue < 0)) return 'El importe no es válido';
  if (!ticketPhoto) return 'Captura la foto del ticket o de la bomba';
  return null;
}

/** Normalized values ready to queue; blank optional fields become null. */
export const normalizeFuelLoad = ({ liters, amount }) => ({
  liters: toNumber(liters),
  amount: toNumber(amount)
});
