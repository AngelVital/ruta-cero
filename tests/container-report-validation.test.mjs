import test from 'node:test';
import assert from 'node:assert/strict';
import { getFillLevelLabel, normalizeFillLevel, renderCapacityMeter } from '../src/components/CapacityMeter.js';
import { validateContainerReport } from '../src/screens/ContainerReportScreen.js';
import { renderCollectionPointTable } from '../src/screens/AdminDashboard.js';

test('exige seleccionar un nivel de llenado', () => {
  assert.equal(validateContainerReport(null, [], {}), 'Selecciona un nivel de llenado del contenedor');
});

test('permite continuar con nivel bajo sin material', () => {
  assert.equal(validateContainerReport('low', [], {}), null);
});

test('exige material y peso mayor a cero para nivel medio o lleno', () => {
  assert.notEqual(validateContainerReport('medium', [], {}), null);
  assert.notEqual(validateContainerReport('medium', ['plastico'], { plastico: 0 }), null);
  assert.equal(validateContainerReport('medium', ['plastico'], { plastico: 10 }), null);
  assert.equal(validateContainerReport('full', ['carton'], { carton: 1 }), null);
});

test('rechaza porcentajes en lugar de un nivel definido', () => {
  assert.notEqual(validateContainerReport(55, [], {}), null);
});

test('convierte valores anteriores a los niveles bajo, medio y lleno', () => {
  assert.equal(normalizeFillLevel(20), 'low');
  assert.equal(normalizeFillLevel(55), 'medium');
  assert.equal(normalizeFillLevel(90), 'full');
  assert.equal(getFillLevelLabel('full'), 'LLENO');
});

test('el medidor muestra el nivel sin porcentaje', () => {
  const meter = renderCapacityMeter('medium');
  assert.match(meter, /MEDIO/);
  assert.doesNotMatch(meter, /%/);
});

test('la tabla administrativa conserva la fecha y ordena por identificador sin mostrar ruta', () => {
  const table = renderCollectionPointTable([{
    container_id: 'CONT-01',
    created_at: '2026-10-01T08:30:00.000Z'
  }, {
    container_id: 'CONT-01',
    created_at: '2026-10-08T14:30:00.000Z'
  }]);

  assert.match(table, /<span class="admin-route-id">CONT-01<\/span><span class="admin-cell-primary">Ayuntamiento<\/span><span class="admin-status status-completed"><i><\/i>VISITADO<\/span>/);
  assert.match(table, /datetime="2026-10-08"/);
  assert.match(table, /<span class="admin-status status-scheduled"><i><\/i>SIN REPORTE<\/span>/);
  assert.ok(table.indexOf('CONT-01') < table.indexOf('CONT-02'));
  assert.ok(table.indexOf('CONT-07') < table.indexOf('CONT-08'));
  assert.match(table, /admin-days-badge/);
  assert.doesNotMatch(table, /admin-point-route|RUTA ASIGNADA/);
});