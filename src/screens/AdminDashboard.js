/**
 * Panel de administración: sesión, estado compartido y sincronización con campo.
 * Cada sección (calendario, rutas, reportes) vive en src/screens/admin/ y recibe `ctx`,
 * el estado compartido del panel.
 */
import { getLatestReportReceivedAt, mergeNewReports } from '../domain/report.js';
import { getReportsForDate, getTodaySummary } from '../domain/route.js';
import {
  getConfiguredRoutes,
  getOperationalDate,
  getRouteForDate,
  getScheduledRoute,
  saveConfiguredRoutes
} from '../services/routeConfiguration.js';
import { formatElapsedTime } from '../utils/format.js';
import { escapeHtml, icon } from '../utils/html.js';
import { renderAdminOperations } from './admin/AdminLayout.js';
import { renderCollectionPointTable } from './admin/CollectionPoints.js';
import { formatReportDate, parseDateKey } from './admin/format.js';
import { attachFieldEvents, updateFieldEvents } from './admin/FieldEvents.js';
import { attachFleet } from './admin/Fleet.js';
import { attachReports, updateReportList } from './admin/Reports.js';
import { attachRouteTable, updateRouteRows } from './admin/RouteTable.js';
import { attachSummary } from './admin/Summary.js';
import { attachScheduleCalendar, renderRouteScheduleCalendar } from './admin/ScheduleCalendar.js';

const api = () => import('../services/supabase.js');

/** Refreshes KPIs, route table and calendar after route or report data changes. */
function updateRoutes(ctx) {
  const { container } = ctx;
  ctx.routes = getConfiguredRoutes().map((route) => getRouteForDate(route));
  const { routes } = ctx;
  updateRouteRows(ctx);
  container.querySelector('#admin-route-count').textContent = `${routes.length} rutas configuradas`;
  container.querySelector('#admin-routes-count').textContent = String(routes.length);
  container.querySelector('#admin-route-nav-count').textContent = String(routes.length);
  const { scheduledRoute, scheduledCount, todaysReports, totalPoints, completedPoints } = getTodaySummary(routes, ctx.reports);

  container.querySelector('#admin-configured-routes-count').textContent = String(routes.length);
  container.querySelector('#admin-scheduled-routes-count').textContent = `${scheduledCount} programadas hoy`;
  container.querySelector('#admin-points-done-today').textContent = String(completedPoints);
  container.querySelector('#admin-points-total-today').textContent = String(totalPoints);
  container.querySelector('#admin-reports-today-count').textContent = String(todaysReports.length);
  container.querySelector('#admin-active-route-id').textContent = scheduledRoute?.id || 'Sin ruta';
  container.querySelector('#admin-active-route-progress').textContent = scheduledRoute
    ? `${scheduledRoute.statusLabel} · ${completedPoints} de ${scheduledRoute.pointIds.length} puntos atendidos hoy`
    : 'No programada para hoy';
  container.querySelector('#admin-selected-route-label').textContent = scheduledRoute
    ? `Ruta de hoy: ${scheduledRoute.id} · ${scheduledRoute.zone}`
    : 'Sin ruta programada para hoy';
  ctx.updateCalendar();
}

/**
 * Incidents and fuel loads, loaded apart from container reports so a project that has not
 * run the new part of schema.sql yet still shows everything else.
 */
async function loadFieldEvents() {
  try {
    const {
      fetchAdminIncidentReports, fetchAdminFuelLoads, fetchAdminDispatchInspections, fetchAdminRouteCompletions
    } = await api();
    const [incidents, fuelLoads, inspections, closures] = await Promise.all([
      fetchAdminIncidentReports(), fetchAdminFuelLoads(), fetchAdminDispatchInspections(), fetchAdminRouteCompletions()
    ]);
    return { incidents, fuelLoads, inspections, closures, fieldEventError: '' };
  } catch (error) {
    return {
      incidents: [],
      fuelLoads: [],
      inspections: [],
      closures: [],
      fieldEventError: `No se pudieron cargar incidencias, combustible, inspecciones y cierres: ${error.message}`
    };
  }
}

async function loadFleet() {
  try {
    return { fleet: await (await api()).fetchFleetResources(), fleetError: '' };
  } catch (error) {
    return { fleet: [], fleetError: `No se pudieron cargar unidades y personal: ${error.message}` };
  }
}

function createAdminContext(container, reports, { incidents, fuelLoads, inspections, closures, fleet }) {
  const routeMessage = container.querySelector('#admin-route-message');
  const ctx = {
    container,
    routes: [],
    reports,
    incidents,
    fuelLoads,
    inspections,
    closures,
    fleet,
    visibleReports: getReportsForDate(reports, getOperationalDate()),
    showAllReports: false,
    selectedScheduleDate: getOperationalDate(),
    displayedMonth: parseDateKey(getOperationalDate()),
    openReport: () => {},
    updateRoutes: () => updateRoutes(ctx),
    updateCalendar: () => {
      container.querySelector('#admin-calendar-container').innerHTML = renderRouteScheduleCalendar(
        ctx.routes, ctx.selectedScheduleDate, ctx.displayedMonth, ctx.reports
      );
    },
    /** Stores routes already saved in Supabase in the local cache and refreshes the panel. */
    saveRoutesLocally: (routes) => {
      saveConfiguredRoutes(routes);
      ctx.routes = routes;
      updateRoutes(ctx);
    },
    showRouteMessage: (text, isError = false) => {
      routeMessage.textContent = text;
      routeMessage.classList.toggle('is-error', isError);
    }
  };
  return ctx;
}

/**
 * Keeps the panel in sync with field activity (Realtime, focus, interval).
 * Returns { refresh, teardown }.
 */
function startAdminSync(ctx) {
  const { container } = ctx;
  let refreshInProgress = null;

  // Automatic refreshes only fetch reports received after the latest one already loaded;
  // the "Actualizar" button (announce = true) reloads the full history.
  const refresh = (announce = false) => {
    if (refreshInProgress) return refreshInProgress;

    const refreshButton = container.querySelector('#admin-refresh-reports');
    const reportMessage = container.querySelector('#admin-report-message');
    refreshInProgress = (async () => {
      try {
        const { fetchAdminContainerReports, fetchRouteConfigurations } = await api();
        const latestReceivedAt = announce ? null : getLatestReportReceivedAt(ctx.reports);
        const [updatedReports, remoteRoutes, fieldEvents] = await Promise.all([
          fetchAdminContainerReports({ since: latestReceivedAt }),
          fetchRouteConfigurations(),
          loadFieldEvents()
        ]);
        if (!fieldEvents.fieldEventError) {
          ctx.incidents = fieldEvents.incidents;
          ctx.fuelLoads = fieldEvents.fuelLoads;
          ctx.inspections = fieldEvents.inspections;
          ctx.closures = fieldEvents.closures;
          updateFieldEvents(ctx);
        }
        ctx.reports = latestReceivedAt ? mergeNewReports(ctx.reports, updatedReports) : updatedReports;
        // An empty list is the real state (every route deleted), not a reason to keep the cache.
        ctx.routes = remoteRoutes;
        saveConfiguredRoutes(remoteRoutes);

        updateReportList(ctx);
        container.querySelector('#admin-points-rows').innerHTML = renderCollectionPointTable(ctx.reports);
        updateRoutes(ctx);
        if (reportMessage) {
          reportMessage.textContent = announce
            ? `Actualizado: ${formatReportDate(new Date().toISOString())}`
            : `Sincronizado con el panel de campo · ${formatReportDate(new Date().toISOString())}`;
          reportMessage.classList.remove('is-error');
        }
      } catch (error) {
        if (reportMessage) {
          reportMessage.textContent = `No se pudo sincronizar con campo: ${error.message}`;
          reportMessage.classList.add('is-error');
        }
      } finally {
        if (refreshButton) refreshButton.disabled = false;
        refreshInProgress = null;
      }
    })();

    return refreshInProgress;
  };

  const rows = container.querySelector('#admin-route-rows');
  const refreshWhenVisible = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  // The elapsed time is shown in minutes, so refreshing it every 15 s is enough.
  const elapsedTimerId = window.setInterval(() => {
    if (!rows.isConnected) {
      teardown();
      return;
    }
    rows.querySelectorAll('[data-route-elapsed]').forEach((counter) => {
      counter.textContent = formatElapsedTime(counter.dataset.routeStartedAt);
    });
  }, 15000);
  const syncTimerId = window.setInterval(() => {
    if (!container.isConnected) return;
    if (document.visibilityState === 'visible') refresh();
  }, 30000);
  window.addEventListener('focus', refreshWhenVisible);
  document.addEventListener('visibilitychange', refreshWhenVisible);

  let unsubscribeAdminUpdates = () => {};
  let tornDown = false;
  // Stops timers, global listeners and Realtime; runs on sign-out or when the panel leaves the DOM.
  const teardown = () => {
    if (tornDown) return;
    tornDown = true;
    window.clearInterval(elapsedTimerId);
    window.clearInterval(syncTimerId);
    window.removeEventListener('focus', refreshWhenVisible);
    document.removeEventListener('visibilitychange', refreshWhenVisible);
    unsubscribeAdminUpdates();
  };

  api()
    .then(({ subscribeToAdminUpdates }) => subscribeToAdminUpdates(() => refresh()))
    .then((unsubscribe) => {
      if (tornDown || !container.isConnected) {
        unsubscribe();
      } else {
        unsubscribeAdminUpdates = unsubscribe;
      }
    })
    .catch((error) => {
      ctx.showRouteMessage(`No se pudo activar la actualización en vivo: ${error.message}`, true);
    });

  return { refresh, teardown };
}

function attachAdminDashboardContentEvents(container, reports, fieldEvents) {
  const ctx = createAdminContext(container, reports, fieldEvents);
  updateRoutes(ctx);

  const { refresh, teardown } = startAdminSync(ctx);
  attachReports(ctx, {
    refresh,
    fetchPhotos: async (...args) => (await api()).fetchContainerReportPhotos(...args)
  });
  attachSummary(ctx);
  attachFieldEvents(ctx, {
    fetchPhotos: async (...args) => (await api()).fetchFieldEventPhotos(...args)
  });
  attachScheduleCalendar(ctx, {
    saveRouteSchedule: async (...args) => (await api()).saveRouteSchedule(...args)
  });
  attachRouteTable(ctx, {
    saveRouteConfigurations: async (...args) => (await api()).saveRouteConfigurations(...args),
    fetchNextRouteId: async () => (await api()).fetchNextRouteId()
  });
  attachFleet(ctx, {
    addFleetResource: async (...args) => (await api()).addFleetResource(...args),
    archiveFleetResource: async (...args) => (await api()).archiveFleetResource(...args)
  });

  container.querySelectorAll('.admin-section-toggle').forEach((toggle) => {
    const section = toggle.closest('.admin-section');
    section.querySelector('.admin-section-heading').addEventListener('click', (event) => {
      // A heading action (Ver todos, Actualizar) only unfolds, so its result is visible; the rest of the heading toggles.
      const action = event.target.closest('button');
      const open = action && action !== toggle ? true : section.classList.contains('is-collapsed');
      section.classList.toggle('is-collapsed', !open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Ocultar lista' : 'Mostrar lista');
    });
  });

  container.querySelectorAll('.admin-nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      container.querySelector('.admin-nav-link.is-active')?.classList.remove('is-active');
      link.classList.add('is-active');
      container.querySelectorAll('.admin-nav-link').forEach((item) => item.removeAttribute('aria-current'));
      link.setAttribute('aria-current', 'page');
    });
  });

  const themeToggle = container.querySelector('#admin-theme-toggle');
  syncThemeToggle(container, themeToggle);
  themeToggle?.addEventListener('click', () => {
    setAdminTheme(container, container.dataset.theme === 'dark' ? 'light' : 'dark');
    syncThemeToggle(container, themeToggle);
  });

  container.querySelector('#admin-signout')?.addEventListener('click', async () => {
    try {
      await (await api()).signOut();
      teardown();
      window.location.replace('/');
    } catch (error) {
      const message = container.querySelector('#admin-report-message');
      if (message) message.textContent = error.message;
    }
  });
}

/** Loads shared routes; Supabase is the source of truth, even when it has none. */
async function loadSharedRoutes() {
  const { fetchRouteConfigurations } = await api();
  saveConfiguredRoutes(await fetchRouteConfigurations());
}

// main.js already checked that the signed-in account is an admin before mounting the panel.
async function mountAdminDashboard(container) {
  try {
    const { getSupabaseSession, fetchAdminContainerReports } = await api();
    const session = await getSupabaseSession();
    if (!session) {
      window.location.replace('/');
      return;
    }

    let reports = [];
    let reportError = '';
    let routeError = '';
    try {
      reports = await fetchAdminContainerReports();
    } catch (error) {
      reportError = error.message;
    }

    try {
      await loadSharedRoutes();
    } catch (error) {
      routeError = `No se pudieron cargar las rutas compartidas: ${error.message}`;
    }

    const [fieldEvents, fleet] = await Promise.all([loadFieldEvents(), loadFleet()]);
    container.innerHTML = renderAdminOperations({
      user: session.user,
      routes: getConfiguredRoutes(),
      scheduledRoute: getScheduledRoute(),
      reports,
      reportError,
      routeError,
      ...fieldEvents,
      ...fleet
    });
    attachAdminDashboardContentEvents(container, reports, { ...fieldEvents, ...fleet });
  } catch (error) {
    container.innerHTML = `<p class="admin-report-error" role="alert">No se pudo abrir el panel: ${escapeHtml(error.message)}</p>`;
  }
}

export function renderAdminDashboard() {
  return `
    <div class="app-splash" role="status">
      <img src="/logo-light.svg" alt="Ruta Cero">
      <span class="app-splash-spinner" aria-hidden="true"></span>
      <span class="app-splash-label">Cargando panel…</span>
    </div>
  `;
}

const THEME_KEY = 'ruta-cero-admin-theme';

/** Dark mode for the admin panel only: data-theme on #admin-root switches its color tokens (admin-dashboard.css). */
function setAdminTheme(container, theme) {
  container.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked (private mode): the choice lasts for this visit only.
  }
}

function syncThemeToggle(container, button) {
  if (!button) return;
  const isDark = container.dataset.theme === 'dark';
  // The label names the mode the button switches to; narrow screens hide the text, so it is also in aria-label.
  const label = isDark ? 'Modo claro' : 'Modo oscuro';
  button.setAttribute('aria-label', label);
  button.title = `Cambiar a ${label.toLowerCase()}`;
  button.innerHTML = `${icon(isDark ? 'light_mode' : 'dark_mode')}<span>${label}</span>`;
}

export function attachAdminDashboardEvents(container) {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    // Storage blocked: fall back to the system setting.
  }
  // Without a saved choice, follow the system setting.
  container.dataset.theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  mountAdminDashboard(container);
}
