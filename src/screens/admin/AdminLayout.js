import { collectionPoints } from '../../data/collectionPoints.js';
import { getReportsForDate } from '../../domain/route.js';
import { getOperationalDate } from '../../services/routeConfiguration.js';
import { escapeHtml, icon } from '../../utils/html.js';
import { renderCollectionPointTable } from './CollectionPoints.js';
import { renderClosureRows, renderFieldEventDialogShell, renderFuelRows, renderIncidentRows, renderInspectionRows } from './FieldEvents.js';
import { renderFleetSection } from './Fleet.js';
import { formatLongDate, parseDateKey } from './format.js';
import { renderReportDialogShell, renderReportRows } from './Reports.js';
import { renderSummaryDialogShell } from './Summary.js';
import { renderRouteEditorDialog, renderRouteTable } from './RouteTable.js';
import { renderRouteScheduleCalendar } from './ScheduleCalendar.js';

// Chevron that folds a long list; the sections start folded so the overview stays short.
const sectionToggle = `<button type="button" class="admin-section-toggle" aria-expanded="false" aria-label="Mostrar lista">${icon('expand_more')}</button>`;

/** Full admin panel: sidebar, KPIs, reports, calendar, routes, incidents and points. */
export function renderAdminOperations({
  user, routes, scheduledRoute, reports, incidents = [], fuelLoads = [], inspections = [], closures = [], fleet = [],
  reportError = '', routeError = '', fieldEventError = '', fleetError = ''
}) {
  const today = getOperationalDate();
  const todaysReports = getReportsForDate(reports, today);
  const email = escapeHtml(user.email || 'Administrador');

  return `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <a class="admin-brand" href="/?mode=admin" aria-label="Ruta Cero, resumen administrativo">
          <span class="admin-brand-mark">${icon('recycling')}</span>
          <span><strong>RUTA CERO</strong><small>CONTROL OPERATIVO</small></span>
        </a>

        <div class="admin-nav-label">OPERACIÓN</div>
        <nav class="admin-nav" aria-label="Navegación administrativa">
          <a class="admin-nav-link is-active" href="#overview" aria-current="page">${icon('space_dashboard')}<span>Resumen</span></a>
          <a class="admin-nav-link" href="#schedule">${icon('calendar_month')}<span>Programar rutas</span></a>
          <a class="admin-nav-link" href="#reports">${icon('inventory_2')}<span>Reportes de contenedores</span></a>
          <a class="admin-nav-link" href="#alerts">${icon('notifications_active')}<span>Incidencias</span><span class="admin-nav-count nav-count-alert" data-incident-count>${incidents.length}</span></a>
          <a class="admin-nav-link" href="#fuel">${icon('local_gas_station')}<span>Combustible</span></a>
          <a class="admin-nav-link" href="#inspections">${icon('fact_check')}<span>Inspecciones</span></a>
          <a class="admin-nav-link" href="#closures">${icon('flag')}<span>Cierres de ruta</span></a>
          <a class="admin-nav-link" href="#points">${icon('location_on')}<span>Puntos</span><span class="admin-nav-count">${collectionPoints.length}</span></a>
          <a class="admin-nav-link" href="#routes">${icon('alt_route')}<span>Rutas</span><span class="admin-nav-count" id="admin-route-nav-count">${routes.length}</span></a>
          <a class="admin-nav-link" href="#fleet">${icon('groups')}<span>Personal y unidades</span></a>
        </nav>

        <div class="admin-sidebar-foot">
          <div class="admin-network-state"><span class="network-indicator"></span><span><strong>Base de datos conectada</strong><small>Acceso administrativo</small></span></div>
          <a class="admin-field-link" href="/?mode=field">${icon('open_in_new')}<span>Abrir vista de campo</span></a>
        </div>
      </aside>

      <div class="admin-workspace">
        <header class="admin-topbar">
          <div class="admin-breadcrumb">Ruta Cero <span>/</span> Administración</div>
          <div class="admin-topbar-actions">
            <span class="admin-demo-pill"><i></i> REPORTES EN VIVO</span>
            <div class="admin-profile" aria-label="Sesión de ${email}">
              <span class="admin-avatar">${escapeHtml((user.email || 'AD').slice(0, 2).toUpperCase())}</span><span class="admin-profile-name">${email}</span>
            </div>
            <button type="button" class="admin-button admin-theme-toggle" id="admin-theme-toggle">${icon('dark_mode')}<span>Modo oscuro</span></button>
            <button type="button" class="admin-button" id="admin-signout">Cerrar sesión</button>
          </div>
        </header>

        <main class="admin-content">
          <section class="admin-page-heading" id="overview">
            <div>
              <div class="admin-eyebrow">CENTRO DE OPERACIONES <span>·</span> ${formatLongDate(new Date())}</div>
              <h1>Resumen del día</h1>
              <p>Estado de rutas, cobertura y actividad de la flota.</p>
            </div>
            <div class="admin-heading-actions">
              <button type="button" class="admin-button admin-button-dark" id="btn-generate-summary">${icon('summarize')}<span>Generar resumen</span></button>
            </div>
          </section>

          <section class="admin-kpi-grid" aria-label="Indicadores de operación">
            <article class="admin-kpi kpi-routes">
              <div class="admin-kpi-top"><span>RUTAS CONFIGURADAS</span>${icon('alt_route')}</div>
              <div class="admin-kpi-value" id="admin-configured-routes-count">${routes.length}</div>
              <div class="admin-kpi-foot"><span class="kpi-positive-dot"></span> <span id="admin-scheduled-routes-count">0 programadas hoy</span></div>
            </article>
            <article class="admin-kpi kpi-coverage">
              <div class="admin-kpi-top"><span>PUNTOS ATENDIDOS HOY</span>${icon('location_on')}</div>
              <div class="admin-kpi-value"><span id="admin-points-done-today">0</span><span class="kpi-denominator">/<span id="admin-points-total-today">0</span></span></div>
              <div class="admin-kpi-foot"><span class="kpi-positive-dot"></span> Puntos de la ruta programada hoy</div>
            </article>
            <article class="admin-kpi kpi-delay">
              <div class="admin-kpi-top"><span>ESTADO DE RUTA</span>${icon('alt_route')}</div>
              <div class="admin-kpi-value" id="admin-active-route-id">${escapeHtml(scheduledRoute?.id || 'Sin ruta')}</div>
              <div class="admin-kpi-foot"><span class="kpi-neutral-dot"></span> <span id="admin-active-route-progress">${scheduledRoute ? `${scheduledRoute.statusLabel} · ${scheduledRoute.stopsDone} de ${scheduledRoute.pointIds.length} puntos atendidos hoy` : 'No programada para hoy'}</span></div>
            </article>
            <article class="admin-kpi kpi-sync">
              <div class="admin-kpi-top"><span>REPORTES DE HOY</span>${icon('cloud_upload')}</div>
              <div class="admin-kpi-value" id="admin-reports-today-count">0</div>
              <div class="admin-kpi-foot"><span class="kpi-positive-dot"></span> Guardados en la base de datos</div>
            </article>
          </section>

          <section class="admin-section admin-schedule-section" id="schedule">
            <div class="admin-section-heading">
              <div><div class="admin-section-kicker">CALENDARIO OPERATIVO</div><h2>Programar rutas</h2><p>Selecciona un día y asigna la ruta que utilizará el equipo de campo.</p></div>
            </div>
            <div class="admin-calendar-container" id="admin-calendar-container">${renderRouteScheduleCalendar(routes, today, parseDateKey(today), reports)}</div>
          </section>

          <section class="admin-section admin-reports-section is-collapsed" id="reports">
            <div class="admin-section-heading">
              <div><div class="admin-section-kicker">REGISTROS GUARDADOS EN LA BASE DE DATOS</div><h2>Reportes de contenedores <span class="admin-heading-count" id="admin-report-count">${todaysReports.length}</span>${sectionToggle}</h2></div>
              <div class="admin-report-actions">
                <button type="button" class="admin-button" id="admin-toggle-all-reports">${icon('list')}<span>Ver todos</span></button>
                <button type="button" class="admin-button" id="admin-refresh-reports">${icon('refresh')}<span>Actualizar</span></button>
              </div>
            </div>
            ${reportError ? `<p class="admin-report-error" id="admin-report-message" role="alert">${escapeHtml(reportError)}</p>` : '<p class="admin-report-message" id="admin-report-message" role="status" aria-live="polite"></p>'}
            <div class="admin-points-table-wrap admin-reports-table-wrap">
              <table class="admin-points-table admin-reports-table">
                <thead><tr><th scope="col">FECHA</th><th scope="col">CONTENEDOR</th><th scope="col">RUTA</th><th scope="col">LLENADO</th><th scope="col">RECOLECTADO</th><th scope="col">MATERIALES</th><th scope="col">INCIDENCIAS</th><th scope="col">DETALLE</th></tr></thead>
                <tbody id="admin-report-rows">${renderReportRows(todaysReports)}</tbody>
              </table>
            </div>
          </section>

          <section class="admin-section admin-reports-section admin-alerts-section is-collapsed" id="alerts">
            <div class="admin-section-heading">
              <div><div class="admin-section-kicker">REQUIERE ATENCIÓN · <span id="admin-incident-critical-count">${incidents.filter((incident) => incident.severity === 'high').length}</span> DE GRAVEDAD ALTA</div><h2>Incidencias <span class="admin-heading-count alert-count" data-incident-count>${incidents.length}</span>${sectionToggle}</h2></div>
            </div>
            ${fieldEventError ? `<p class="admin-report-error" role="alert">${escapeHtml(fieldEventError)}</p>` : ''}
            <div class="admin-points-table-wrap admin-reports-table-wrap">
              <table class="admin-points-table admin-reports-table">
                <thead><tr><th scope="col">FECHA</th><th scope="col">UNIDAD</th><th scope="col">RUTA</th><th scope="col">TIPO</th><th scope="col">GRAVEDAD</th><th scope="col">DESCRIPCIÓN</th><th scope="col">DETALLE</th></tr></thead>
                <tbody id="admin-incident-rows">${renderIncidentRows(incidents)}</tbody>
              </table>
            </div>
          </section>

          <section class="admin-section admin-reports-section is-collapsed" id="fuel">
            <div class="admin-section-heading">
              <div><div class="admin-section-kicker">CARGAS EN GASOLINERÍA · ÚLTIMAS 100</div><h2>Combustible <span class="admin-heading-count" id="admin-fuel-count">${fuelLoads.length}</span>${sectionToggle}</h2></div>
            </div>
            ${fieldEventError ? `<p class="admin-report-error" role="alert">${escapeHtml(fieldEventError)}</p>` : ''}
            <div class="admin-points-table-wrap admin-reports-table-wrap">
              <table class="admin-points-table admin-reports-table">
                <thead><tr><th scope="col">FECHA</th><th scope="col">UNIDAD</th><th scope="col">RUTA</th><th scope="col">LITROS</th><th scope="col">IMPORTE</th><th scope="col">ODÓMETRO</th><th scope="col">TICKET</th></tr></thead>
                <tbody id="admin-fuel-rows">${renderFuelRows(fuelLoads)}</tbody>
              </table>
            </div>
          </section>

          <section class="admin-section admin-reports-section is-collapsed" id="inspections">
            <div class="admin-section-heading">
              <div><div class="admin-section-kicker">INSPECCIÓN 360° AL DESPACHAR · ÚLTIMAS 100</div><h2>Inspecciones <span class="admin-heading-count" id="admin-inspection-count">${inspections.length}</span>${sectionToggle}</h2></div>
            </div>
            ${fieldEventError ? `<p class="admin-report-error" role="alert">${escapeHtml(fieldEventError)}</p>` : ''}
            <div class="admin-points-table-wrap admin-reports-table-wrap">
              <table class="admin-points-table admin-reports-table">
                <thead><tr><th scope="col">FECHA</th><th scope="col">UNIDAD</th><th scope="col">RUTA</th><th scope="col">COMBUSTIBLE</th><th scope="col">REGULAR</th><th scope="col">MAL</th><th scope="col">DETALLE</th></tr></thead>
                <tbody id="admin-inspection-rows">${renderInspectionRows(inspections)}</tbody>
              </table>
            </div>
          </section>

          <section class="admin-section admin-reports-section is-collapsed" id="closures">
            <div class="admin-section-heading">
              <div><div class="admin-section-kicker">EVIDENCIA AL REGRESAR A ESTACIÓN · ÚLTIMOS 100</div><h2>Cierres de ruta <span class="admin-heading-count" id="admin-closure-count">${closures.length}</span>${sectionToggle}</h2></div>
            </div>
            ${fieldEventError ? `<p class="admin-report-error" role="alert">${escapeHtml(fieldEventError)}</p>` : ''}
            <div class="admin-points-table-wrap admin-reports-table-wrap">
              <table class="admin-points-table admin-reports-table">
                <thead><tr><th scope="col">FECHA</th><th scope="col">UNIDAD</th><th scope="col">RUTA</th><th scope="col">EVIDENCIA</th></tr></thead>
                <tbody id="admin-closure-rows">${renderClosureRows(closures)}</tbody>
              </table>
            </div>
          </section>

          <div class="admin-bottom-grid">
            <section class="admin-section admin-points-section" id="points">
              <div class="admin-section-heading">
                <div><div class="admin-section-kicker">COBERTURA DE LA CIUDAD</div><h2>Puntos de recolección <span class="admin-heading-count">${String(collectionPoints.length).padStart(2, '0')}</span></h2></div>
                <a class="admin-text-link" href="#points">Ver los ${collectionPoints.length} puntos ${icon('arrow_forward')}</a>
              </div>
              <div class="admin-points-table-wrap">
                <table class="admin-points-table">
                  <thead><tr><th scope="col">PUNTO DE RECOLECCIÓN</th><th scope="col">ÚLTIMA VISITA</th><th scope="col">TIEMPO TRANSCURRIDO</th></tr></thead>
                  <tbody id="admin-points-rows">${renderCollectionPointTable(reports)}</tbody>
                </table>
              </div>
              <div class="admin-points-foot"><span><i class="point-legend-overdue"></i>7 días o más</span><span><i class="point-legend-due"></i>4–6 días</span><span><i class="point-legend-recent"></i>0–3 días</span><strong>Orden: CONT-01 al CONT-08</strong></div>
            </section>
          </div>

          <section class="admin-section admin-routes-section" id="routes">
            <div class="admin-section-heading">
              <div><div class="admin-section-kicker">PUNTOS DEFINIDOS POR RECORRIDO</div><h2>Rutas configuradas <span class="admin-heading-count" id="admin-routes-count">${routes.length}</span></h2></div>
              <button type="button" class="admin-button admin-button-dark" id="admin-create-route">${icon('add')}<span>Nueva ruta</span></button>
            </div>
            <div class="admin-table-toolbar">
              <label class="admin-search">${icon('search')}<span class="sr-only">Buscar rutas</span><input type="search" id="route-search" placeholder="Buscar ruta, zona o punto"></label>
              <label class="admin-filter-select"><span class="sr-only">Filtrar rutas por estado</span><select id="route-status-filter"><option value="all">Todos los estados</option><option value="unscheduled">No programadas</option><option value="scheduled">Programadas</option><option value="active">En curso</option><option value="completed">Completadas</option></select>${icon('expand_more')}</label>
            </div>
            <p class="admin-route-message${routeError ? ' is-error' : ''}" id="admin-route-message" role="status" aria-live="polite">${escapeHtml(routeError)}</p>
            <div class="admin-table-scroll">
              <table class="admin-route-table">
                <thead><tr><th scope="col">RUTA / ZONA</th><th scope="col">PUNTOS INCLUIDOS</th><th scope="col">AVANCE DEL RECORRIDO</th><th scope="col">ESTADO</th><th scope="col">ACTUALIZACIÓN</th><th scope="col">SINCRONIZACIÓN</th><th scope="col">ACCIONES</th></tr></thead>
                <tbody id="admin-route-rows">${renderRouteTable(routes)}</tbody>
              </table>
              <div class="admin-empty-state" id="admin-route-empty" hidden>${icon('search_off')}<span>No hay rutas que coincidan con esos filtros.</span></div>
            </div>
            <div class="admin-table-footer"><span id="admin-route-count">${routes.length} rutas configuradas</span><span id="admin-selected-route-label">${scheduledRoute ? `Ruta de hoy: ${escapeHtml(scheduledRoute.id)} · ${escapeHtml(scheduledRoute.zone)}` : 'Sin ruta programada para hoy'}</span></div>
            ${renderRouteEditorDialog()}
          </section>

          ${renderFleetSection(fleet, fleetError)}

          ${renderReportDialogShell()}
          ${renderSummaryDialogShell()}
          ${renderFieldEventDialogShell()}

          <footer class="admin-footer"><span>RUTA CERO <span>·</span> PANEL ADMINISTRATIVO</span><span>Reportes conectados a la base de datos</span></footer>
        </main>
      </div>
    </div>
  `;
}
