import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const filePath = fileURLToPath(new URL('../src/screens/QRScannerScreen.js', import.meta.url));
const source = readFileSync(filePath, 'utf8');

test('el escáner acepta códigos QR además de códigos de barras', () => {
  assert.match(source, /BarcodeFormat\.QR_CODE/);
});
