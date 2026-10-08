import test from 'node:test';
import assert from 'node:assert/strict';
import { getFillLevelLabel, normalizeFillLevel, renderCapacityMeter } from '../src/components/CapacityMeter.js';
import { validateContainerReport } from '../src/screens/ContainerReportScreen.js';

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