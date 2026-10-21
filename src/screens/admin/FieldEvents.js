import { getIncidentTypeLabel, getSeverityLabel } from '../../domain/fieldEvents.js';
import { escapeHtml, icon } from '../../utils/html.js';
import { formatReportDate, renderCrewMeta } from './format.js';

const moneyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const numberFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

const formatOptional = (value, format) => (value === null || value === undefined ? '—' : format(Number(value)));

function renderMapLink({ latitude, longitude }) {
  return latitude !== null && longitude !== null
    ? `<a class="admin-text-link" href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank" rel="noopener noreferrer">${icon('location_on')}<span>Ver ubicación</span></a>`
    : '<span>Sin ubicación GPS</span>';
}

export function renderIncidentRows(incidents) {
  if (!incidents.length) {
    return '<p class="admin-field-events-empty">Sin incidencias reportadas.</p>';
  }

  return incidents.map((incident, index) => `
    <button type="button" class="admin-alert-row ${incident.severity === 'high' ? 'alert-row-critical' : 'alert-row-sync'}" data-incident-index="${index}">
      <span class="admin-alert-icon">${icon(incident.severity === 'high' ? 'emergency' : 'report')}</span>
      <span class="admin-alert-copy">
        <strong>${escapeHtml(getIncidentTypeLabel(incident.incident_type))} · Gravedad ${escapeHtml(getSeverityLabel(incident.severity))}</strong>
        <p>${escapeHtml([incident.unit_id, incident.route_id, incident.description].filter(Boolean).join(' · '))}</p>
      </span>
      <time datetime="${escapeHtml(incident.created_at)}">${escapeHtml(formatReportDate(incident.created_at))}</time>
    </button>
  `).join('');
}

export function renderFuelRows(fuelLoads) {
  if (!fuelLoads.length) {
    return '<tr><td colspan="7">Todavía no hay cargas registradas.</td></tr>';
  }

  return fuelLoads.map((load, index) => `
    <tr>
      <td><time datetime="${escapeHtml(load.created_at)}">${escapeHtml(formatReportDate(load.created_at))}</time></td>
      <td><span class="admin-route-id">${escapeHtml(load.unit_id || '—')}</span></td>
      <td>${escapeHtml(load.route_id || '—')}</td>
      <td>${escapeHtml(numberFormatter.format(Number(load.liters)))} L</td>
      <td>${escapeHtml(formatOptional(load.amount, (value) => moneyFormatter.format(value)))}</td>
      <td>${escapeHtml(formatOptional(load.odometer_km, (value) => `${numberFormatter.format(value)} km`))}</td>
      <td><button class="admin-report-open" type="button" data-fuel-index="${index}">${icon('receipt_long')}<span>Ver ticket</span></button></td>
    </tr>
  `).join('');
}

export function renderFieldEventDialogShell() {
  return `
    <dialog class="admin-report-dialog" id="admin-field-event-dialog" aria-labelledby="admin-field-event-title">
      <header class="admin-report-dialog-header">
        <div><div class="admin-section-kicker" id="admin-field-event-kicker"></div><h2 id="admin-field-event-title"></h2></div>
        <button class="admin-report-dialog-close" type="button" aria-label="Cerrar detalles">${icon('close')}</button>
      </header>
      <div class="admin-report-dialog-content" id="admin-field-event-content"></div>
    </dialog>
  `;
}

function renderIncidentDetail(incident) {
  return `
    <div class="admin-report-dialog-meta">
      ${renderCrewMeta(incident)}
      <span>${icon('alt_route')} ${escapeHtml(incident.route_id || 'Sin ruta')}</span>
      ${incident.stop_id ? `<span>${icon('inventory_2')} ${escapeHtml(incident.stop_id)}</span>` : ''}
      <time>${escapeHtml(formatReportDate(incident.created_at))}</time>
    </div>
    <div class="admin-report-dialog-sections">
      <section class="admin-report-dialog-section admin-report-comments-section">
        <h3>${icon('chat')} Descripción</h3>
        <p>${escapeHtml(incident.description || 'Sin descripción')}</p>
        <p>${renderMapLink(incident)}</p>
      </section>
      <section class="admin-report-dialog-section admin-report-evidence-section">
        <h3>${icon('photo_camera')} Evidencia</h3>
        <div class="admin-field-event-photos" id="admin-field-event-photos">Cargando fotos…</div>
      </section>
    </div>
  `;
}

function renderFuelDetail(load) {
  return `
    <div class="admin-report-dialog-meta">
      ${renderCrewMeta(load)}
      <span>${icon('alt_route')} ${escapeHtml(load.route_id || 'Sin ruta')}</span>
      <time>${escapeHtml(formatReportDate(load.created_at))}</time>
    </div>
    <div class="admin-report-dialog-metrics">
      <div><span>Litros cargados</span><strong>${escapeHtml(numberFormatter.format(Number(load.liters)))} L</strong></div>
      <div><span>Importe</span><strong>${escapeHtml(formatOptional(load.amount, (value) => moneyFormatter.format(value)))}</strong></div>
    </div>
    <div class="admin-report-dialog-sections">
      <section class="admin-report-dialog-section admin-report-comments-section">
        <h3>${icon('speed')} Odómetro</h3>
        <p>${escapeHtml(formatOptional(load.odometer_km, (value) => `${numberFormatter.format(value)} km`))}</p>
        <p>${renderMapLink(load)}</p>
      </section>
      <section class="admin-report-dialog-section admin-report-evidence-section">
        <h3>${icon('receipt_long')} Ticket</h3>
        <div class="admin-field-event-photos" id="admin-field-event-photos">Cargando foto…</div>
      </section>
    </div>
  `;
}

/** Re-renders the incident list, the fuel table and their counters. */
export function updateFieldEvents(ctx) {
  const { container, incidents, fuelLoads } = ctx;
  container.querySelector('#admin-incident-rows').innerHTML = renderIncidentRows(incidents);
  container.querySelector('#admin-fuel-rows').innerHTML = renderFuelRows(fuelLoads);
  container.querySelector('#admin-fuel-count').textContent = String(fuelLoads.length);
  const highSeverity = String(incidents.filter((incident) => incident.severity === 'high').length);
  container.querySelectorAll('[data-incident-count]').forEach((counter) => {
    counter.textContent = String(incidents.length);
  });
  container.querySelector('#admin-incident-critical-count').textContent = highSeverity;
}

/** Incident list and fuel table: opening a row shows its detail and loads its photos. */
export function attachFieldEvents(ctx, { fetchPhotos }) {
  const { container } = ctx;
  const dialog = container.querySelector('#admin-field-event-dialog');

  const open = async (table, record, kicker, title, renderDetail) => {
    if (!record || !dialog) return;
    container.querySelector('#admin-field-event-kicker').textContent = kicker;
    container.querySelector('#admin-field-event-title').textContent = title;
    container.querySelector('#admin-field-event-content').innerHTML = renderDetail(record);
    dialog.showModal();

    const photosEl = container.querySelector('#admin-field-event-photos');
    try {
      const photos = (await fetchPhotos(table, record.id))
        // Only images captured by the field app are rendered.
        .filter((photo) => typeof photo === 'string' && photo.startsWith('data:image/'));
      photosEl.innerHTML = photos.length
        ? photos.map((photo, index) => `<img src="${escapeHtml(photo)}" alt="Evidencia ${index + 1}">`).join('')
        : 'Sin fotos.';
    } catch (error) {
      photosEl.textContent = `No se pudieron cargar las fotos: ${error.message}`;
    }
  };

  container.querySelector('#admin-incident-rows')?.addEventListener('click', (event) => {
    const row = event.target.closest('[data-incident-index]');
    const incident = row && ctx.incidents[Number(row.dataset.incidentIndex)];
    if (incident) {
      open('incident_reports', incident, `INCIDENCIA · GRAVEDAD ${getSeverityLabel(incident.severity)}`,
        getIncidentTypeLabel(incident.incident_type), renderIncidentDetail);
    }
  });

  container.querySelector('#admin-fuel-rows')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-fuel-index]');
    if (button) {
      open('fuel_loads', ctx.fuelLoads[Number(button.dataset.fuelIndex)], 'CARGA DE COMBUSTIBLE', 'Detalle de la carga', renderFuelDetail);
    }
  });

  dialog?.querySelector('.admin-report-dialog-close')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
