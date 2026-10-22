import { collectionPoints } from '../../data/collectionPoints.js';
import { getActiveIncidents } from '../../domain/report.js';
import { filterReportsByMaterial, getKgByDay, getPeriodRange, summarizeReports } from '../../domain/route.js';
import { getOperationalDate } from '../../services/routeConfiguration.js';
import { escapeHtml, icon } from '../../utils/html.js';
import { formatIncidentLabel, formatMaterialLabel, formatMonthTitle, formatReportWeight, formatScheduledDate, parseDateKey } from './format.js';

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
      <tr><td>${swatch(material)}${escapeHtml(formatMaterialLabel(material))}</td><td class="num">${escapeHtml(formatReportWeight(kg))}</td><td class="num">${percentFormatter.format(kg / materialKg)}</td></tr>
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
        <div class="summary-doc-chart">
        ${materialKg ? `
          <div class="board-donut">
            ${renderDonutSvg(materials.filter(([, kg]) => kg > 0), materialKg, '', false, true)}
            <div class="board-donut-center"><span>Total</span><strong>${escapeHtml(formatReportWeight(materialKg))}</strong></div>
          </div>` : ''}
        <table class="summary-doc-table">
          <thead><tr><th scope="col">Material</th><th scope="col" class="num">Peso</th><th scope="col" class="num">% del total</th></tr></thead>
          <tbody>${materialRows}</tbody>
          <tfoot><tr><th scope="row">Total</th><td class="num">${escapeHtml(formatReportWeight(materialKg))}</td><td class="num">${materialKg ? percentFormatter.format(1) : '—'}</td></tr></tfoot>
        </table>
        </div>
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

// 'sv-SE' formats as "YYYY-MM-DD HH:mm:ss", which Power BI and Excel parse as a datetime.
const csvDateTimeFormatter = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Mazatlan' });
const csvCell = (value) => {
  // A leading = + - @ makes spreadsheets run the text as a formula.
  const text = typeof value === 'string' ? value.replace(/^[=+\-@]/, "'$&") : String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Flat table for Power BI and similar tools: one row per material of each report in the period, kg in plain numbers. */
export function buildSummaryCsv(reports, start, end) {
  const header = ['reporte_id', 'fecha', 'fecha_hora', 'contenedor', 'punto', 'ruta', 'unidad', 'operador', 'auxiliar', 'nivel_llenado', 'material', 'kg', 'incidencias', 'comentarios'];
  const rows = summarizeReports(reports, start, end).reports.flatMap((report) => {
    const base = [
      report.id,
      getOperationalDate(new Date(report.created_at)),
      csvDateTimeFormatter.format(new Date(report.created_at)),
      report.container_id,
      pointNames[report.container_id] || '',
      report.route_id,
      report.unit_id,
      report.driver_id,
      report.assistant_id,
      report.fill_level
    ];
    const tail = [getActiveIncidents(report.incidents).map(formatIncidentLabel).join('; '), report.incident_comments];
    const materials = Array.isArray(report.materials) ? report.materials : [];
    // A report without materials keeps one row so report counts and its kg still add up.
    return materials.length
      ? materials.map((material) => [...base, formatMaterialLabel(material), Number(report.material_weights?.[material]) || 0, ...tail])
      : [[...base, '', Number(report.collected_kg) || 0, ...tail]];
  });
  // The BOM makes Excel read the file as UTF-8 (accents).
  return `﻿${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

const percentOf = (value, max) => (max ? (value / max) * 100 : 0);

// Color follows the material, never its rank, so filtering or a new period doesn't repaint slices.
const materialOrder = ['plastico', 'carton', 'papel'];
// shortcut: any material outside materialOrder shares slot 4, add it to materialOrder if the field app gains one.
const materialSlot = (name) => (materialOrder.indexOf(name) + 1) || 4;

const byMaterialSlot = ([a], [b]) => materialSlot(a) - materialSlot(b) || a.localeCompare(b);
const stackSegments = (kgs) => Object.entries(kgs).filter(([, value]) => value > 0).sort(byMaterialSlot);
const swatch = (name) => `<i class="board-swatch" style="background: var(--mat-${materialSlot(name)})"></i>`;

/** Color key for the stacked charts; a single material needs none (the chart title names it). */
function renderMaterialLegend(kgByMaterial) {
  const names = Object.keys(kgByMaterial).map((name) => [name]).sort(byMaterialSlot);
  return names.length > 1
    ? `<p class="board-legend">${names.map(([name]) => `<span>${swatch(name)}${escapeHtml(formatMaterialLabel(name))}</span>`).join('')}</p>`
    : '';
}

/** Horizontal bar split by material, its length relative to maxKg. */
function renderMaterialBar(kgs, maxKg) {
  return `<span class="board-track board-stack">${stackSegments(kgs).map(([name, value]) => `<span
    style="width: ${percentOf(value, maxKg)}%; background: var(--mat-${materialSlot(name)})" title="${escapeHtml(`${formatMaterialLabel(name)}: ${formatReportWeight(value)}`)}"></span>`).join('')}</span>`;
}

/** One column per day (from getKgByDay), stacked by material, with the date axis below. */
function renderDayChart(days, start, end) {
  const maxDayKg = Math.max(0, ...days.map(([, kg]) => kg));
  const columns = days.map(([day, kg, kgs], index) => {
    const segments = stackSegments(kgs);
    const tip = `${formatScheduledDate(day)} · ${formatReportWeight(kg)}${segments.length > 1 ? ` (${segments.map(([name, value]) => `${formatMaterialLabel(name)} ${formatReportWeight(value)}`).join(', ')})` : ''}`;
    // Tooltips near the chart's edges grow inward so the dialog doesn't clip them.
    const align = index < days.length / 3 ? 'start' : index >= (days.length * 2) / 3 ? 'end' : 'center';
    // Segments share the column's height in proportion to their kg (flex-grow); the column keeps its height per day.
    return `
    <div class="board-col" tabindex="0" role="img" aria-label="${escapeHtml(tip)}" data-tip="${escapeHtml(tip)}" data-tip-align="${align}">
      <span class="board-col-stack" style="height: ${percentOf(kg, maxDayKg)}%">${segments.map(([name, value]) => `<span style="flex-grow: ${value}; background: var(--mat-${materialSlot(name)})"></span>`).join('')}</span>
    </div>
  `;
  }).join('');
  return `
    <div class="board-columns" style="--days: ${days.length}">${columns}</div>
    <div class="board-axis"><span>${escapeHtml(formatScheduledDate(start))}</span><span>Máximo: ${escapeHtml(formatReportWeight(maxDayKg))}</span><span>${escapeHtml(formatScheduledDate(end))}</span></div>
  `;
}

/** Donut slices as SVG; only the board's copy is interactive (the document's would change the board filter on click). */
function renderDonutSvg(materials, total, selected = '', interactive = false, labels = false) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const gap = materials.length > 1 ? 1.5 : 0;
  // Percentages sit outside the ring, at each slice's middle angle (clockwise from 12 o'clock); slivers under 4% are left to the table.
  let labelOffset = 0;
  const percentLabels = labels ? materials.map(([, kg]) => {
    const share = kg / total;
    const angle = (labelOffset + share / 2) * 2 * Math.PI - Math.PI / 2;
    labelOffset += share;
    const [x, y] = [Math.cos(angle), Math.sin(angle)];
    // Text grows away from the ring: left-aligned on the right side, right-aligned on the left.
    const anchor = x > 0.3 ? 'start' : x < -0.3 ? 'end' : 'middle';
    return share < 0.04 ? '' : `<text class="donut-label" text-anchor="${anchor}" x="${(60 + 62 * x).toFixed(1)}" y="${(60 + 64 * y).toFixed(1)}">${percentFormatter.format(share)}</text>`;
  }).join('') : '';
  let offset = 0;
  const slices = materials.map(([name, kg]) => {
    const length = (kg / total) * circumference;
    const attributes = interactive
      ? ` data-board-material="${escapeHtml(name)}" data-donut-tip="${escapeHtml(`${formatMaterialLabel(name)}|${formatReportWeight(kg)} · ${percentFormatter.format(kg / total)}`)}"`
      : '';
    const slice = `<circle class="donut-slice${selected && name !== selected ? ' is-dimmed' : ''}" cx="60" cy="60" r="${radius}"
      style="stroke: var(--mat-${materialSlot(name)})" stroke-dasharray="${Math.max(length - gap, 0.5)} ${circumference}" stroke-dashoffset="${-offset}"${attributes}></circle>`;
    offset += length;
    return slice;
  }).join('');
  // With labels the viewBox grows around the ring to make room for the percentages.
  return `<svg viewBox="${labels ? '-30 -30 180 180' : '0 0 120 120'}" aria-hidden="true"><g transform="rotate(-90 60 60)">${slices}</g>${percentLabels}</svg>`;
}

/** Donut of kg per material; each slice and legend row filters the board, hover shows the slice in the center. */
function renderMaterialDonut(materials, total, selected) {
  const centerTip = `${selected ? formatMaterialLabel(selected) : 'Total'}|${formatReportWeight(selected ? materials.find(([name]) => name === selected)?.[1] || 0 : total)}`;
  const [centerLabel, centerValue] = centerTip.split('|');

  return `
    <div class="board-donut-wrap">
      <div class="board-donut" data-donut-default="${escapeHtml(centerTip)}">
        ${renderDonutSvg(materials, total, selected, true)}
        <div class="board-donut-center"><span>${escapeHtml(centerLabel)}</span><strong>${escapeHtml(centerValue)}</strong></div>
      </div>
      <div class="board-donut-legend">
        ${materials.map(([name, kg]) => `
          <button type="button" class="board-row${name === selected ? ' is-selected' : ''}" data-board-material="${escapeHtml(name)}" aria-pressed="${name === selected}"
            data-donut-tip="${escapeHtml(`${formatMaterialLabel(name)}|${formatReportWeight(kg)} · ${percentFormatter.format(kg / total)}`)}">
            <span class="board-row-label"><i class="board-swatch" style="background: var(--mat-${materialSlot(name)})"></i>${escapeHtml(formatMaterialLabel(name))}</span>
            <span class="board-row-value">${escapeHtml(formatReportWeight(kg))} · ${percentFormatter.format(kg / total)}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

/** Interactive view of the same period: KPI tiles, kg per day and kg per container; a material bar filters the rest. */
export function renderSummaryBoard(reports, start, end, period = 'range', material = '') {
  const all = summarizeReports(reports, start, end);
  const summary = material ? summarizeReports(filterReportsByMaterial(all.reports, material), start, end) : all;
  const range = all.start === all.end
    ? formatScheduledDate(all.start)
    : `${formatScheduledDate(all.start)} – ${formatScheduledDate(all.end)}`;
  const days = getKgByDay(summary.reports, start, end);
  const materials = Object.entries(all.materials).sort(([, a], [, b]) => b - a);
  const materialKg = materials.reduce((sum, [, kg]) => sum + kg, 0);
  const containers = Object.entries(summary.byContainer).sort(([, a], [, b]) => b.kg - a.kg);
  const maxContainerKg = containers[0]?.[1].kg || 0;
  const average = summary.reports.length ? summary.totalKg / summary.reports.length : 0;
  const kpis = [
    ['scale', material ? `${formatMaterialLabel(material)} recolectado` : 'Material recolectado', formatReportWeight(summary.totalKg)],
    ['description', 'Reportes', summary.reports.length],
    ['delete', 'Contenedores', summary.containers],
    ['route', 'Rutas con actividad', summary.routes],
    ['event_available', 'Días con recolección', summary.days],
    ['functions', 'Promedio por reporte', formatReportWeight(average)]
  ];

  const materialRows = materialKg
    ? renderMaterialDonut(materials.filter(([, kg]) => kg > 0), materialKg, material)
    : '<p class="board-empty">Sin materiales registrados en este periodo.</p>';
  const materialLegend = renderMaterialLegend(summary.materials);
  const containerRows = containers.map(([id, { reports: count, kg, materials: kgs }]) => `
    <div class="board-row">
      <span class="board-row-label"><strong>${escapeHtml(id)}</strong> ${escapeHtml(pointNames[id] || '')}</span>
      ${renderMaterialBar(kgs, maxContainerKg)}
      <span class="board-row-value">${escapeHtml(formatReportWeight(kg))} · ${count} ${count === 1 ? 'reporte' : 'reportes'}</span>
    </div>
  `).join('') || '<p class="board-empty">Sin contenedores atendidos en este periodo.</p>';

  return `
    <section class="summary-board">
      <header class="summary-board-header">
        <div>
          <h1 class="summary-doc-title">Tablero de recolección</h1>
          <p class="summary-doc-period">${escapeHtml(periodTitles[period](range, all.start))}</p>
        </div>
        ${material ? `<button type="button" class="board-filter-chip" data-board-material="">${escapeHtml(formatMaterialLabel(material))}${icon('close')}<span class="sr-only">Quitar filtro</span></button>` : ''}
      </header>

      ${all.reports.length ? '' : `<p class="board-card board-empty-period">${icon('info')}No hay reportes en este periodo. Elige otra fecha o un periodo semanal o mensual.</p>`}

      <div class="board-kpis">
        ${kpis.map(([name, label, value]) => `<div class="board-kpi">${icon(name)}<span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`).join('')}
      </div>

      <div class="board-card board-card-wide">
        <h2>Kilos por día</h2>
        ${materialLegend}
        ${renderDayChart(days, start, end)}
      </div>

      <div class="board-grid">
        <div class="board-card">
          <h2>Peso por material</h2>
          <p class="board-hint">Selecciona un material en la gráfica o la lista para filtrar el tablero.</p>
          ${materialRows}
        </div>
        <div class="board-card">
          <h2>Contenedores</h2>
          ${materialLegend}
          <div class="board-scroll">${containerRows}</div>
        </div>
      </div>
    </section>
  `;
}

export function renderSummaryDialogShell() {
  return `
    <dialog class="admin-report-dialog" id="admin-summary-dialog" aria-labelledby="admin-summary-dialog-title">
      <header class="admin-report-dialog-header">
        <div><div class="admin-section-kicker">REPORTES DE CONTENEDORES</div><h2 id="admin-summary-dialog-title">Resumen de recolección</h2></div>
        <div class="admin-report-actions">
          <button class="admin-button" type="button" id="admin-summary-board-toggle" aria-pressed="false">${icon('dashboard')}<span>Tablero interactivo</span></button>
          <button class="admin-button" type="button" id="admin-summary-pdf">${icon('picture_as_pdf')}<span>Exportar PDF</span></button>
          <button class="admin-button" type="button" id="admin-summary-csv">${icon('table_view')}<span>Exportar CSV</span></button>
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
  const content = container.querySelector('#admin-summary-content');
  const boardToggle = container.querySelector('#admin-summary-board-toggle');
  let showBoard = false;
  let material = '';

  const getRange = () => {
    const dateKey = date.value || getOperationalDate();
    // ISO date keys compare as strings; sort so a reversed selection still works.
    return period.value === 'range'
      ? [dateKey, endDate.value || dateKey].sort()
      : getPeriodRange(period.value, dateKey);
  };

  const update = () => {
    const isRange = period.value === 'range';
    container.querySelector('#admin-summary-end-wrap').hidden = !isRange;
    container.querySelector('#admin-summary-date-label').textContent = isRange ? 'Inicio' : 'Fecha';
    const [start, end] = getRange();
    content.innerHTML = showBoard
      ? renderSummaryBoard(ctx.reports, start, end, period.value, material)
      : renderSummary(ctx.reports, start, end, period.value);
    boardToggle.setAttribute('aria-pressed', String(showBoard));
    boardToggle.innerHTML = showBoard
      ? `${icon('description')}<span>Ver documento</span>`
      : `${icon('dashboard')}<span>Tablero interactivo</span>`;
  };

  boardToggle.addEventListener('click', () => {
    showBoard = !showBoard;
    update();
  });
  content.addEventListener('click', (event) => {
    const button = event.target.closest('[data-board-material]');
    if (!button) return;
    material = button.dataset.boardMaterial === material ? '' : button.dataset.boardMaterial;
    update();
  });
  // Hovering or focusing a slice or legend row shows its kg and share in the donut's center.
  const showDonutTip = (event) => {
    const donut = content.querySelector('.board-donut');
    if (!donut) return;
    const tip = event.type === 'mouseout' || event.type === 'focusout' ? null : event.target.closest('[data-donut-tip]');
    const [label, value] = (tip?.dataset.donutTip || donut.dataset.donutDefault).split('|');
    donut.querySelector('.board-donut-center span').textContent = label;
    donut.querySelector('.board-donut-center strong').textContent = value;
  };
  ['mouseover', 'mouseout', 'focusin', 'focusout'].forEach((type) => content.addEventListener(type, showDonutTip));

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
    // The PDF is always the document, even when the board is on screen.
    if (showBoard) {
      showBoard = false;
      update();
    }
    const pageTitle = document.title;
    document.title = `Resumen Ruta Cero ${container.querySelector('[data-summary-title]').textContent}`;
    document.body.classList.add('is-printing-summary');
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('is-printing-summary');
      document.title = pageTitle;
    }, { once: true });
    window.print();
  });
  container.querySelector('#admin-summary-csv').addEventListener('click', () => {
    const [start, end] = getRange();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([buildSummaryCsv(ctx.reports, start, end)], { type: 'text/csv;charset=utf-8' }));
    link.download = `ruta-cero-reportes-${start}_${end}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  });
  dialog.querySelector('.admin-report-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
