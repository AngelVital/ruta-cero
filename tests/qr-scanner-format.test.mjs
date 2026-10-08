import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { store } from '../src/state/store.js';

const filePath = fileURLToPath(new URL('../src/screens/QRScannerScreen.js', import.meta.url));
const source = readFileSync(filePath, 'utf8');

test('el escáner acepta códigos QR además de códigos de barras', () => {
  assert.match(source, /BarcodeFormat\.QR_CODE/);
});

test('seleccionar un contenedor antes de abrir el reporte genera un solo render', () => {
  const originalScreen = store.state.currentScreen;
  const originalActiveContainerId = store.state.activeContainerId;
  const originalStatuses = store.state.stops.map(stop => stop.status);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  try {
    store.selectContainer('CONT-01', false);
    store.setScreen('report', 'slide-left');

    assert.equal(notifications, 1);
    assert.equal(store.state.currentScreen, 'report');
    assert.equal(store.state.activeContainerId, 'CONT-01');
  } finally {
    unsubscribe();
    store.state.currentScreen = originalScreen;
    store.state.activeContainerId = originalActiveContainerId;
    store.state.stops.forEach((stop, index) => {
      stop.status = originalStatuses[index];
    });
  }
});
