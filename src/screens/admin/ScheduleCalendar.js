import { assignRouteToDate, getOperationalDate } from '../../services/routeConfiguration.js';
import { escapeHtml, icon } from '../../utils/html.js';
import { formatMonthTitle, formatOperationalTime, formatScheduledDate, toDateKey } from './format.js';

export function renderRouteScheduleCalendar(routes, selectedDate, displayedMonth, reports = []) {
  const monthStart = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1, 12);
  const firstDay = new Date(monthStart);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  firstDay.setDate(firstDay.getDate() - mondayOffset);
  const dayCount = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((mondayOffset + dayCount) / 7) * 7;
  const today = getOperationalDate();
  const selectedRoute = routes.find((route) => route.scheduledDates?.includes(selectedDate));
  const reportsByDate = new Map();
  reports.forEach((report, index) => {
    const date = getOperationalDate(new Date(report.created_at));
    const dateReports = reportsByDate.get(date) || [];
    dateReports.push({ report, index });
    reportsByDate.set(date, dateReports);
  });
  const selectedReports = reportsByDate.get(selectedDate) || [];
  const days = Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    const dateKey = toDateKey(date);
    const route = routes.find((item) => item.scheduledDates?.includes(dateKey));
    const reportCount = reportsByDate.get(dateKey)?.length || 0;
    const outsideMonth = date.getMonth() !== displayedMonth.getMonth();

    return `
      <button type="button" class="admin-calendar-day${outsideMonth ? ' is-outside-month' : ''}${dateKey === today ? ' is-today' : ''}${dateKey === selectedDate ? ' is-selected' : ''}" data-calendar-date="${dateKey}" aria-pressed="${dateKey === selectedDate}">
        <span class="admin-calendar-day-number">${date.getDate()}</span>
        ${route ? `<span class="admin-calendar-route">${escapeHtml(route.id)} · ${escapeHtml(route.zone)}${route.fieldScheduledDates?.includes(dateKey) ? ' · campo' : ''}</span>` : '<span class="admin-calendar-empty">Sin ruta</span>'}
        ${reportCount ? `<span class="admin-calendar-report-count">${reportCount} reporte${reportCount === 1 ? '' : 's'}</span>` : ''}
      </button>
    `;
  }).join('');
  const routeOptions = routes.map((route) => `
    <option value="${escapeHtml(route.id)}" ${route.id === selectedRoute?.id ? 'selected' : ''}>${escapeHtml(route.id)} · ${escapeHtml(route.zone)}</option>
  `).join('');
  const isPast = selectedDate < today;
  // Field already started today's route, so swapping it would orphan that crew's progress.
  const isLocked = selectedDate === today && Boolean(selectedRoute?.startedAt);
  const reportsHtml = selectedReports.length
    ? selectedReports.map(({ report, index }) => `
      <li>
        <span><strong>${escapeHtml(report.container_id)}</strong><small>${escapeHtml(formatOperationalTime(report.created_at))} · ${escapeHtml(report.route_id)}</small></span>
        <button type="button" class="admin-report-open" data-calendar-report-index="${index}">${icon('visibility')}<span>Ver</span></button>
      </li>
    `).join('')
    : '<li class="admin-calendar-reports-empty">No hay reportes registrados para este día.</li>';

  return `
    <div class="admin-calendar-layout">
      <div class="admin-calendar">
        <div class="admin-calendar-toolbar">
          <button type="button" class="admin-icon-button" data-calendar-month="-1" aria-label="Mes anterior" title="Mes anterior">${icon('chevron_left')}</button>
          <h3>${formatMonthTitle(monthStart)}</h3>
          <button type="button" class="admin-icon-button" data-calendar-month="1" aria-label="Mes siguiente" title="Mes siguiente">${icon('chevron_right')}</button>
        </div>
        <div class="admin-calendar-grid admin-calendar-weekdays" aria-hidden="true">
          ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => `<span>${day}</span>`).join('')}
        </div>
        <div class="admin-calendar-grid admin-calendar-days">${days}</div>
        <div class="admin-calendar-legend"><span><i class="calendar-legend-today"></i>Hoy</span><span><i class="calendar-legend-assigned"></i>Día con ruta asignada</span><span><i class="calendar-legend-reports"></i>Día con reportes</span></div>
      </div>
      <form class="admin-calendar-assignment" id="admin-calendar-assignment">
        <div class="admin-section-kicker">ASIGNACIÓN DEL DÍA</div>
        <h3>${formatScheduledDate(selectedDate)}</h3>
        <label class="admin-route-field" for="admin-calendar-route">Ruta para esta fecha
          <select id="admin-calendar-route" name="routeId" ${isPast || isLocked ? 'disabled' : ''}>
            <option value="">Sin ruta asignada</option>
            ${routeOptions}
          </select>
        </label>
        ${selectedRoute?.fieldScheduledDates?.includes(selectedDate)
          ? '<p class="admin-calendar-assignment-note">Elegida en campo porque no había ruta asignada para este día.</p>'
          : ''}
        <p class="admin-calendar-assignment-note">${isPast
          ? 'Las fechas pasadas son de solo lectura; puedes consultar aquí los reportes registrados.'
          : isLocked
            ? 'La ruta de hoy ya fue iniciada en campo; no se puede cambiar la asignación.'
            : 'Cada día admite una sola ruta. La misma ruta puede asignarse a varios días.'}</p>
        ${isPast
          ? `<button type="button" class="admin-button admin-button-dark" data-calendar-summary>${icon('summarize')}<span>Generar resumen</span></button>`
          : `<button type="submit" class="admin-button admin-button-dark" ${routes.length && !isLocked ? '' : 'disabled'}>${icon('event_available')}<span>Guardar asignación</span></button>`}
        <p class="admin-calendar-message" id="admin-calendar-message" role="status" aria-live="polite"></p>
        <div class="admin-calendar-reports">
          <h4>Reportes del día <span>${selectedReports.length}</span></h4>
          <ul>${reportsHtml}</ul>
        </div>
      </form>
    </div>
  `;
}

/** Month navigation, day selection, day reports and schedule assignment. */
export function attachScheduleCalendar(ctx, { saveRouteSchedule }) {
  const calendarContainer = ctx.container.querySelector('#admin-calendar-container');

  calendarContainer?.addEventListener('click', (event) => {
    const reportButton = event.target.closest('[data-calendar-report-index]');
    if (reportButton) {
      ctx.openReport(ctx.reports[Number(reportButton.dataset.calendarReportIndex)]);
      return;
    }

    if (event.target.closest('[data-calendar-summary]')) {
      // Reuses the summary dialog: a custom range covering just the selected day.
      const period = ctx.container.querySelector('#admin-summary-period');
      ctx.container.querySelector('#admin-summary-date').value = ctx.selectedScheduleDate;
      ctx.container.querySelector('#admin-summary-end').value = ctx.selectedScheduleDate;
      period.value = 'range';
      period.dispatchEvent(new Event('change'));
      ctx.container.querySelector('#admin-summary-dialog').showModal();
      return;
    }

    const monthButton = event.target.closest('[data-calendar-month]');
    if (monthButton) {
      ctx.displayedMonth.setMonth(ctx.displayedMonth.getMonth() + Number(monthButton.dataset.calendarMonth));
      ctx.updateCalendar();
      return;
    }

    const dayButton = event.target.closest('[data-calendar-date]');
    if (!dayButton) return;
    ctx.selectedScheduleDate = dayButton.dataset.calendarDate;
    ctx.updateCalendar();
  });

  calendarContainer?.addEventListener('submit', async (event) => {
    if (event.target.id !== 'admin-calendar-assignment') return;
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    const message = form.querySelector('#admin-calendar-message');
    const routeId = new FormData(form).get('routeId');
    const selectedDate = ctx.selectedScheduleDate;
    const currentRoute = ctx.routes.find((route) => route.scheduledDates?.includes(selectedDate));
    if (currentRoute && currentRoute.id !== routeId
      && !window.confirm(`El ${formatScheduledDate(selectedDate)} ya tiene asignada la ruta ${currentRoute.id} (${currentRoute.zone}). ¿Seguro que quieres cambiarla?`)) return;
    button.disabled = true;
    message.textContent = 'Guardando programación…';
    message.classList.remove('is-error');

    try {
      await saveRouteSchedule(selectedDate, routeId);
      ctx.saveRoutesLocally(assignRouteToDate(ctx.routes, selectedDate, routeId));
      const scheduledRoute = ctx.routes.find((route) => route.id === routeId);
      const updatedMessage = ctx.container.querySelector('#admin-calendar-message');
      updatedMessage.textContent = scheduledRoute
        ? `${scheduledRoute.id} quedó asignada para el ${formatScheduledDate(selectedDate)}.`
        : `Se quitó la asignación del ${formatScheduledDate(selectedDate)}.`;
      ctx.showRouteMessage('Programación guardada y sincronizada con campo.');
    } catch (error) {
      message.textContent = `No se pudo guardar la programación: ${error.message}`;
      message.classList.add('is-error');
      button.disabled = false;
    }
  });
}
