import test from 'node:test';
import assert from 'node:assert/strict';
import { getOperationalDate, saveConfiguredRoutes } from '../src/services/routeConfiguration.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

globalThis.window = { localStorage: createMemoryStorage() };
const { store, fieldStateStorageKey } = await import('../src/state/store.js');
const { queueFieldAction, flushFieldQueue, getPendingSyncCount, syncQueueStorageKey } = await import('../src/services/fieldSync.js');

const route = {
  id: 'R-70',
  zone: 'Ruta sin señal',
  pointIds: ['CONT-01', 'CONT-02'],
  scheduledDates: [getOperationalDate()],
  status: 'scheduled',
  statusDate: getOperationalDate()
};

/** Fake Supabase API: `respond(type, item)` returns undefined (ok) or an error to throw. */
function createApi(respond) {
  const calls = [];
  const call = (type) => async (...args) => {
    calls.push([type, ...args]);
    const error = respond(type);
    if (error) throw error;
    return true;
  };
  const api = {
    isSupabaseConfigured: true,
    markRouteStarted: call('start'),
    insertContainerReport: call('report'),
    markRouteCompleted: call('complete')
  };
  return { calls, loadApi: async () => api };
}

const offlineError = { message: 'TypeError: Failed to fetch', code: '' };

test('sin conexión las acciones quedan en cola y se envían en orden al volver la señal', async () => {
  window.localStorage.removeItem(syncQueueStorageKey);
  const offline = createApi(() => offlineError);
  await queueFieldAction('start', { routeId: 'R-70' }, offline.loadApi);
  await queueFieldAction('report', { routeId: 'R-70', containerId: 'CONT-01', report: { fillLevel: 'low' } }, offline.loadApi);
  await flushFieldQueue(offline.loadApi);
  assert.equal(getPendingSyncCount(), 2);
  assert.equal(store.state.pendingSyncCount, 2);

  const online = createApi(() => null);
  await flushFieldQueue(online.loadApi);
  assert.deepEqual(online.calls.map(([type]) => type), ['start', 'report']);
  const [, , containerId, , { id, createdAt }] = online.calls[1];
  assert.equal(containerId, 'CONT-01');
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.ok(createdAt, 'the report keeps its capture time');
  assert.equal(getPendingSyncCount(), 0);
  assert.equal(store.state.pendingSyncCount, 0);
});

test('un reporte duplicado cuenta como enviado y uno rechazado se conserva', async () => {
  window.localStorage.removeItem(syncQueueStorageKey);
  const offline = createApi(() => offlineError);
  await queueFieldAction('report', { routeId: 'R-70', containerId: 'CONT-01', report: {} }, offline.loadApi);
  await queueFieldAction('report', { routeId: 'R-70', containerId: 'CONT-02', report: {} }, offline.loadApi);
  await queueFieldAction('complete', { routeId: 'R-70' }, offline.loadApi);
  await flushFieldQueue(offline.loadApi);

  let reportCalls = 0;
  const server = createApi((type) => {
    if (type === 'report') {
      reportCalls += 1;
      return reportCalls === 1 ? { code: '23505', message: 'duplicate key' } : { code: '42501', message: 'RLS' };
    }
    return { code: 'P0001', message: 'Aún hay contenedores sin reporte en esta ruta.' };
  });
  await flushFieldQueue(server.loadApi);

  const pending = JSON.parse(window.localStorage.getItem(syncQueueStorageKey));
  assert.deepEqual(pending.map((item) => item.payload.containerId), ['CONT-02']);
});

test('sin Supabase configurado no se encola nada', async () => {
  window.localStorage.removeItem(syncQueueStorageKey);
  const local = async () => ({ isSupabaseConfigured: false });
  assert.equal(await queueFieldAction('start', { routeId: 'R-70' }, local), false);
  assert.equal(getPendingSyncCount(), 0);
});

test('el avance local no retrocede cuando el servidor aún no recibe la cola', () => {
  store.applyConfiguredRoute(route, false);
  store.startRoute();
  store.completeContainerReport('CONT-01', { fillLevel: 'low', collectedKg: 0 });

  // Refresh with the server still unaware of the start and the report.
  store.applyConfiguredRoute({ ...route, zone: 'Ruta sin señal (editada)' }, false);
  assert.equal(store.state.route.status, 'EN RUTA');
  assert.equal(store.state.stops[0].status, 'completed');

  store.completeContainerReport('CONT-02', { fillLevel: 'low', collectedKg: 0 });
  store.setDashboardPhoto('data:image/jpeg;base64,x');
  assert.equal(store.completeRoute(), true);
  store.applyConfiguredRoute({ ...route, status: 'active' }, false);
  assert.equal(store.state.route.status, 'COMPLETADA');
  assert.equal(store.state.route.returning, false);
});

test('el avance del día se recupera al reabrir la app, sin la foto de regreso', async () => {
  saveConfiguredRoutes([{ ...route, id: 'R-71' }]);
  store.applyConfiguredRoute({ ...route, id: 'R-71' }, false);
  store.startRoute();
  store.completeContainerReport('CONT-01', { fillLevel: 'low', collectedKg: 0 });
  store.setDashboardPhoto('data:image/jpeg;base64,x');
  assert.equal(JSON.parse(window.localStorage.getItem(fieldStateStorageKey)).route.dashboardPhoto, null);

  const { store: reopened } = await import('../src/state/store.js?reopen');
  assert.equal(reopened.state.route.id, 'R-71');
  assert.equal(reopened.state.route.status, 'EN RUTA');
  assert.equal(reopened.state.stops.find((stop) => stop.id === 'CONT-01').status, 'completed');
  assert.equal(reopened.state.pendingSyncCount, 0);
});

test('el avance de otro día no se restaura', async () => {
  const saved = JSON.parse(window.localStorage.getItem(fieldStateStorageKey));
  window.localStorage.setItem(fieldStateStorageKey, JSON.stringify({
    ...saved,
    route: { ...saved.route, statusDate: '2000-01-01' }
  }));
  const { store: nextDay } = await import('../src/state/store.js?next-day');
  assert.equal(nextDay.state.route.status, 'PENDIENTE');
  assert.equal(nextDay.state.stops.some((stop) => stop.status === 'completed'), false);
});
