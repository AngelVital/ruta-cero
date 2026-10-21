import { getPeriodRange, summarizeReports } from '../../domain/route.js';
import { getOperationalDate } from '../../services/routeConfiguration.js';
import { escapeHtml, icon } from '../../utils/html.js';
import { formatMaterialLabel, formatMonthTitle, formatReportWeight, formatScheduledDate, parseDateKey } from './format.js';

const periodTitles = {
  day: (range) => `Resumen del ${range}`,
  week: (range) => `Semana del ${range}`,
  month: (range, start) => formatMonthTitle(parseDateKey(start)).replace(/^./, (first) => first.toLocaleUpperCase('es-MX')),
  range: (range) => range
};

export function renderSummary(reports, start, end, period = 'range') {
  const summary = summarizeReports(reports, start, end);
  const range = summary.start === summary.end
    ? formatScheduledDate(summary.start)
    : `${formatScheduledDate(summary.start)} – ${formatScheduledDate(summary.end)}`;
  const title = periodTitles[period](range, summary.start);
  const materialItems = Object.entries(summary.materials)
    .sort(([, a], [, b]) => b - a)
    .map(([material, kg]) => `
      <li><span>${escapeHtml(formatMaterialLabel(material))}</span><strong>${escapeHtml(formatReportWeight(kg))}</strong></li>
    `).join('') || '<li class="admin-report-empty-item">Sin materiales registrados en este periodo</li>';

  return `
    <div class="admin-report-dialog-meta"><span>${icon('date_range')} ${escapeHtml(title)}</span>${period === 'month' ? `<span>${escapeHtml(range)}</span>` : ''}</div>
    <div class="admin-report-dialog-metrics">
      <div><span>Material recolectado</span><strong>${escapeHtml(formatReportWeight(summary.totalKg))}</strong></div>
      <div><span>Reportes</span><strong>${summary.reports.length}</strong></div>
      <div><span>Contenedores atendidos</span><strong>${summary.containers}</strong></div>
    </div>
    <div class="admin-report-dialog-sections">
      <section class="admin-report-dialog-section">
        <h3>${icon('recycling')} Peso por material</h3>
        <ul class="admin-report-material-list">${materialItems}</ul>
      </section>
    </div>
  `;
}

export function renderSummaryDialogShell() {
  return `
    <dialog class="admin-report-dialog" id="admin-summary-dialog" aria-labelledby="admin-summary-dialog-title">
      <header class="admin-report-dialog-header">
        <div><div class="admin-section-kicker">REPORTES DE CONTENEDORES</div><h2 id="admin-summary-dialog-title">Resumen de recolección</h2></div>
        <div class="admin-report-actions">
          <button class="admin-button" type="button" id="admin-summary-pdf">${icon('picture_as_pdf')}<span>Exportar PDF</span></button>
          <button class="admin-report-dialog-close" type="button" aria-label="Cerrar resumen">${icon('close')}</button>
        </div>
      </header>
      <div class="admin-table-toolbar">
        <label class="admin-filter-select"><span class="sr-only">Periodo</span><select id="admin-summary-period"><option value="day">Diario</option><option value="week">Semanal</option><option value="month">Mensual</option><option value="range">Personalizado</option></select>${icon('expand_more')}</label>
        <label class="admin-search">${icon('calendar_today')}<span id="admin-summary-date-label">Fecha</span><input type="date" id="admin-summary-date"></label>
        <label class="admin-search" id="admin-summary-end-wrap" hidden>${icon('event')}<span>Final</span><input type="date" id="admin-summary-end"></label>
      </div>
      <div class="admin-report-dialog-content" id="admin-summary-content"></div>
    </dialog>
  `;
}

/** "Generar resumen": daily, Monday–Sunday, calendar-month or custom-range totals from the loaded report history. */
export function attachSummary(ctx) {
  const { container } = ctx;
  const dialog = container.querySelector('#admin-summary-dialog');
  const period = container.querySelector('#admin-summary-period');
  const date = container.querySelector('#admin-summary-date');
  const endDate = container.querySelector('#admin-summary-end');
  if (!dialog) return;

  const update = () => {
    const isRange = period.value === 'range';
    container.querySelector('#admin-summary-end-wrap').hidden = !isRange;
    container.querySelector('#admin-summary-date-label').textContent = isRange ? 'Inicio' : 'Fecha';
    const dateKey = date.value || getOperationalDate();
    // ISO date keys compare as strings; sort so a reversed selection still works.
    const [start, end] = isRange
      ? [dateKey, endDate.value || dateKey].sort()
      : getPeriodRange(period.value, dateKey);
    container.querySelector('#admin-summary-content').innerHTML = renderSummary(ctx.reports, start, end, period.value);
  };

  container.querySelector('#btn-generate-summary')?.addEventListener('click', () => {
    if (!date.value) date.value = getOperationalDate();
    if (!endDate.value) endDate.value = date.value;
    update();
    dialog.showModal();
  });
  period.addEventListener('change', update);
  date.addEventListener('change', update);
  endDate.addEventListener('change', update);
  // The print dialog's "Guardar como PDF" produces the file; print CSS hides everything but the summary.
  container.querySelector('#admin-summary-pdf').addEventListener('click', () => {
    const pageTitle = document.title;
    document.title = `Resumen Ruta Cero ${container.querySelector('#admin-summary-content .admin-report-dialog-meta span').textContent.trim()}`;
    document.body.classList.add('is-printing-summary');
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('is-printing-summary');
      document.title = pageTitle;
    }, { once: true });
    window.print();
  });
  dialog.querySelector('.admin-report-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
