import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContainerReport } from '../src/screens/ContainerReportScreen.js';

test('exige seleccionar un nivel de llenado', () => {
  assert.equal(validateContainerReport(null, [], {}), 'Selecciona un nivel de llenado del contenedor');
});

test('permite continuar con nivel bajo sin material', () => {
  assert.equal(validateContainerReport(20, [], {}), null);
});

test('exige material y peso mayor a cero para nivel medio o lleno', () => {
  assert.notEqual(validateContainerReport(55, [], {}), null);
  assert.notEqual(validateContainerReport(55, ['plastico'], { plastico: 0 }), null);
  assert.equal(validateContainerReport(55, ['plastico'], { plastico: 10 }), null);
  assert.equal(validateContainerReport(90, ['carton'], { carton: 1 }), null);
});