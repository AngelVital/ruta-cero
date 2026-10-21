import { collectionPoints } from '../../data/collectionPoints.js';
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

const issuedFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mazatlan' });
const percentFormatter = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 });
const pointNames = Object.fromEntries(collectionPoints.map((point) => [point.id, point.name]));

export function renderSummary(reports, start, end, period = 'range') {
  const summary = summarizeReports(reports, start, end);
  const range = summary.start === summary.end
    ? formatScheduledDate(summary.start)
    : `${formatScheduledDate(summary.start)} – ${formatScheduledDate(summary.end)}`;
  const title = periodTitles[period](range, summary.start);
  const materials = Object.entries(summary.materials).sort(([, a], [, b]) => b - a);
  const materialKg = materials.reduce((sum, [, kg]) => sum + kg, 0);
  const materialRows = materials.map(([material, kg]) => `
      <tr><td>${escapeHtml(formatMaterialLabel(material))}</td><td class="num">${escapeHtml(formatReportWeight(kg))}</td><td class="num">${percentFormatter.format(kg / materialKg)}</td></tr>
    `).join('') || '<tr><td colspan="3">Sin materiales registrados en este periodo.</td></tr>';
  const containerRows = Object.entries(summary.byContainer)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, { reports: count, kg }]) => `
      <tr><td>${escapeHtml(id)}</td><td>${escapeHtml(pointNames[id] || '—')}</td><td class="num">${count}</td><td class="num">${escapeHtml(formatReportWeight(kg))}</td></tr>
    `).join('') || '<tr><td colspan="4">Sin contenedores atendidos en este periodo.</td></tr>';

  return `
    <article class="summary-doc">
      <header class="summary-doc-header">
        <div><strong>RUTA CERO</strong><span>Coordinación de recolección de residuos reciclables</span></div>
        <div class="summary-doc-issued"><span>Fecha de emisión</span><strong>${escapeHtml(issuedFormatter.format(new Date()))}</strong></div>
      </header>

      <h1 class="summary-doc-title">Resumen de recolección</h1>
      <p class="summary-doc-period" data-summary-title>${escapeHtml(title)}</p>
      <p class="summary-doc-range">Periodo: ${escapeHtml(range)}</p>

      <section>
        <h2>1. Indicadores generales</h2>
        <table class="summary-doc-table">
          <tbody>
            <tr><th scope="row">Material recolectado</th><td class="num">${escapeHtml(formatReportWeight(summary.totalKg))}</td></tr>
            <tr><th scope="row">Reportes registrados</th><td class="num">${summary.reports.length}</td></tr>
            <tr><th scope="row">Contenedores atendidos</th><td class="num">${summary.containers}</td></tr>
            <tr><th scope="row">Rutas con actividad</th><td class="num">${summary.routes}</td></tr>
            <tr><th scope="row">Días con recolección</th><td class="num">${summary.days}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>2. Peso por material</h2>
        <table class="summary-doc-table">
          <thead><tr><th scope="col">Material</th><th scope="col" class="num">Peso</th><th scope="col" class="num">% del total</th></tr></thead>
          <tbody>${materialRows}</tbody>
          <tfoot><tr><th scope="row">Total</th><td class="num">${escapeHtml(formatReportWeight(materialKg))}</td><td class="num">${materialKg ? percentFormatter.format(1) : '—'}</td></tr></tfoot>
        </table>
      </section>

      <section>
        <h2>3. Recolección por contenedor</h2>
        <table class="summary-doc-table">
          <thead><tr><th scope="col">Contenedor</th><th scope="col">Punto</th><th scope="col" class="num">Reportes</th><th scope="col" class="num">Peso</th></tr></thead>
          <tbody>${containerRows}</tbody>
          <tfoot><tr><th scope="row" colspan="2">Total</th><td class="num">${summary.reports.length}</td><td class="num">${escapeHtml(formatReportWeight(summary.totalKg))}</td></tr></tfoot>
        </table>
      </section>

      <footer class="summary-doc-signatures">
        <div><span></span>Elaboró</div>
        <div><span></span>Revisó</div>
      </footer>
      <p class="summary-doc-note">Datos obtenidos de los reportes de contenedores registrados por el equipo de campo.</p>
    </article>
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
    document.title = `Resumen Ruta Cero ${container.querySelector('[data-summary-title]').textContent}`;
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
