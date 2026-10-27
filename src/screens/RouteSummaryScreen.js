/**
 * Pantalla final del día: resumen de la ruta cerrada. Solo hay una ruta por día,
 * así que la app se queda aquí hasta el siguiente día operativo.
 */
import { getActiveIncidents } from '../domain/report.js';
import { getPendingSyncCount } from '../services/fieldSync.js';
import { formatClockTime, formatElapsedTime } from '../utils/format.js';
import { escapeHtml } from '../utils/html.js';

const optionLabel = (options, id) => options.find((option) => option.id === id)?.label || id || '--';

export function renderRouteSummaryScreen(state) {
  const { route, assignment, dispatchOptions } = state;
  const points = state.stops.filter((stop) => stop.type !== 'return-station');
  const completedPoints = points.filter((stop) => stop.status === 'completed');
  // Kg are only known on the device that reported the points.
  const reportedKg = completedPoints.filter((stop) => Number.isFinite(stop.collectedKg));
  const totalKg = reportedKg.reduce((sum, stop) => sum + stop.collectedKg, 0);
  const incidentCount = completedPoints.reduce((sum, stop) => sum + getActiveIncidents(stop.incidents).length, 0);
  const stats = [
    ['INICIO', route.startTimestamp ? formatClockTime(route.startTimestamp) : '--:--'],
    ['CIERRE', route.completedAt ? formatClockTime(route.completedAt) : '--:--'],
    ['DURACIÓN', route.startTimestamp && route.completedAt ? formatElapsedTime(route.startTimestamp, route.completedAt) : '--'],
    ['PUNTOS', `${completedPoints.length} / ${points.length}`],
    ['RECOLECTADO', reportedKg.length ? `${totalKg} kg` : '--'],
    ['INCIDENCIAS EN PUNTOS', String(incidentCount)]
  ];
  const crew = [
    ['UNIDAD', optionLabel(dispatchOptions.units, assignment.unitId)],
    ['OPERADOR', optionLabel(dispatchOptions.drivers, assignment.driverId)],
    ['AUXILIAR', optionLabel(dispatchOptions.assistants, assignment.assistantId)]
  ];

  return `
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined">task_alt</span>
        <span>RUTA COMPLETADA · ${escapeHtml(route.id)}</span>
      </div>
    </div>

    <div class="screen-body">
      <section class="card-tactical card-tactical-accent completion-card">
        <span class="font-label-sm text-muted">RESUMEN DEL DÍA</span>
        <h2 class="font-headline-sm text-ink completion-station">${escapeHtml(route.id)} · ${escapeHtml(route.name)}</h2>
        <dl class="summary-stats">
          ${stats.map(([label, value]) => `
            <div>
              <dt class="font-label-sm text-muted">${label}</dt>
              <dd class="font-headline-sm text-ink">${value}</dd>
            </div>
          `).join('')}
        </dl>
      </section>

      <section class="card-tactical completion-card">
        <span class="font-label-sm text-muted">TRIPULACIÓN</span>
        <dl class="summary-stats">
          ${crew.map(([label, value]) => `
            <div>
              <dt class="font-label-sm text-muted">${label}</dt>
              <dd class="font-body-sm text-ink">${escapeHtml(value)}</dd>
            </div>
          `).join('')}
        </dl>
      </section>

      <!-- Pending uploads are shown by the shell's sync banner, which updates without re-rendering. -->
      <p class="font-body-sm text-soft">
        Si arriba aparecen registros pendientes, mantén la app abierta con señal hasta que se envíen.
        Después puedes cerrar sesión; la siguiente ruta aparecerá el próximo día programado.
      </p>

      <button type="button" class="btn-tactical" id="btn-field-sign-out">
        <span class="material-symbols-outlined">logout</span>
        <span>CERRAR SESIÓN</span>
      </button>
    </div>
  `;
}

export function attachRouteSummaryEvents(container, store) {
  const button = container.querySelector('#btn-field-sign-out');
  button?.addEventListener('click', async () => {
    // Signing out first would leave the queue without an account that may send it.
    if (getPendingSyncCount() > 0) {
      store.showToast('Espera a que se envíen los registros pendientes antes de cerrar sesión.', 'info', 5000);
      return;
    }

    button.disabled = true;
    try {
      const { signOut } = await import('../services/supabase.js');
      await signOut();
      window.location.replace('/');
    } catch (error) {
      store.showToast(`No se pudo cerrar sesión (revisa la señal): ${error.message}`, 'info', 5000);
      button.disabled = false;
    }
  });
}
