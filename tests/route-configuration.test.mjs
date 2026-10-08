import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouteId, getConfiguredRoutes, getSelectedRoute, saveConfiguredRoutes } from '../src/services/routeConfiguration.js';
import { renderDispatchScreen } from '../src/screens/DispatchScreen.js';
import { renderRouteMapScreen } from '../src/screens/RouteMapScreen.js';
import { applyReportProgress } from '../src/screens/AdminDashboard.js';
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

test('la ruta seleccionada y sus puntos aparecen en despacho y mapa', () => {
  const previousWindow = globalThis.window;
  const defaultRoutes = getConfiguredRoutes();
  globalThis.window = { localStorage: createMemoryStorage() };

  try {
    const route = {
      id: createRouteId(defaultRoutes),
      zone: 'Ruta Sur',
      pointIds: ['CONT-06', 'CONT-08'],
      stopsDone: 0,
      stopsTotal: 2,
      lastUpdate: '--:--',
      status: 'scheduled',
      statusLabel: 'Programada',
      syncLabel: 'Sin iniciar'
    };
    saveConfiguredRoutes([...defaultRoutes, route], route.id);
    assert.equal(store.selectRoute(route.id), true);
    assert.deepEqual(store.state.stops.map((stop) => stop.id), route.pointIds);
    assert.equal(getSelectedRoute().id, route.id);

    const dispatch = renderDispatchScreen(store.state);
    const routeMap = renderRouteMapScreen(store.state);
    assert.match(dispatch, /R-04 · Ruta Sur/);
    assert.match(routeMap, /MAPA DE RUTA · R-04 Ruta Sur/);
    assert.match(routeMap, /CONT-06/);
    assert.match(routeMap, /CONT-08/);
    assert.doesNotMatch(routeMap, /CONT-01/);

    assert.equal(store.startRoute(), route.id);
    assert.equal(store.state.route.status, 'EN RUTA');
    const startedAt = store.state.route.startTimestamp;
    store.applyConfiguredRoute({ ...route, status: 'active' });
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

test('el identificador nuevo avanza desde el número más alto existente', () => {
  assert.equal(createRouteId([{ id: 'R-03' }, { id: 'R-12' }]), 'R-13');
});

test('los reportes previos actualizan el avance por puntos únicos de cada ruta', () => {
  const [route] = applyReportProgress([{
    id: 'R-01',
    zone: 'Centro Histórico',
    pointIds: ['CONT-01', 'CONT-02'],
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
  }]);

  assert.equal(route.stopsDone, 1);
  assert.equal(route.status, 'active');
  assert.equal(route.statusLabel, 'En ruta');
  assert.equal(route.lastUpdate, new Date('2026-10-08T11:00:00.000Z').toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: false
  }));
});
