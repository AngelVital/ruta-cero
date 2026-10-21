/**
 * Pantalla final del día: resumen de la ruta cerrada. Solo hay una ruta por día,
 * así que la app se queda aquí hasta el siguiente día operativo.
 */
import { formatClockTime, formatElapsedTime } from '../utils/format.js';
import { escapeHtml } from '../utils/html.js';

export function renderRouteSummaryScreen(state) {
  const { route } = state;
  const points = state.stops.filter((stop) => stop.type !== 'return-station');
  const completedPoints = points.filter((stop) => stop.status === 'completed');
  // Kg are only known on the device that reported the points.
  const reportedKg = completedPoints.filter((stop) => Number.isFinite(stop.collectedKg));
  const totalKg = reportedKg.reduce((sum, stop) => sum + stop.collectedKg, 0);
  const stats = [
    ['INICIO', route.startTimestamp ? formatClockTime(route.startTimestamp) : '--:--'],
    ['CIERRE', route.completedAt ? formatClockTime(route.completedAt) : '--:--'],
    ['DURACIÓN', route.startTimestamp && route.completedAt ? formatElapsedTime(route.startTimestamp, route.completedAt) : '--'],
    ['PUNTOS', `${completedPoints.length} / ${points.length}`],
    ['RECOLECTADO', reportedKg.length ? `${totalKg} kg` : '--']
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

      <!-- Pending uploads are shown by the shell's sync banner, which updates without re-rendering. -->
      <p class="font-body-sm text-soft">
        Si arriba aparecen registros pendientes, mantén la app abierta con señal hasta que se envíen.
        Después puedes cerrarla; la siguiente ruta aparecerá el próximo día programado.
      </p>
    </div>
  `;
}

export function attachRouteSummaryEvents() {}
