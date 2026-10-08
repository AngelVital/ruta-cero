import { getFillLevelLabel, normalizeFillLevel } from '../components/CapacityMeter.js';

const getSupabaseService = () => import('../services/supabase.js');
const getSupabaseSession = async () => (await getSupabaseService()).getSupabaseSession();
const signInAdmin = async (...args) => (await getSupabaseService()).signInAdmin(...args);
const signOutAdmin = async (...args) => (await getSupabaseService()).signOutAdmin(...args);
const isCurrentUserAdmin = async (...args) => (await getSupabaseService()).isCurrentUserAdmin(...args);
const fetchAdminContainerReports = async (...args) => (await getSupabaseService()).fetchAdminContainerReports(...args);

const collectionPoints = [
  { id: 'CONT-01', name: 'Ayuntamiento', routeId: 'R-01', lastCollectedOn: '2026-09-30', status: 'completed' },
  { id: 'CONT-02', name: 'CREE', routeId: 'R-02', lastCollectedOn: '2026-09-23', status: 'pending' },
  { id: 'CONT-03', name: 'Parque Morelos', routeId: 'R-01', lastCollectedOn: '2026-09-30', status: 'completed' },
  { id: 'CONT-04', name: 'Malecón', routeId: 'R-01', lastCollectedOn: '2026-09-21', status: 'active' },
  { id: 'CONT-05', name: 'UABCS', routeId: 'R-03', lastCollectedOn: '2026-09-25', status: 'pending' },
  { id: 'CONT-06', name: 'Camino Real', routeId: 'R-03', lastCollectedOn: '2026-09-18', status: 'pending' },
  { id: 'CONT-07', name: 'SEP', routeId: 'R-02', lastCollectedOn: '2026-09-26', status: 'pending' },
  { id: 'CONT-08', name: 'El Centenario', routeId: 'R-03', lastCollectedOn: '2026-09-15', status: 'pending' }
];

const demoRoutes = [
  {
    id: 'R-01',
    zone: 'Centro Histórico',
    pointIds: ['CONT-01', 'CONT-03', 'CONT-04'],
    stopsDone: 2,
    stopsTotal: 3,
    lastUpdate: '09:42',
    status: 'active',
    statusLabel: 'En ruta',
    syncLabel: '1 evento pendiente'
  },
  {
    id: 'R-02',
    zone: 'Sector Norte',
    pointIds: ['CONT-02', 'CONT-07'],
    stopsDone: 0,
    stopsTotal: 2,
    lastUpdate: '--:--',
    status: 'scheduled',
    statusLabel: 'Programada',
    syncLabel: 'Sin iniciar'
  },
  {
    id: 'R-03',
    zone: 'Sector Sur',
    pointIds: ['CONT-05', 'CONT-06', 'CONT-08'],
    stopsDone: 0,
    stopsTotal: 3,
    lastUpdate: '--:--',
    status: 'scheduled',
    statusLabel: 'Programada',
    syncLabel: 'Sin iniciar'
  }
];

const icon = (name, extraClass = '') => `<span class="material-symbols-outlined ${extraClass}" aria-hidden="true">${name}</span>`;

function renderRouteRow(route) {
  const progress = route.stopsTotal ? Math.round((route.stopsDone / route.stopsTotal) * 100) : 0;
  const syncClass = route.syncLabel === '1 evento pendiente' ? 'sync-pending' : 'sync-ok';
  const points = route.pointIds.map((pointId) => `<span class="admin-point-chip">${pointId}</span>`).join('');

  return `
    <tr data-route-status="${route.status}">
      <td>
        <span class="admin-route-id">${route.id}</span>
        <span class="admin-route-zone">${route.zone}</span>
      </td>
      <td>
        <div class="admin-route-points">${points}</div>
        <span class="admin-cell-secondary">${route.pointIds.length} puntos asignados</span>
      </td>
      <td>
        <div class="admin-progress-label"><strong>${route.stopsDone}/${route.stopsTotal}</strong><span>${progress}%</span></div>
        <div class="admin-progress-track" role="progressbar" aria-label="Avance de ${route.id}" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
          <span style="width: ${progress}%"></span>
        </div>
      </td>
      <td><span class="admin-status status-${route.status}"><i></i>${route.statusLabel}</span></td>
      <td><span class="admin-cell-primary">${route.lastUpdate}</span><span class="admin-cell-secondary">${route.lastUpdate === '--:--' ? 'Sin iniciar' : 'hace 3 min'}</span></td>
      <td><span class="admin-sync ${syncClass}"><i></i>${route.syncLabel}</span></td>
    </tr>
  `;
}

function renderCollectionPoint(point) {
  const daysSinceCollection = getDaysSinceCollection(point.lastCollectedOn);
  const ageClass = daysSinceCollection >= 7 ? 'age-overdue' : daysSinceCollection >= 4 ? 'age-due-soon' : 'age-recent';
  const [year, month, day] = point.lastCollectedOn.split('-').map(Number);
  const formattedDate = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date(year, month - 1, day));

  return `
    <tr>
      <td><span class="admin-route-id">${point.id}</span><span class="admin-cell-primary">${point.name}</span></td>
      <td><time datetime="${point.lastCollectedOn}">${formattedDate}</time></td>
      <td><span class="admin-days-badge ${ageClass}">${daysSinceCollection === 0 ? 'Hoy' : `${daysSinceCollection} ${daysSinceCollection === 1 ? 'día' : 'días'}`}</span></td>
      <td>
        <label class="admin-point-route-select"><span class="sr-only">Asignar ruta para ${point.id}</span>
          <select class="admin-point-route" data-point-id="${point.id}">
            ${demoRoutes.map((route) => `<option value="${route.id}" ${point.routeId === route.id ? 'selected' : ''}>${route.id} · ${route.zone}</option>`).join('')}
          </select>${icon('expand_more')}
        </label>
      </td>
    </tr>
  `;
}

function getDaysSinceCollection(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const lastCollection = Date.UTC(year, month - 1, day);
  return Math.max(0, Math.floor((today - lastCollection) / 86400000));
}

function renderRouteTable() {
  return demoRoutes.map(renderRouteRow).join('');
}

function renderCollectionPointTable() {
  return [...collectionPoints]
    .sort((first, second) => getDaysSinceCollection(second.lastCollectedOn) - getDaysSinceCollection(first.lastCollectedOn))
    .map(renderCollectionPoint)
    .join('');
}

function syncRoutePoints() {
  demoRoutes.forEach((route) => {
    const assignedPoints = collectionPoints.filter((point) => point.routeId === route.id);
    route.pointIds = assignedPoints.map((point) => point.id);
    route.stopsTotal = assignedPoints.length;
    route.stopsDone = route.status === 'active'
      ? assignedPoints.filter((point) => point.status === 'completed').length
      : 0;
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderAdminLogin(message = '', showSignOut = false) {
  return `
    <main class="admin-auth-screen">
      <section class="admin-auth-panel" aria-labelledby="admin-auth-title">
        <div class="admin-auth-brand">
          <span class="admin-brand-mark">${icon('recycling')}</span>
          <span><strong>RUTA CERO</strong><small>CONTROL OPERATIVO</small></span>
        </div>
        <div class="admin-section-kicker">ACCESO RESTRINGIDO</div>
        <h1 id="admin-auth-title">Administración</h1>
        <p class="admin-auth-description">Inicia sesión con la cuenta autorizada para consultar los reportes.</p>
        <form id="admin-login-form" class="admin-auth-form">
          <label for="admin-email">Correo electrónico</label>
          <input id="admin-email" name="email" type="email" autocomplete="username" required>
          <label for="admin-password">Contraseña</label>
          <input id="admin-password" name="password" type="password" autocomplete="current-password" required>
          <button class="admin-button admin-button-dark" id="admin-login-submit" type="submit">Iniciar sesión</button>
        </form>
        <p class="admin-auth-message" id="admin-auth-message" role="status" aria-live="polite">${escapeHtml(message)}</p>
        ${showSignOut ? '<button class="admin-auth-signout" id="admin-auth-signout" type="button">Cerrar sesión actual</button>' : ''}
        <a class="admin-auth-back" href="/?mode=field">Volver a operaciones de campo</a>
      </section>
    </main>
  `;
}

export function renderAdminDashboard() {
  return renderAdminLogin();
}

function formatReportDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

const incidentLabels = {
  damaged: 'Contenedor dañado',
  graffiti: 'Grafiti / vandalismo',
  outsideWaste: 'Residuos fuera del contenedor',
  mixedWaste: 'Residuos mezclados'
};

function formatIncidentLabel(value) {
  return incidentLabels[value] || formatReportLabel(value);
}

function renderReportRows(reports) {
  if (!reports.length) {
    return '<tr><td colspan="8">Todavía no hay reportes registrados.</td></tr>';
  }

  return reports.map((report, index) => {
    const materials = Array.isArray(report.materials) ? report.materials.join(', ') : '';
    const fillLevel = normalizeFillLevel(report.fill_level);
    const incidents = report.incidents && typeof report.incidents === 'object'
      ? Object.entries(report.incidents).filter(([, active]) => Boolean(active)).map(([name]) => formatIncidentLabel(name))
      : [];

    return `
      <tr>
        <td><time datetime="${escapeHtml(report.created_at)}">${escapeHtml(formatReportDate(report.created_at))}</time></td>
        <td><span class="admin-route-id">${escapeHtml(report.container_id)}</span></td>
        <td>${escapeHtml(report.route_id)}</td>
        <td><span class="admin-fill-level fill-${fillLevel || 'unknown'}">${escapeHtml(getFillLevelLabel(fillLevel))}</span></td>
        <td>${escapeHtml(report.collected_kg)} kg</td>
        <td>${escapeHtml(materials || 'Sin material')}</td>
        <td>${escapeHtml(incidents.join(', ') || 'Ninguna')}</td>
        <td><button class="admin-report-open" type="button" data-report-index="${index}">${icon('visibility')}<span>Ver detalles</span></button></td>
      </tr>
    `;
  }).join('');
}

function formatReportLabel(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (first) => first.toLocaleUpperCase('es-MX'));
}

function formatReportWeight(value) {
  const weight = Number(value);
  return Number.isFinite(weight)
    ? `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(weight)} kg`
    : 'Peso no especificado';
}

function renderReportDialog(report) {
  const fillLevel = normalizeFillLevel(report.fill_level);
  const materials = Array.isArray(report.materials) ? report.materials : [];
  const materialWeights = report.material_weights && typeof report.material_weights === 'object'
    ? report.material_weights
    : {};
  const materialItems = materials.length
    ? materials.map((material) => `
        <li><span>${escapeHtml(formatReportLabel(material))}</span><strong>${escapeHtml(formatReportWeight(materialWeights[material]))}</strong></li>
      `).join('')
    : '<li class="admin-report-empty-item">Sin materiales registrados</li>';
  const incidents = report.incidents && typeof report.incidents === 'object'
    ? Object.entries(report.incidents).filter(([, active]) => Boolean(active)).map(([name]) => formatIncidentLabel(name))
    : [];
  const incidentItems = incidents.length
    ? incidents.map((name) => `<li>${escapeHtml(name)}</li>`).join('')
    : '<li class="admin-report-empty-item">Sin incidencias</li>';
  const evidence = report.photo_evidence && typeof report.photo_evidence === 'object'
    ? report.photo_evidence
    : {};
  const evidenceLabels = {
    initialExterior: 'Exterior inicial',
    initialInterior: 'Interior inicial',
    finalExterior: 'Exterior final',
    finalInterior: 'Interior final'
  };
  const evidenceItems = Object.keys(evidence).length
    ? Object.entries(evidence).map(([key, value]) => `
        <li><span class="admin-evidence-check">${icon('check')}</span><span>${escapeHtml(evidenceLabels[key] || formatReportLabel(key))}</span><time>${escapeHtml(formatReportDate(value))}</time></li>
      `).join('')
    : '<li class="admin-report-empty-item">Sin evidencia registrada</li>';

  return `
    <div class="admin-report-dialog-meta">
      <span>${icon('inventory_2')} ${escapeHtml(report.container_id)}</span>
      <span>${icon('alt_route')} ${escapeHtml(report.route_id)}</span>
      <time>${escapeHtml(formatReportDate(report.created_at))}</time>
    </div>
    <div class="admin-report-dialog-metrics">
      <div class="admin-report-fill-metric"><span>Nivel del contenedor</span><strong class="admin-fill-level fill-${fillLevel || 'unknown'}">${escapeHtml(getFillLevelLabel(fillLevel))}</strong></div>
      <div><span>Material recolectado</span><strong>${escapeHtml(formatReportWeight(report.collected_kg))}</strong></div>
    </div>
    <div class="admin-report-dialog-sections">
      <section class="admin-report-dialog-section">
        <h3>${icon('recycling')} Materiales</h3>
        <ul class="admin-report-material-list">${materialItems}</ul>
      </section>
      <section class="admin-report-dialog-section">
        <h3>${icon('report_problem')} Incidencias</h3>
        <ul class="admin-report-incident-list">${incidentItems}</ul>
      </section>
      <section class="admin-report-dialog-section admin-report-evidence-section">
        <h3>${icon('photo_camera')} Evidencia registrada</h3>
        <ul class="admin-report-evidence-list">${evidenceItems}</ul>
      </section>
      <section class="admin-report-dialog-section admin-report-comments-section">
        <h3>${icon('chat')} Comentarios</h3>
        <p>${escapeHtml(report.incident_comments || 'Sin comentarios')}</p>
      </section>
    </div>
  `;
}

function renderAdminOperations(user, reports, reportError = '') {
  const today = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());
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
          <a class="admin-nav-link" href="#routes">${icon('alt_route')}<span>Rutas</span><span class="admin-nav-count">3</span></a>
          <a class="admin-nav-link" href="#alerts">${icon('notifications_active')}<span>Incidencias</span><span class="admin-nav-count nav-count-alert">1</span></a>
          <a class="admin-nav-link" href="#points">${icon('location_on')}<span>Puntos</span><span class="admin-nav-count">8</span></a>
        </nav>

        <div class="admin-sidebar-foot">
          <div class="admin-network-state"><span class="network-indicator"></span><span><strong>Supabase conectado</strong><small>Acceso administrativo</small></span></div>
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
            <button type="button" class="admin-button" id="admin-signout">Cerrar sesión</button>
          </div>
        </header>

        <main class="admin-content">
          <section class="admin-page-heading" id="overview">
            <div>
              <div class="admin-eyebrow">CENTRO DE OPERACIONES <span>·</span> ${today}</div>
              <h1>Resumen del día</h1>
              <p>Estado de rutas, cobertura y actividad de la flota.</p>
            </div>
            <div class="admin-heading-actions">
              <label class="admin-date-filter">${icon('calendar_today')}<span>Hoy</span><span class="admin-date-caret">${icon('expand_more')}</span></label>
              <button type="button" class="admin-button admin-button-dark" id="btn-export-routes">${icon('download')}<span>Exportar rutas</span></button>
            </div>
          </section>

          <div class="admin-demo-notice" role="status">
            ${icon('info')}<span>Los reportes se cargan desde Supabase. Los indicadores, rutas y puntos de esta vista siguen siendo datos de demostración.</span>
          </div>

          <section class="admin-section admin-reports-section" id="reports">
            <div class="admin-section-heading">
              <div><div class="admin-section-kicker">REGISTROS GUARDADOS EN SUPABASE</div><h2>Reportes de contenedores <span class="admin-heading-count" id="admin-report-count">${reports.length}</span></h2></div>
              <button type="button" class="admin-button" id="admin-refresh-reports">${icon('refresh')}<span>Actualizar</span></button>
            </div>
            ${reportError ? `<p class="admin-report-error" id="admin-report-message" role="alert">${escapeHtml(reportError)}</p>` : '<p class="admin-report-message" id="admin-report-message" role="status" aria-live="polite"></p>'}
            <div class="admin-points-table-wrap admin-reports-table-wrap">
              <table class="admin-points-table admin-reports-table">
                <thead><tr><th scope="col">FECHA</th><th scope="col">CONTENEDOR</th><th scope="col">RUTA</th><th scope="col">LLENADO</th><th scope="col">RECOLECTADO</th><th scope="col">MATERIALES</th><th scope="col">INCIDENCIAS</th><th scope="col">DETALLE</th></tr></thead>
                <tbody id="admin-report-rows">${renderReportRows(reports)}</tbody>
              </table>
            </div>
          </section>

          <dialog class="admin-report-dialog" id="admin-report-dialog" aria-labelledby="admin-report-dialog-title">
            <header class="admin-report-dialog-header">
              <div><div class="admin-section-kicker">REGISTRO DE RECOLECCIÓN</div><h2 id="admin-report-dialog-title">Detalle del reporte</h2></div>
              <button class="admin-report-dialog-close" type="button" aria-label="Cerrar detalles">${icon('close')}</button>
            </header>
            <div class="admin-report-dialog-content" id="admin-report-dialog-content"></div>
          </dialog>

          <section class="admin-kpi-grid" aria-label="Indicadores de operación">
            <article class="admin-kpi kpi-routes">
              <div class="admin-kpi-top"><span>UNIDAD RECOLECTORA</span>${icon('local_shipping')}</div>
              <div class="admin-kpi-value">01 <small>U-01</small></div>
              <div class="admin-kpi-foot"><span class="kpi-positive-dot"></span> <span id="admin-unit-route">Asignada a R-01</span></div>
            </article>
            <article class="admin-kpi kpi-coverage">
              <div class="admin-kpi-top"><span>PUNTOS ATENDIDOS HOY</span>${icon('location_on')}</div>
              <div class="admin-kpi-value">02<span class="kpi-denominator">/08</span></div>
              <div class="admin-kpi-foot"><span class="kpi-positive-dot"></span> De los 8 puntos de la ciudad</div>
            </article>
            <article class="admin-kpi kpi-delay">
              <div class="admin-kpi-top"><span>RUTA EN CURSO</span>${icon('alt_route')}</div>
              <div class="admin-kpi-value" id="admin-active-route-id">R-01</div>
              <div class="admin-kpi-foot"><span class="kpi-neutral-dot"></span> <span id="admin-active-route-progress">2 de 3 puntos atendidos</span></div>
            </article>
            <article class="admin-kpi kpi-sync">
              <div class="admin-kpi-top"><span>PENDIENTES DE SINCRONIZAR</span>${icon('cloud_upload')}</div>
              <div class="admin-kpi-value">01 <small>evento</small></div>
              <div class="admin-kpi-foot"><span class="kpi-warning-dot"></span> Pendiente en el dispositivo de campo</div>
            </article>
          </section>

          <section class="admin-section admin-routes-section" id="routes">
            <div class="admin-section-heading">
              <div><div class="admin-section-kicker">PUNTOS DEFINIDOS POR RECORRIDO</div><h2>Rutas configuradas <span class="admin-heading-count">3</span></h2></div>
              <a class="admin-text-link" href="#routes">Ver todas las rutas ${icon('arrow_forward')}</a>
            </div>
            <div class="admin-table-toolbar">
              <label class="admin-search">${icon('search')}<span class="sr-only">Buscar rutas</span><input type="search" id="route-search" placeholder="Buscar ruta, zona o punto"></label>
              <label class="admin-filter-select"><span class="sr-only">Filtrar rutas por estado</span><select id="route-status-filter"><option value="all">Todos los estados</option><option value="active">En curso</option><option value="scheduled">Programadas</option></select>${icon('expand_more')}</label>
            </div>
            <div class="admin-table-scroll">
              <table class="admin-route-table">
                <thead><tr><th scope="col">RUTA / ZONA</th><th scope="col">PUNTOS INCLUIDOS</th><th scope="col">AVANCE DEL RECORRIDO</th><th scope="col">ESTADO</th><th scope="col">ACTUALIZACIÓN</th><th scope="col">SINCRONIZACIÓN</th></tr></thead>
                <tbody id="admin-route-rows">${renderRouteTable()}</tbody>
              </table>
              <div class="admin-empty-state" id="admin-route-empty" hidden>${icon('search_off')}<span>No hay rutas que coincidan con esos filtros.</span></div>
            </div>
            <div class="admin-table-footer"><span id="admin-route-count">3 rutas configuradas</span><span>Una unidad · una ruta en curso</span></div>
          </section>

          <div class="admin-bottom-grid">
            <section class="admin-section admin-alerts-section" id="alerts">
              <div class="admin-section-heading">
                <div><div class="admin-section-kicker">REQUIERE ATENCIÓN</div><h2>Incidencias <span class="admin-heading-count alert-count">1</span></h2></div>
                <a class="admin-text-link" href="#alerts">Ver actividad ${icon('arrow_forward')}</a>
              </div>
              <article class="admin-alert-row alert-row-sync">
                <span class="admin-alert-icon">${icon('cloud_off')}</span>
                <div class="admin-alert-copy"><strong>Sincronización pendiente</strong><p>U-01 · 1 registro guardado localmente</p></div>
                <time>09:42</time>
              </article>
            </section>

            <section class="admin-section admin-points-section" id="points">
              <div class="admin-section-heading">
                <div><div class="admin-section-kicker">COBERTURA DE LA CIUDAD</div><h2>Puntos de recolección <span class="admin-heading-count">08</span></h2></div>
                <a class="admin-text-link" href="#points">Ver los 8 puntos ${icon('arrow_forward')}</a>
              </div>
              <div class="admin-points-table-wrap">
                <table class="admin-points-table">
                  <thead><tr><th scope="col">PUNTO DE RECOLECCIÓN</th><th scope="col">ÚLTIMA RECOLECCIÓN</th><th scope="col">TIEMPO TRANSCURRIDO</th><th scope="col">RUTA ASIGNADA</th></tr></thead>
                  <tbody id="admin-points-rows">${renderCollectionPointTable()}</tbody>
                </table>
              </div>
              <div class="admin-points-foot"><span><i class="point-legend-overdue"></i>7 días o más</span><span><i class="point-legend-due"></i>4–6 días</span><span><i class="point-legend-recent"></i>0–3 días</span><strong>Orden: más días sin recolección</strong></div>
            </section>
          </div>

          <footer class="admin-footer"><span>RUTA CERO <span>·</span> PANEL ADMINISTRATIVO</span><span>Reportes conectados a Supabase</span></footer>
        </main>
      </div>
    </div>
  `;
}

function filterRoutes(searchValue, statusValue) {
  const query = searchValue.trim().toLocaleLowerCase('es-MX');
  return demoRoutes.filter((route) => {
    const matchesStatus = statusValue === 'all' || route.status === statusValue;
    const searchableText = `${route.id} ${route.zone} ${route.pointIds.join(' ')}`.toLocaleLowerCase('es-MX');
    return matchesStatus && searchableText.includes(query);
  });
}

function attachAdminDashboardContentEvents(container, initialReports) {
  let reports = initialReports;
  const search = container.querySelector('#route-search');
  const statusFilter = container.querySelector('#route-status-filter');
  const rows = container.querySelector('#admin-route-rows');
  const emptyState = container.querySelector('#admin-route-empty');
  const routeCount = container.querySelector('#admin-route-count');
  const activeRouteId = container.querySelector('#admin-active-route-id');
  const activeRouteProgress = container.querySelector('#admin-active-route-progress');
  const unitRoute = container.querySelector('#admin-unit-route');

  const updateRoutes = () => {
    const filteredRoutes = filterRoutes(search?.value || '', statusFilter?.value || 'all');
    rows.innerHTML = filteredRoutes.map(renderRouteRow).join('');
    rows.hidden = filteredRoutes.length === 0;
    emptyState.hidden = filteredRoutes.length > 0;
    routeCount.textContent = `${filteredRoutes.length} de ${demoRoutes.length} rutas configuradas`;
  };

  search?.addEventListener('input', updateRoutes);
  statusFilter?.addEventListener('change', updateRoutes);

  const reportRows = container.querySelector('#admin-report-rows');
  const reportDialog = container.querySelector('#admin-report-dialog');
  reportRows?.addEventListener('click', (event) => {
    const button = event.target.closest('.admin-report-open');
    if (!button) return;

    const report = reports[Number(button.dataset.reportIndex)];
    if (!report || !reportDialog) return;

    container.querySelector('#admin-report-dialog-content').innerHTML = renderReportDialog(report);
    reportDialog.showModal();
  });

  container.querySelector('.admin-report-dialog-close')?.addEventListener('click', () => reportDialog?.close());
  reportDialog?.addEventListener('click', (event) => {
    if (event.target === reportDialog) reportDialog.close();
  });

  container.querySelectorAll('.admin-point-route').forEach((select) => {
    select.addEventListener('change', (event) => {
      const point = collectionPoints.find((item) => item.id === event.currentTarget.dataset.pointId);
      if (!point) return;

      point.routeId = event.currentTarget.value;
      syncRoutePoints();
      updateRoutes();

      const activeRoute = demoRoutes.find((route) => route.status === 'active');
      if (activeRoute) {
        activeRouteId.textContent = activeRoute.id;
        activeRouteProgress.textContent = `${activeRoute.stopsDone} de ${activeRoute.stopsTotal} puntos atendidos`;
        unitRoute.textContent = `Asignada a ${activeRoute.id}`;
      }
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

  container.querySelector('#btn-export-routes')?.addEventListener('click', () => {
    const csvRows = [
      ['Ruta', 'Zona', 'Puntos incluidos', 'Puntos atendidos', 'Total de puntos', 'Estado', 'Última actualización', 'Sincronización'],
      ...demoRoutes.map((route) => [route.id, route.zone, route.pointIds.join(' '), route.stopsDone, route.stopsTotal, route.statusLabel, route.lastUpdate, route.syncLabel])
    ];
    const csv = csvRows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const file = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'ruta-cero-rutas-demo.csv';
    downloadLink.click();
    URL.revokeObjectURL(url);
  });

  container.querySelector('#admin-signout')?.addEventListener('click', async () => {
    try {
      await signOutAdmin();
      showAdminLogin(container, 'Sesión cerrada.');
    } catch (error) {
      const message = container.querySelector('#admin-report-message');
      if (message) message.textContent = error.message;
    }
  });

  container.querySelector('#admin-refresh-reports')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const message = container.querySelector('#admin-report-message');
    button.disabled = true;
    if (message) message.textContent = 'Actualizando reportes…';

    try {
      reports = await fetchAdminContainerReports();
      container.querySelector('#admin-report-rows').innerHTML = renderReportRows(reports);
      container.querySelector('#admin-report-count').textContent = String(reports.length);
      if (message) message.textContent = `Actualizado: ${formatReportDate(new Date().toISOString())}`;
    } catch (error) {
      if (message) message.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

function showAdminLogin(container, message = '', showSignOut = false) {
  container.innerHTML = renderAdminLogin(message, showSignOut);
  attachAdminLoginEvents(container, showSignOut);
}

function attachAdminLoginEvents(container, showSignOut = false) {
  const form = container.querySelector('#admin-login-form');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const button = container.querySelector('#admin-login-submit');
    const message = container.querySelector('#admin-auth-message');
    button.disabled = true;
    message.textContent = 'Verificando acceso…';

    try {
      await signInAdmin(email, password);
      await mountAdminDashboard(container);
    } catch (error) {
      message.textContent = error.message;
      button.disabled = false;
    }
  });

  if (showSignOut) {
    container.querySelector('#admin-auth-signout')?.addEventListener('click', async () => {
      try {
        await signOutAdmin();
        showAdminLogin(container, 'Sesión cerrada.');
      } catch (error) {
        const message = container.querySelector('#admin-auth-message');
        if (message) message.textContent = error.message;
      }
    });
  }
}

async function mountAdminDashboard(container) {
  let session;
  try {
    session = await getSupabaseSession();
  } catch (error) {
    showAdminLogin(container, error.message);
    return;
  }

  if (!session) {
    showAdminLogin(container);
    return;
  }

  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      showAdminLogin(container, 'Esta cuenta no tiene permisos de administrador.', true);
      return;
    }

    let reports = [];
    let reportError = '';
    try {
      reports = await fetchAdminContainerReports();
    } catch (error) {
      reportError = error.message;
    }

    container.innerHTML = renderAdminOperations(session.user, reports, reportError);
    attachAdminDashboardContentEvents(container, reports);
  } catch (error) {
    showAdminLogin(container, error.message, true);
  }
}

export function attachAdminDashboardEvents(container) {
  mountAdminDashboard(container);
}
