import test from 'node:test';
import assert from 'node:assert/strict';
import { assignRouteToDate, createRouteId, getConfiguredRoutes, getOperationalDate, getScheduledRoute, saveConfiguredRoutes } from '../src/services/routeConfiguration.js';
import { renderDispatchScreen } from '../src/screens/DispatchScreen.js';
import { renderRouteMapScreen } from '../src/screens/RouteMapScreen.js';
import { renderRouteCompletionScreen } from '../src/screens/RouteCompletionScreen.js';
import { renderRouteScheduleCalendar } from '../src/screens/admin/ScheduleCalendar.js';
import { renderRouteTable } from '../src/screens/admin/RouteTable.js';
import { applyReportProgress } from '../src/domain/route.js';
import { formatElapsedTime as formatElapsedRouteTime } from '../src/utils/format.js';
import { store } from '../src/state/store.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test('el tiempo de ruta calcula la duración desde el inicio y avanza en vivo', () => {
  const startedAt = '2026-10-14T15:00:00.000Z';
  assert.equal(formatElapsedRouteTime(startedAt, '2026-10-14T15:01:00.000Z'), '1 min');
  assert.equal(formatElapsedRouteTime(startedAt, '2026-10-14T16:07:00.000Z'), '1 h 07 min');
  assert.equal(formatElapsedRouteTime('fecha inválida', '2026-10-14T16:07:00.000Z'), 'Sin iniciar');

  const table = renderRouteTable([{
    id: 'R-01',
    zone: 'Centro',
    pointIds: ['CONT-01'],
    stopsDone: 0,
    stopsTotal: 1,
    status: 'active',
    statusLabel: 'En curso',
    lastUpdate: '08:00',
    startedAt
  }]);
  assert.match(table, /data-route-elapsed/);
  assert.doesNotMatch(table, /hace 3 min/);
});

test('la ruta programada para hoy aparece automáticamente en despacho y mapa', () => {
  const previousWindow = globalThis.window;
  const defaultRoutes = getConfiguredRoutes();
  globalThis.window = { localStorage: createMemoryStorage() };

  try {
    const route = {
      id: createRouteId(defaultRoutes),
      zone: 'Ruta Sur',
      pointIds: ['CONT-06', 'CONT-08'],
      scheduledDates: [getOperationalDate()],
      stopsDone: 0,
      stopsTotal: 2,
      lastUpdate: '--:--',
      status: 'scheduled',
      statusLabel: 'Programada',
      syncLabel: 'Sin iniciar'
    };
    const routes = [
      ...defaultRoutes.map((configuredRoute) => ({ ...configuredRoute, scheduledDates: [] })),
      route
    ];
    saveConfiguredRoutes(routes);
    store.applyConfiguredRoute(getScheduledRoute());
    assert.deepEqual(store.state.stops.map((stop) => stop.id), route.pointIds);
    assert.equal(getScheduledRoute().id, route.id);

    const dispatch = renderDispatchScreen(store.state);
    const routeMap = renderRouteMapScreen(store.state);
    assert.match(dispatch, /R-04 · Ruta Sur/);
    assert.doesNotMatch(dispatch, /select-route/);
    assert.match(routeMap, /MAPA DE RUTA · R-04 Ruta Sur/);
    assert.match(routeMap, /CONT-06/);
    assert.match(routeMap, /CONT-08/);
    assert.doesNotMatch(routeMap, /CONT-01/);

    assert.equal(store.startRoute(), route.id);
    assert.equal(store.state.route.status, 'EN RUTA');
    const startedAt = store.state.route.startTimestamp;
    store.applyConfiguredRoute({ ...route, status: 'active', statusDate: getOperationalDate() });
    assert.equal(store.state.route.startTimestamp, startedAt);

    store.completeContainerReport('CONT-06', { fillLevel: 'low', collectedKg: 0 });
    assert.deepEqual(store.state.stops.map((stop) => stop.id), route.pointIds);
    assert.equal(store.state.stops[1].status, 'active');
  } finally {
    store.applyConfiguredRoute(defaultRoutes[0]);
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

test('no selecciona una ruta cuando la fecha no tiene programación', () => {
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage: createMemoryStorage() };
  try {
    saveConfiguredRoutes(getConfiguredRoutes().map((route) => ({ ...route, scheduledDates: [] })));
    assert.equal(getScheduledRoute('2099-01-01'), null);
    assert.equal(getScheduledRoute(), null);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

test('el identificador nuevo avanza desde el número más alto existente', () => {
  assert.equal(createRouteId([{ id: 'R-03' }, { id: 'R-12' }]), 'R-13');
});

test('todas las rutas existentes y nuevas regresan a estación y permiten finalizar', () => {
  const routes = [
    ...getConfiguredRoutes(),
    {
      id: 'R-99',
      zone: 'Ruta nueva',
      pointIds: ['CONT-03', 'CONT-08'],
      stopsDone: 0,
      status: 'scheduled'
    }
  ];

  try {
    for (const route of routes) {
      store.applyConfiguredRoute({ ...route, stopsDone: 0, status: 'scheduled' }, false);
      for (const pointId of route.pointIds) {
        store.completeContainerReport(pointId, { fillLevel: 'low', collectedKg: 0 });
      }

      assert.equal(store.state.activeContainerId, 'ESTACION-01', route.id);
      assert.equal(store.state.stops.at(-1).type, 'return-station', route.id);
      const routeMap = renderRouteMapScreen(store.state);
      assert.match(routeMap, /ESTACIÓN DE REGRESO/, route.id);
      assert.match(routeMap, /FINALIZAR RUTA/, route.id);
      assert.match(routeMap, /24\.106111%2C-110\.344054/, route.id);

      // A server refresh with every point reported keeps the unit heading to the station.
      store.applyConfiguredRoute({
        ...route,
        stopsDone: route.pointIds.length,
        completedPointIds: route.pointIds,
        status: 'active'
      }, false);
      assert.equal(store.state.route.returning, true, route.id);
      assert.equal(store.state.route.status, 'EN RUTA', route.id);
      assert.equal(store.state.activeContainerId, 'ESTACION-01', route.id);

      store.setDashboardPhoto('data:image/jpeg;base64,route-evidence');
      assert.match(renderRouteCompletionScreen(store.state), /FINALIZAR RUTA/, route.id);
      assert.equal(store.completeRoute(), true, route.id);
      assert.equal(store.state.route.status, 'COMPLETADA', route.id);

      // Once the server reports the route as completed it stays closed, without a return leg.
      store.applyConfiguredRoute({
        ...route,
        stopsDone: route.pointIds.length,
        completedPointIds: route.pointIds,
        status: 'completed'
      }, false);
      assert.equal(store.state.route.returning, false, route.id);
      assert.equal(store.state.route.status, 'COMPLETADA', route.id);
      assert.equal(store.state.stops.some((stop) => stop.type === 'return-station'), false, route.id);
    }
  } finally {
    store.setDashboardPhoto(null);
    store.applyConfiguredRoute(getConfiguredRoutes()[0], false);
  }
});

test('los reportes previos actualizan el avance por puntos únicos de cada ruta', () => {
  const [route] = applyReportProgress([{
    id: 'R-01',
    zone: 'Centro Histórico',
    pointIds: ['CONT-01', 'CONT-02'],
    scheduledDates: ['2026-10-08'],
    stopsDone: 0,
    stopsTotal: 2,
    lastUpdate: '--:--',
    status: 'scheduled',
    statusLabel: 'Programada',
    syncLabel: 'Sin iniciar'
  }], [{
    route_id: 'R-01',
    container_id: 'CONT-01',
    created_at: '2026-10-08T10:00:00.000Z'
  }, {
    route_id: 'R-01',
    container_id: 'CONT-01',
    created_at: '2026-10-08T11:00:00.000Z'
  }, {
    route_id: 'R-02',
    container_id: 'CONT-02',
    created_at: '2026-10-08T12:00:00.000Z'
  }], '2026-10-08');

  assert.equal(route.stopsDone, 1);
  assert.equal(route.status, 'active');
  assert.equal(route.statusLabel, 'En curso');
  assert.equal(route.lastUpdate, new Date('2026-10-08T11:00:00.000Z').toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: false
  }));
});

test('el avance de una ruta programada excluye reportes de otras fechas', () => {
  const [route] = applyReportProgress([{
    id: 'R-12',
    zone: 'Ruta futura',
    pointIds: ['CONT-01', 'CONT-02'],
    scheduledDates: ['2026-10-08'],
    stopsDone: 2,
    stopsTotal: 2,
    lastUpdate: '12:00',
    status: 'completed',
    statusLabel: 'Completada',
    syncLabel: 'Sin iniciar'
  }], [{
    route_id: 'R-12',
    container_id: 'CONT-01',
    created_at: '2026-10-07T10:00:00.000Z'
  }], '2026-10-08');

  assert.equal(route.stopsDone, 0);
  assert.equal(route.lastUpdate, '--:--');
  assert.equal(route.status, 'scheduled');
  assert.equal(route.statusLabel, 'Programada');
});

test('una ruta puede asignarse a varios días y cada día solo conserva una ruta', () => {
  const routes = [
    { id: 'R-01', scheduledDates: ['2026-10-13', '2026-10-15'] },
    { id: 'R-02', scheduledDates: [] }
  ];

  const reassigned = assignRouteToDate(routes, '2026-10-13', 'R-02');
  assert.deepEqual(reassigned[0].scheduledDates, ['2026-10-15']);
  assert.deepEqual(reassigned[1].scheduledDates, ['2026-10-13']);
  assert.equal(reassigned.filter((route) => route.scheduledDates.includes('2026-10-13')).length, 1);
});

test('el calendario presenta los días y la ruta asignada a la fecha seleccionada', () => {
  const html = renderRouteScheduleCalendar([{
    id: 'R-05',
    zone: 'Centro',
    scheduledDates: ['2026-10-13']
  }], '2026-10-13', new Date(2026, 9, 1, 12), [{
    container_id: 'CONT-01',
    route_id: 'R-05',
    created_at: '2026-10-13T15:30:00.000Z'
  }]);

  assert.match(html, /octubre de 2026/);
  assert.match(html, /data-calendar-date="2026-10-13"/);
  assert.match(html, /R-05 · Centro/);
  assert.match(html, /Guardar asignación/);
  assert.match(html, /1 reporte/);
  assert.match(html, /data-calendar-report-index="0"/);
  assert.match(html, /CONT-01/);
  assert.doesNotMatch(html, /data-calendar-date="2026-10-13"[^>]*disabled/);
});

test('el calendario permite consultar reportes pasados pero bloquea cambiar su asignación', () => {
  const html = renderRouteScheduleCalendar([], '2026-10-13', new Date(2026, 9, 1, 12), [{
    container_id: 'CONT-02',
    route_id: 'R-02',
    created_at: '2026-10-13T15:30:00.000Z'
  }]);

  assert.match(html, /CONT-02/);
  assert.match(html, /Las fechas pasadas son de solo lectura/);
  assert.match(html, /<button type="submit" class="admin-button admin-button-dark" disabled>/);
});
