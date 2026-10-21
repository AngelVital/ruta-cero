import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/state/store.js';
import { renderRouteSummaryScreen } from '../src/screens/RouteSummaryScreen.js';

const route = {
  id: 'R-50',
  zone: 'Ruta de prueba',
  pointIds: ['CONT-02', 'CONT-05'],
  status: 'scheduled',
  statusDate: '2026-10-20'
};

test('las acciones crean un estado nuevo sin modificar el anterior', () => {
  store.applyConfiguredRoute(route, false);
  const actions = [
    () => store.setScreen('map'),
    () => store.selectContainer('CONT-05', false),
    () => store.updateInspectionItem('tires', 'BIEN', false),
    () => store.updateInspectionComment('tires', 'ok'),
    () => store.completeInspection(),
    () => store.setFuelPreset('LLENO (100%)', 250, false),
    () => store.setDispatchAssignment('unitId', 'U-01', false),
    () => store.updateReportDraft('CONT-02', { fillLevel: 'low' }),
    () => store.startRoute(),
    () => store.completeContainerReport('CONT-02', { fillLevel: 'low', collectedKg: 0 }),
    () => store.completeContainerReport('CONT-05', { fillLevel: 'full', collectedKg: 40, materials: ['papel'] }),
    () => store.setDashboardPhoto('data:image/jpeg;base64,x'),
    () => store.completeRoute()
  ];

  for (const action of actions) {
    const previous = store.state;
    const previousJson = JSON.stringify(previous);
    action();
    assert.notEqual(store.state, previous, action.toString());
    assert.equal(JSON.stringify(previous), previousJson, `${action} modified the previous state`);
  }
  assert.equal(store.state.route.status, 'COMPLETADA');

  // One route per day: the closed route cannot be restarted and its summary keeps the record.
  assert.equal(store.startRoute(), null);
  assert.equal(store.state.route.completedCount, 2);
  const summary = renderRouteSummaryScreen(store.state);
  assert.match(summary, /2 \/ 2/);
  assert.match(summary, /40 kg/);
});

test('el borrador del reporte se conserva por contenedor y se limpia al guardar o iniciar ruta', () => {
  store.applyConfiguredRoute({ ...route, id: 'R-51' }, false);
  store.updateReportDraft('CONT-02', { fillLevel: 'medium', materials: ['carton'] });
  store.updateReportDraft('CONT-02', { materialWeights: { carton: 8 } });
  store.updateReportDraft('CONT-05', { incidentComments: 'Tapa rota' });
  assert.deepEqual(store.state.reportDrafts['CONT-02'], {
    fillLevel: 'medium', materials: ['carton'], materialWeights: { carton: 8 }
  });

  // A refresh of the same route and day keeps the drafts.
  store.applyConfiguredRoute({ ...route, id: 'R-51', status: 'active' }, false);
  assert.equal(store.state.reportDrafts['CONT-05'].incidentComments, 'Tapa rota');

  store.completeContainerReport('CONT-02', { fillLevel: 'medium', collectedKg: 8 });
  assert.equal(store.state.reportDrafts['CONT-02'], undefined);
  assert.ok(store.state.reportDrafts['CONT-05']);

  store.startRoute();
  assert.deepEqual(store.state.reportDrafts, {});
});

test('updateReportDraft y los cambios en la misma pantalla no vuelven a dibujarla', () => {
  let renders = 0;
  const unsubscribe = store.subscribe(() => { renders += 1; });
  try {
    store.updateReportDraft('CONT-02', { fillLevel: 'low' });
    store.updateInspectionItem('fluids', 'MAL', false);
    store.updateInspectionComment('fluids', 'fuga');
    assert.equal(renders, 0);
    store.setScreen('dispatch');
    assert.equal(renders, 1);
  } finally {
    unsubscribe();
  }
});

test('setFleetResources agrupa unidades, operadores y auxiliares para el despacho', () => {
  store.setFleetResources([
    { id: 'U-007', kind: 'unit', name: 'Freightliner LPZ-2099' },
    { id: 'OP-001', kind: 'driver', name: 'Luis Peña' },
    { id: 'AUX-001', kind: 'assistant', name: 'Eva Ruiz' }
  ]);
  assert.deepEqual(store.state.dispatchOptions, {
    units: [{ id: 'U-007', label: 'U-007 · Freightliner LPZ-2099' }],
    drivers: [{ id: 'OP-001', label: 'OP-001 · Luis Peña' }],
    assistants: [{ id: 'AUX-001', label: 'AUX-001 · Eva Ruiz' }]
  });
});
