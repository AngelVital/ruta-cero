import { inspectionItems, inspectionKeys } from '../../data/inspectionItems.js';
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
    return '<tr><td colspan="7">Sin incidencias reportadas.</td></tr>';
  }

  // Severity reuses the fill-level badge colors: low green, medium amber, high red.
  return incidents.map((incident, index) => `
    <tr>
      <td><time datetime="${escapeHtml(incident.created_at)}">${escapeHtml(formatReportDate(incident.created_at))}</time></td>
      <td><span class="admin-route-id">${escapeHtml(incident.unit_id || '—')}</span></td>
      <td>${escapeHtml(incident.route_id || '—')}</td>
      <td>${escapeHtml(getIncidentTypeLabel(incident.incident_type))}</td>
      <td><span class="admin-fill-level fill-${incident.severity === 'high' ? 'full' : escapeHtml(incident.severity)}">${escapeHtml(getSeverityLabel(incident.severity))}</span></td>
      <td>${escapeHtml(incident.description || '—')}</td>
      <td><button class="admin-report-open" type="button" data-incident-index="${index}">${icon('visibility')}<span>Ver detalles</span></button></td>
    </tr>
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

const countResults = (results, value) => inspectionKeys.filter((key) => results?.[key] === value).length;

export function renderInspectionRows(inspections) {
  if (!inspections.length) {
    return '<tr><td colspan="7">Todavía no hay inspecciones registradas.</td></tr>';
  }

  return inspections.map((inspection, index) => `
    <tr>
      <td><time datetime="${escapeHtml(inspection.created_at)}">${escapeHtml(formatReportDate(inspection.created_at))}</time></td>
      <td><span class="admin-route-id">${escapeHtml(inspection.unit_id || '—')}</span></td>
      <td>${escapeHtml(inspection.route_id || '—')}</td>
      <td>${escapeHtml(formatOptional(inspection.fuel_liters, (value) => `${numberFormatter.format(value)} L`))}</td>
      <td>${countResults(inspection.results, 'REGULAR')}</td>
      <td>${countResults(inspection.results, 'MAL')}</td>
      <td><button class="admin-report-open" type="button" data-inspection-index="${index}">${icon('fact_check')}<span>Ver inspección</span></button></td>
    </tr>
  `).join('');
}

function renderInspectionDetail(inspection) {
  return `
    <div class="admin-report-dialog-meta">
      ${renderCrewMeta(inspection)}
      <span>${icon('alt_route')} ${escapeHtml(inspection.route_id || 'Sin ruta')}</span>
      <time>${escapeHtml(formatReportDate(inspection.created_at))}</time>
    </div>
    <div class="admin-report-dialog-metrics">
      <div><span>Combustible al salir</span><strong>${escapeHtml(formatOptional(inspection.fuel_liters, (value) => `${numberFormatter.format(value)} L`))}</strong></div>
      <div><span>Puntos con falla</span><strong>${countResults(inspection.results, 'REGULAR') + countResults(inspection.results, 'MAL')} de ${inspectionKeys.length}</strong></div>
    </div>
    <div class="admin-report-dialog-sections">
      <section class="admin-report-dialog-section admin-report-comments-section">
        <h3>${icon('fact_check')} Puntos revisados</h3>
        ${inspectionItems.map(({ key, title }) => `
          <p><strong>${escapeHtml(title)}:</strong> ${escapeHtml(inspection.results?.[key] || 'Sin registro')}${inspection.comments?.[key] ? ` · ${escapeHtml(inspection.comments[key])}` : ''}</p>
        `).join('')}
      </section>
      <section class="admin-report-dialog-section admin-report-evidence-section">
        <h3>${icon('speed')} Odómetro</h3>
        <div class="admin-field-event-photos" id="admin-field-event-photos">Cargando foto…</div>
      </section>
    </div>
  `;
}

export function renderClosureRows(closures) {
  if (!closures.length) {
    return '<tr><td colspan="4">Todavía no hay cierres de ruta registrados.</td></tr>';
  }

  return closures.map((closure, index) => `
    <tr>
      <td><time datetime="${escapeHtml(closure.created_at)}">${escapeHtml(formatReportDate(closure.created_at))}</time></td>
      <td><span class="admin-route-id">${escapeHtml(closure.unit_id || '—')}</span></td>
      <td>${escapeHtml(closure.route_id || '—')}</td>
      <td><button class="admin-report-open" type="button" data-closure-index="${index}">${icon('photo_library')}<span>Ver fotos</span></button></td>
    </tr>
  `).join('');
}

function renderClosureDetail(closure) {
  return `
    <div class="admin-report-dialog-meta">
      ${renderCrewMeta(closure)}
      <span>${icon('alt_route')} ${escapeHtml(closure.route_id || 'Sin ruta')}</span>
      <time>${escapeHtml(formatReportDate(closure.created_at))}</time>
    </div>
    <div class="admin-report-dialog-sections">
      <section class="admin-report-dialog-section admin-report-evidence-section">
        <h3>${icon('photo_camera')} Evidencia de regreso</h3>
        <div class="admin-field-event-photos" id="admin-field-event-photos">Cargando fotos…</div>
      </section>
    </div>
  `;
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

/** Re-renders the incident list, the fuel and inspection tables and their counters. */
export function updateFieldEvents(ctx) {
  const { container, incidents, fuelLoads, inspections, closures } = ctx;
  container.querySelector('#admin-closure-rows').innerHTML = renderClosureRows(closures);
  container.querySelector('#admin-closure-count').textContent = String(closures.length);
  container.querySelector('#admin-incident-rows').innerHTML = renderIncidentRows(incidents);
  container.querySelector('#admin-fuel-rows').innerHTML = renderFuelRows(fuelLoads);
  container.querySelector('#admin-fuel-count').textContent = String(fuelLoads.length);
  container.querySelector('#admin-inspection-rows').innerHTML = renderInspectionRows(inspections);
  container.querySelector('#admin-inspection-count').textContent = String(inspections.length);
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
        // Only images captured by the field app (inline or signed Storage URLs) are rendered.
        .filter((photo) => typeof photo === 'string' && /^(data:image\/|https?:\/\/)/.test(photo));
      photosEl.innerHTML = photos.length
        ? photos.map((photo, index) => `<img src="${escapeHtml(photo)}" alt="Evidencia ${index + 1}">`).join('')
        : 'Sin fotos.';
    } catch (error) {
      photosEl.textContent = `No se pudieron cargar las fotos: ${error.message}`;
    }
  };

  ctx.openIncident = (incident) => incident && open('incident_reports', incident,
    `INCIDENCIA · GRAVEDAD ${getSeverityLabel(incident.severity)}`, getIncidentTypeLabel(incident.incident_type), renderIncidentDetail);
  ctx.openFuelLoad = (load) => open('fuel_loads', load, 'CARGA DE COMBUSTIBLE', 'Detalle de la carga', renderFuelDetail);

  container.querySelector('#admin-incident-rows')?.addEventListener('click', (event) => {
    const row = event.target.closest('[data-incident-index]');
    if (row) ctx.openIncident(ctx.incidents[Number(row.dataset.incidentIndex)]);
  });

  container.querySelector('#admin-fuel-rows')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-fuel-index]');
    if (button) ctx.openFuelLoad(ctx.fuelLoads[Number(button.dataset.fuelIndex)]);
  });

  container.querySelector('#admin-inspection-rows')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-inspection-index]');
    if (button) {
      open('dispatch_inspections', ctx.inspections[Number(button.dataset.inspectionIndex)], 'INSPECCIÓN 360° · DESPACHO', 'Detalle de la inspección', renderInspectionDetail);
    }
  });

  container.querySelector('#admin-closure-rows')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-closure-index]');
    if (button) {
      open('route_completions', ctx.closures[Number(button.dataset.closureIndex)], 'CIERRE DE RUTA', 'Evidencia de cierre', renderClosureDetail);
    }
  });

  dialog?.querySelector('.admin-report-dialog-close')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
