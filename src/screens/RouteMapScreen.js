/**
 * Pantalla 4: Mapa de Ruta Programada R-04
 */

import { attachFieldSignOut, renderFieldOptionsMenu } from '../components/FieldOptionsMenu.js';
import { notVisitedReport } from '../domain/report.js';
import { queueFieldAction } from '../services/fieldSync.js';
import { formatElapsedTime } from '../utils/format.js';
import { escapeHtml } from '../utils/html.js';

// Map URL whose iframe already finished loading; the splash only covers a map not yet loaded.
let loadedMapUrl = null;

function formatElapsedRouteTime(startTimestamp) {
  return startTimestamp ? formatElapsedTime(startTimestamp).toUpperCase() : '0 MIN';
}

export function renderRouteMapScreen(state) {
  const activeStop = state.stops.find(s => s.id === state.activeContainerId)
    || state.stops.find(s => s.status === 'active')
    || state.stops[0];
  const destination = activeStop.latitude !== null && activeStop.longitude !== null
    ? `${activeStop.latitude},${activeStop.longitude}`
    : activeStop.address;
  const encodedDestination = encodeURIComponent(destination);
  const mapsUrl = `https://www.google.com/maps?q=${encodedDestination}&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;
  const routeProgress = `${state.route.completedCount}/${state.route.totalStops}`;
  const isReturnStation = activeStop.type === 'return-station';

  return `
    ${loadedMapUrl === mapsUrl ? '' : `
      <div class="app-splash route-map-splash" role="status">
        <img src="/logo-light.svg" alt="Ruta Cero">
        <span class="app-splash-spinner" aria-hidden="true"></span>
        <span class="app-splash-label">Cargando ruta…</span>
      </div>
    `}
    <div class="screen-header-bar">
      <div class="screen-header-title">
        <span class="material-symbols-outlined">alt_route</span>
        <span>MAPA DE RUTA · ${escapeHtml(state.route.id)} ${escapeHtml(state.route.name)}</span>
      </div>
      <div class="header-actions">
        <span class="status-pill status-pill-optimal status-pill-xs">
          ${state.route.completedCount}/${state.stops.length} HECHO
        </span>
        ${renderFieldOptionsMenu()}
      </div>
    </div>

    <div class="route-google-map" aria-label="Ubicación de ${activeStop.id}">
      <iframe
        src="${mapsUrl}"
        data-map-url="${mapsUrl}"
        title="Ubicación de ${activeStop.id}"
        allowfullscreen
      ></iframe>
    </div>

    <div class="route-active-bar">
      <div class="font-headline-sm text-ink route-active-title">${activeStop.id} • ${activeStop.code}</div>
      <div class="route-active-actions">
        <a class="btn-tactical btn-tactical-sm btn-tactical-primary route-directions-link" href="${directionsUrl}" target="_blank" rel="noopener noreferrer">
          <span class="material-symbols-outlined icon-16">directions</span>
          <span>CÓMO LLEGAR</span>
        </a>
        <button type="button" class="btn-tactical btn-tactical-sm" id="btn-open-refuel">
          <span class="material-symbols-outlined icon-16">local_gas_station</span>
          <span>COMBUSTIBLE</span>
        </button>
        <button type="button" class="btn-tactical btn-tactical-sm btn-report-incident" id="btn-open-incident">
          <span class="material-symbols-outlined icon-16">report</span>
          <span>INCIDENCIA</span>
        </button>
      </div>
    </div>

    <!-- Live route telemetry -->
    <div class="route-telemetry">
      <div>
        <span class="font-label-sm route-telemetry-label">SIGUIENTE PUNTO</span>
        <strong class="font-headline-sm route-telemetry-value is-next">${activeStop.id}</strong>
      </div>
      <div class="route-telemetry-mid">
        <span class="font-label-sm route-telemetry-label">PUNTOS REGISTRADOS</span>
        <strong class="font-headline-sm route-telemetry-value is-progress">${routeProgress}</strong>
      </div>
      <div>
        <span class="font-label-sm route-telemetry-label">TIEMPO EN RUTA</span>
        <strong id="route-time-in-route" class="font-headline-sm route-telemetry-value is-time">${formatElapsedRouteTime(state.route.startTimestamp)}</strong>
      </div>
    </div>

    <!-- Scheduled Waypoint List Header -->
    <div class="route-stops-head">
      <h2 class="font-headline-sm">PUNTOS PROGRAMADOS (${state.stops.length})</h2>
    </div>

    <!-- Stops Scrollable Cards -->
    <div class="route-stops">
      ${state.stops.map((stop, index) => {
        const isCompleted = stop.status === 'completed';
        const isActive = stop.status === 'active';

        let statusBadge = '<span class="status-pill status-pill-xs status-pill-pending">PENDIENTE</span>';
        if (isCompleted && stop.fillLevel === notVisitedReport.fillLevel) {
          statusBadge = '<span class="status-pill status-pill-critical status-pill-xs"><span class="material-symbols-outlined">close</span>NO VISITADO</span>';
        } else if (isCompleted) {
          statusBadge = '<span class="status-pill status-pill-optimal status-pill-xs"><span class="material-symbols-outlined">check</span>COMPLETADO</span>';
        } else if (isActive) {
          statusBadge = '<span class="status-pill status-pill-warning status-pill-xs"><span class="material-symbols-outlined">near_me</span>EN CURSO</span>';
        }

        return `
          <div class="card-tactical stop-item-card${stop.id === activeStop.id ? ' is-current' : ''}" data-container-id="${stop.id}">
            <div class="stop-card-head">
              <div class="stop-card-title">
                <span class="material-symbols-outlined stop-card-pin" title="Ver ubicación en el mapa" aria-label="Ver ubicación en el mapa">location_on</span>
                <span class="font-headline-sm text-ink stop-card-name">[${String(index + 1).padStart(2, '0')}] ${stop.id} • ${stop.code}</span>
              </div>
              <div class="stop-card-status">${statusBadge}</div>
            </div>

            <div class="stop-card-foot">
              <p class="font-body-sm stop-card-address">${stop.address}</p>
              ${isActive && isReturnStation ? `
                <button type="button" class="btn-tactical btn-tactical-sm btn-tactical-primary btn-finish-route stop-card-action">
                  FINALIZAR RUTA
                </button>
              ` : isActive ? `
                <div class="stop-card-actions">
                  <button type="button" class="btn-tactical btn-tactical-sm btn-skip-stop stop-card-action" data-container-id="${stop.id}">
                    NO VISITADO
                  </button>
                  <button type="button" class="btn-tactical btn-tactical-sm btn-scan-stop stop-card-action" data-container-id="${stop.id}">
                    ESCANEAR QR
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function attachRouteMapEvents(container, store) {
  attachFieldSignOut(container, store);
  const mapFrame = container.querySelector('.route-google-map iframe');
  const splash = container.querySelector('.route-map-splash');
  let splashTimeoutId;
  if (splash && mapFrame) {
    const hideSplash = () => {
      clearTimeout(splashTimeoutId);
      loadedMapUrl = mapFrame.dataset.mapUrl;
      splash.remove();
    };
    mapFrame.addEventListener('load', hideSplash, { once: true });
    // Without signal the map may never load; the stop list must stay usable.
    splashTimeoutId = setTimeout(hideSplash, 8000);
  }
  const timeInRoute = container.querySelector('#route-time-in-route');
  let timerId;
  if (timeInRoute && store.state.route.startTimestamp) {
    const updateElapsedTime = () => {
      if (!timeInRoute.isConnected) {
        clearInterval(timerId);
        return;
      }
      timeInRoute.textContent = formatElapsedRouteTime(store.state.route.startTimestamp);
    };
    timerId = setInterval(updateElapsedTime, 60000);
  }

  container.querySelectorAll('.stop-item-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const cid = card.getAttribute('data-container-id');
      const selectedContainer = store.state.stops.find(stop => stop.id === cid);
      if (selectedContainer && selectedContainer.status !== 'completed') {
        store.selectContainer(cid);
        document.getElementById('screen-viewport-root')?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  container.querySelectorAll('.btn-scan-stop').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const cid = button.getAttribute('data-container-id');
      const selectedContainer = store.state.stops.find(stop => stop.id === cid);
      if (selectedContainer?.status === 'active') {
        store.selectContainer(cid);
        store.setScreen('scanner');
      }
    });
  });

  container.querySelectorAll('.btn-skip-stop').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      const cid = button.getAttribute('data-container-id');
      if (!window.confirm(`¿Estás seguro de marcar ${cid} como no visitado? No se puede deshacer.`)) return;
      button.disabled = true;
      try {
        // Saved on the device first; fieldSync sends it to Supabase when there is signal.
        const queued = await queueFieldAction('report', { routeId: store.state.route.id, containerId: cid, report: notVisitedReport });
        store.completeContainerReport(cid, notVisitedReport);
        store.showToast(`${cid} registrado como no visitado${queued ? '' : ' en modo local'}`, queued ? 'success' : 'info');
      } catch (error) {
        console.error('No se pudo guardar el registro en el dispositivo:', error);
        store.showToast(`No se pudo guardar el registro en el dispositivo: ${error.message}`, 'info', 8000);
        button.disabled = false;
      }
    });
  });

  container.querySelector('#btn-open-refuel')?.addEventListener('click', () => store.setScreen('refuel'));
  container.querySelector('#btn-open-incident')?.addEventListener('click', () => store.setScreen('incident'));

  container.querySelector('.btn-finish-route')?.addEventListener('click', () => {
    store.setScreen('route-completion');
  });

  return () => {
    clearInterval(timerId);
    clearTimeout(splashTimeoutId);
  };
}
