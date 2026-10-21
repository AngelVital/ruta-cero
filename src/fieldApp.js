/**
 * Ruta Cero • Aplicación de campo
 * Shell móvil, selección de pantalla y sincronización de la ruta programada.
 */

import { store } from './state/store.js';
import { flushFieldQueue, getPendingSyncCount } from './services/fieldSync.js';
import {
  getOperationalDate,
  getScheduledRoute,
  routesStorageKey,
  saveConfiguredRoutes
} from './services/routeConfiguration.js';
import { renderDispatchScreen, attachDispatchScreenEvents } from './screens/DispatchScreen.js';
import { renderInspection360Screen, attachInspection360Events } from './screens/Inspection360Screen.js';
import { renderFuelLevelScreen, attachFuelLevelEvents } from './screens/FuelLevelScreen.js';
import { renderRouteMapScreen, attachRouteMapEvents } from './screens/RouteMapScreen.js';
import { renderRouteCompletionScreen, attachRouteCompletionEvents } from './screens/RouteCompletionScreen.js';
import { renderRouteSummaryScreen, attachRouteSummaryEvents } from './screens/RouteSummaryScreen.js';
import { renderQRScannerScreen, attachQRScannerEvents } from './screens/QRScannerScreen.js';
import { renderContainerReportScreen, attachContainerReportEvents } from './screens/ContainerReportScreen.js';
import { renderIncidentScreen, attachIncidentEvents } from './screens/IncidentScreen.js';
import { renderRefuelScreen, attachRefuelEvents } from './screens/RefuelScreen.js';

const screens = {
  dispatch: [renderDispatchScreen, attachDispatchScreenEvents],
  inspection: [renderInspection360Screen, attachInspection360Events],
  fuel: [renderFuelLevelScreen, attachFuelLevelEvents],
  map: [renderRouteMapScreen, attachRouteMapEvents],
  'route-completion': [renderRouteCompletionScreen, attachRouteCompletionEvents],
  'route-summary': [renderRouteSummaryScreen, attachRouteSummaryEvents],
  scanner: [renderQRScannerScreen, attachQRScannerEvents],
  report: [renderContainerReportScreen, attachContainerReportEvents],
  incident: [renderIncidentScreen, attachIncidentEvents],
  refuel: [renderRefuelScreen, attachRefuelEvents]
};

async function refreshFieldRouteConfiguration() {
  store.applyConfiguredRoute(getScheduledRoute());
  try {
    // Send pending actions first so the server state already includes them.
    await flushFieldQueue();
    const { fetchRouteConfigurations, fetchFleetResources } = await import('./services/supabase.js');
    const [routes, fleet] = await Promise.all([
      fetchRouteConfigurations(),
      // A project that has not run the fleet part of schema.sql yet keeps the cached list.
      fetchFleetResources().catch(() => null)
    ]);
    if (fleet) store.setFleetResources(fleet);
    saveConfiguredRoutes(routes);
    store.applyConfiguredRoute(routes.find((route) => route.scheduledDates?.includes(getOperationalDate())) || null);
  } catch {
    // The local route cache remains available while Supabase is offline or unconfigured.
  }
}

function renderToast(state) {
  const toastRoot = document.getElementById('toast-root');
  if (!toastRoot) {
    return;
  }

  toastRoot.innerHTML = state.toast ? `
    <div class="hud-toast">
      <span class="material-symbols-outlined">
        ${state.toast.type === 'info' ? 'info' : 'check_circle'}
      </span>
      <span class="hud-toast-message"></span>
    </div>
  ` : '';
  // Messages can include Supabase error text, so they are inserted as text, never as HTML.
  const messageEl = toastRoot.querySelector('.hud-toast-message');
  if (messageEl) messageEl.textContent = state.toast.message;
}

function renderSyncStatus(state) {
  const syncRoot = document.getElementById('sync-root');
  if (!syncRoot) return;

  const count = state.pendingSyncCount;
  syncRoot.hidden = count === 0;
  syncRoot.textContent = count === 1
    ? '1 registro pendiente de sincronizar'
    : `${count} registros pendientes de sincronizar`;
}

export function startFieldApp(appEl) {
  // Track the last rendered screen to detect navigation vs. in-screen re-renders
  let previousScreen = null;
  // Cleanup returned by the active screen's attach function (camera, timers, global listeners)
  let cleanupScreen = null;

  function renderApp() {
    const state = store.state;
    // One route per day: once it is closed (here or reported by the server) only the summary is shown.
    const screenName = state.route.status === 'COMPLETADA' ? 'route-summary' : state.currentScreen;
    const oldViewport = document.getElementById('screen-viewport-root');
    const screenChanged = previousScreen !== null && previousScreen !== screenName;
    const savedScrollTop = (!screenChanged && oldViewport) ? oldViewport.scrollTop : 0;

    cleanupScreen?.();
    cleanupScreen = null;

    // The old viewport is discarded on every render, so release any camera it still holds.
    if (oldViewport) {
      oldViewport.querySelectorAll('video').forEach((video) => {
        video.pause();
        video.srcObject?.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      });
    }

    previousScreen = screenName;
    const screenTransition = store.consumeScreenTransition();

    const [renderScreen, attachEvents] = screens[screenName] || screens.dispatch;

    // Master Shell Layout
    appEl.innerHTML = `
      <div class="hud-canvas">
        <div class="mobile-chassis" id="main-mobile-chassis">
          <div id="sync-root" class="sync-status" role="status" hidden></div>
          <main class="screen-viewport${screenTransition === 'slide-left' ? ' screen-transition-slide-left' : ''}" id="screen-viewport-root">
            ${renderScreen(state)}
          </main>

          <div id="toast-root"></div>
        </div>
      </div>
    `;

    renderToast(state);
    renderSyncStatus(state);

    const viewport = document.getElementById('screen-viewport-root');
    if (viewport) {
      const cleanup = attachEvents(viewport, store);
      cleanupScreen = typeof cleanup === 'function' ? cleanup : null;
    }

    // Restore scroll position if previously saved
    if (viewport && savedScrollTop) {
      viewport.scrollTop = savedScrollTop;
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key === routesStorageKey || event.key === null) {
      store.applyConfiguredRoute(getScheduledRoute());
    }
  });
  window.addEventListener('focus', refreshFieldRouteConfiguration);
  window.addEventListener('online', refreshFieldRouteConfiguration);
  // Retries pending actions while the signal comes and goes; a no-op when nothing is pending.
  setInterval(() => flushFieldQueue(), 30000);
  store.setPendingSyncCount(getPendingSyncCount());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshFieldRouteConfiguration();
  });

  import('./services/supabase.js').then(({ subscribeToRouteConfigurations }) => {
    subscribeToRouteConfigurations(refreshFieldRouteConfiguration);
  }).catch(() => {});
  refreshFieldRouteConfiguration();

  renderApp();

  // Subscribe to store updates for reactive re-render
  store.subscribe((state, changeType) => {
    if (changeType === 'toast') {
      renderToast(state);
      return;
    }
    if (changeType === 'sync') {
      renderSyncStatus(state);
      return;
    }

    renderApp();
  });
}
