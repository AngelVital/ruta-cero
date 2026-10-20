import { getFillLevelLabel, normalizeFillLevel } from '../../components/CapacityMeter.js';
import { getActiveIncidents } from '../../domain/report.js';
import { getReportsForDate } from '../../domain/route.js';
import { getOperationalDate } from '../../services/routeConfiguration.js';
import { escapeHtml, icon } from '../../utils/html.js';
import { formatIncidentLabel, formatReportDate, formatReportLabel, formatReportWeight } from './format.js';

const evidenceLabels = {
  initialExterior: 'Exterior inicial',
  initialInterior: 'Interior inicial',
  finalExterior: 'Exterior final',
  finalInterior: 'Interior final'
};

export function renderReportRows(reports) {
  if (!reports.length) {
    return '<tr><td colspan="8">Todavía no hay reportes registrados.</td></tr>';
  }

  return reports.map((report, index) => {
    const materials = Array.isArray(report.materials) ? report.materials.join(', ') : '';
    const fillLevel = normalizeFillLevel(report.fill_level);
    const incidents = getActiveIncidents(report.incidents).map(formatIncidentLabel);

    return `
      <tr>
        <td><time datetime="${escapeHtml(report.created_at)}">${escapeHtml(formatReportDate(report.created_at))}</time></td>
        <td><span class="admin-route-id">${escapeHtml(report.container_id)}</span></td>
        <td>${escapeHtml(report.route_id)}</td>
        <td><span class="admin-fill-level fill-${fillLevel || 'unknown'}">${escapeHtml(getFillLevelLabel(fillLevel))}</span></td>
        <td>${escapeHtml(report.collected_kg)} kg</td>
        <td>${escapeHtml(materials || 'Sin material')}</td>
        <td>${escapeHtml(incidents.join(', ') || 'Ninguna')}</td>
        <td><button class="admin-report-open" type="button" data-report-index="${index}">${icon('visibility')}<span>Ver detalles</span></button></td>
      </tr>
    `;
  }).join('');
}

export function renderReportDialog(report) {
  const fillLevel = normalizeFillLevel(report.fill_level);
  const materials = Array.isArray(report.materials) ? report.materials : [];
  const materialWeights = report.material_weights && typeof report.material_weights === 'object'
    ? report.material_weights
    : {};
  const materialItems = materials.length
    ? materials.map((material) => `
        <li><span>${escapeHtml(formatReportLabel(material))}</span><strong>${escapeHtml(formatReportWeight(materialWeights[material]))}</strong></li>
      `).join('')
    : '<li class="admin-report-empty-item">Sin materiales registrados</li>';
  const incidents = getActiveIncidents(report.incidents).map(formatIncidentLabel);
  const incidentItems = incidents.length
    ? incidents.map((name) => `<li>${escapeHtml(name)}</li>`).join('')
    : '<li class="admin-report-empty-item">Sin incidencias</li>';
  const evidence = report.photo_evidence && typeof report.photo_evidence === 'object'
    ? report.photo_evidence
    : {};
  const evidenceItems = Object.keys(evidence).length
    ? Object.entries(evidence).map(([key, value]) => `
        <li><span class="admin-evidence-check">${icon('check')}</span><span>${escapeHtml(evidenceLabels[key] || formatReportLabel(key))}</span><time>${escapeHtml(formatReportDate(value))}</time></li>
      `).join('')
    : '<li class="admin-report-empty-item">Sin evidencia registrada</li>';

  return `
    <div class="admin-report-dialog-meta">
      <span>${icon('inventory_2')} ${escapeHtml(report.container_id)}</span>
      <span>${icon('alt_route')} ${escapeHtml(report.route_id)}</span>
      <time>${escapeHtml(formatReportDate(report.created_at))}</time>
    </div>
    <div class="admin-report-dialog-metrics">
      <div class="admin-report-fill-metric"><span>Nivel del contenedor</span><strong class="admin-fill-level fill-${fillLevel || 'unknown'}">${escapeHtml(getFillLevelLabel(fillLevel))}</strong></div>
      <div><span>Material recolectado</span><strong>${escapeHtml(formatReportWeight(report.collected_kg))}</strong></div>
    </div>
    <div class="admin-report-dialog-sections">
      <section class="admin-report-dialog-section">
        <h3>${icon('recycling')} Materiales</h3>
        <ul class="admin-report-material-list">${materialItems}</ul>
      </section>
      <section class="admin-report-dialog-section">
        <h3>${icon('report_problem')} Incidencias</h3>
        <ul class="admin-report-incident-list">${incidentItems}</ul>
      </section>
      <section class="admin-report-dialog-section admin-report-evidence-section">
        <h3>${icon('photo_camera')} Evidencia registrada</h3>
        <ul class="admin-report-evidence-list">${evidenceItems}</ul>
      </section>
      <section class="admin-report-dialog-section admin-report-comments-section">
        <h3>${icon('chat')} Comentarios</h3>
        <p>${escapeHtml(report.incident_comments || 'Sin comentarios')}</p>
      </section>
    </div>
  `;
}

export function renderReportDialogShell() {
  return `
    <dialog class="admin-report-dialog" id="admin-report-dialog" aria-labelledby="admin-report-dialog-title">
      <header class="admin-report-dialog-header">
        <div><div class="admin-section-kicker">REGISTRO DE RECOLECCIÓN</div><h2 id="admin-report-dialog-title">Detalle del reporte</h2></div>
        <button class="admin-report-dialog-close" type="button" aria-label="Cerrar detalles">${icon('close')}</button>
      </header>
      <div class="admin-report-dialog-content" id="admin-report-dialog-content"></div>
    </dialog>
  `;
}

/** Shows today's reports or the full history, depending on the "Ver todos" toggle. */
export function updateReportList(ctx) {
  const { container } = ctx;
  ctx.visibleReports = ctx.showAllReports ? ctx.reports : getReportsForDate(ctx.reports, getOperationalDate());
  container.querySelector('#admin-report-rows').innerHTML = renderReportRows(ctx.visibleReports);
  container.querySelector('#admin-report-count').textContent = String(ctx.visibleReports.length);
  const toggleButton = container.querySelector('#admin-toggle-all-reports');
  toggleButton.querySelector('span:last-child').textContent = ctx.showAllReports ? 'Ver solo hoy' : 'Ver todos';
  toggleButton.querySelector('.material-symbols-outlined').textContent = ctx.showAllReports ? 'today' : 'list';
}

/** Report table, detail dialog, "Ver todos" toggle and manual refresh. */
export function attachReports(ctx, { refresh }) {
  const { container } = ctx;
  const reportDialog = container.querySelector('#admin-report-dialog');

  ctx.openReport = (report) => {
    if (!report || !reportDialog) return;
    container.querySelector('#admin-report-dialog-content').innerHTML = renderReportDialog(report);
    reportDialog.showModal();
  };

  container.querySelector('#admin-report-rows')?.addEventListener('click', (event) => {
    const button = event.target.closest('.admin-report-open');
    if (!button) return;
    ctx.openReport(ctx.visibleReports[Number(button.dataset.reportIndex)]);
  });

  container.querySelector('.admin-report-dialog-close')?.addEventListener('click', () => reportDialog?.close());
  reportDialog?.addEventListener('click', (event) => {
    if (event.target === reportDialog) reportDialog.close();
  });

  container.querySelector('#admin-refresh-reports')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const message = container.querySelector('#admin-report-message');
    button.disabled = true;
    if (message) message.textContent = 'Actualizando reportes…';
    await refresh(true);
  });

  container.querySelector('#admin-toggle-all-reports')?.addEventListener('click', () => {
    ctx.showAllReports = !ctx.showAllReports;
    updateReportList(ctx);
  });
}
