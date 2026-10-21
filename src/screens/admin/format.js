import { escapeHtml, icon } from '../../utils/html.js';

// Intl formatters are created once per module instead of once per row or calendar cell.
const shortDateFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const reportDateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
});
const operationalTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mazatlan'
});
const monthTitleFormatter = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
const longDateFormatter = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});
const weightFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

const materialLabels = { plastico: 'Plástico', carton: 'Cartón', papel: 'Papel' };

const incidentLabels = {
  damaged: 'Contenedor dañado',
  graffiti: 'Grafiti / vandalismo',
  outsideWaste: 'Residuos fuera del contenedor',
  mixedWaste: 'Residuos mezclados'
};

/** 'YYYY-MM-DD' → "08 oct 2026". */
export function formatScheduledDate(date) {
  if (!date) return 'Sin programar';
  const [year, month, day] = date.split('-').map(Number);
  return shortDateFormatter.format(new Date(year, month - 1, day));
}

export function formatReportDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return reportDateFormatter.format(date);
}

/** HH:mm in the operational time zone (La Paz). */
export const formatOperationalTime = (value) => operationalTimeFormatter.format(new Date(value));
export const formatMonthTitle = (date) => monthTitleFormatter.format(date);
export const formatLongDate = (date) => longDateFormatter.format(date);

export function formatReportWeight(value) {
  const weight = Number(value);
  return Number.isFinite(weight)
    ? `${weightFormatter.format(weight)} kg`
    : 'Peso no especificado';
}

/** "outsideWaste" / "outside_waste" → "Outside waste". */
export function formatReportLabel(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (first) => first.toLocaleUpperCase('es-MX'));
}

export const formatMaterialLabel = (value) => materialLabels[value] || formatReportLabel(value);

export function formatIncidentLabel(value) {
  return incidentLabels[value] || formatReportLabel(value);
}

/** First day (at noon, to avoid DST edges) of the month of a 'YYYY-MM-DD' key. */
export function parseDateKey(dateKey) {
  const [year, month] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, 1, 12);
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Unit, driver and assistant ids a field report was sent with, for the detail dialogs. */
export function renderCrewMeta(record) {
  return [
    ['local_shipping', record.unit_id, 'Sin unidad'],
    ['badge', record.driver_id, 'Sin operador'],
    ['group', record.assistant_id, 'Sin auxiliar']
  ].map(([name, id, empty]) => `<span>${icon(name)} ${escapeHtml(id || empty)}</span>`).join('');
}
