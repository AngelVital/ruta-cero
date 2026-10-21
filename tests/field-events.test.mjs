import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFuelLoad, validateFuelLoad, validateIncident } from '../src/domain/fieldEvents.js';

test('una incidencia requiere tipo y gravedad, y descripción cuando es "Otro"', () => {
  assert.match(validateIncident({ severity: 'high' }), /tipo/);
  assert.match(validateIncident({ type: 'collision' }), /gravedad/);
  assert.equal(validateIncident({ type: 'collision', severity: 'high' }), null);
  assert.match(validateIncident({ type: 'other', severity: 'low', description: '  ' }), /Describe/);
  assert.equal(validateIncident({ type: 'other', severity: 'low', description: 'Árbol caído' }), null);
  assert.match(validateIncident({ type: 'collision', severity: 'low', photos: ['a', 'b', 'c', 'd'] }), /Máximo 3/);
});

test('una carga requiere litros y foto; importe y odómetro son opcionales', () => {
  const photo = 'data:image/jpeg;base64,x';
  assert.match(validateFuelLoad({ liters: '', ticketPhoto: photo }), /litros/);
  assert.match(validateFuelLoad({ liters: '0', ticketPhoto: photo }), /litros/);
  assert.match(validateFuelLoad({ liters: '80' }), /foto/);
  assert.equal(validateFuelLoad({ liters: '80.5', amount: '', odometerKm: '', ticketPhoto: photo }), null);
  assert.match(validateFuelLoad({ liters: '80', amount: '1.2.3', ticketPhoto: photo }), /importe/);
  assert.deepEqual(normalizeFuelLoad({ liters: '80.5', amount: '', odometerKm: '120345' }), {
    liters: 80.5, amount: null, odometerKm: 120345
  });
});
