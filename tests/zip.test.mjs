import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, createZip } from '../src/utils/zip.js';

test('crc32 coincide con el valor de referencia', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('el zip guarda cada archivo con su nombre y el directorio central al final', async () => {
  const data = new TextEncoder().encode('foto');
  const bytes = new Uint8Array(await createZip([
    { name: 'a.jpg', data },
    { name: 'exterior-inicial.jpg', data }
  ]).arrayBuffer());
  const view = new DataView(bytes.buffer);
  const endOffset = bytes.length - 22;
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(endOffset, true), 0x06054b50);
  assert.equal(view.getUint16(endOffset + 10, true), 2);
  const centralOffset = view.getUint32(endOffset + 16, true);
  assert.equal(view.getUint32(centralOffset, true), 0x02014b50);
  assert.equal(new TextDecoder().decode(bytes.slice(30, 35)), 'a.jpg');
});
