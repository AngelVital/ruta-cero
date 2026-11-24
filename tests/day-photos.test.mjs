import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventPhotos } from '../src/screens/admin/Reports.js';

const event = (id, photos) => ({ id, created_at: '2026-11-04T02:15:00Z', incident_type: 'flat_tire', unit_id: 'U-01', route_id: 'R-01', photos });

test('las fotos de cada evento van a su subcarpeta con fecha y hora locales', () => {
  assert.deepEqual(
    getEventPhotos('incident_reports', event('aaaaaaaa-1', ['https://x/1.jpg', 'javascript:1', 'https://x/2.jpg'])),
    [
      { name: 'incidencias/2026-11-03_1915_Llanta-ponchada_U-01_R-01_aaaaaaaa_1', url: 'https://x/1.jpg' },
      { name: 'incidencias/2026-11-03_1915_Llanta-ponchada_U-01_R-01_aaaaaaaa_2', url: 'https://x/2.jpg' }
    ]
  );
});

test('dos eventos del mismo minuto no se sobrescriben', () => {
  const [first] = getEventPhotos('fuel_loads', event('aaaaaaaa-1', ['https://x/1.jpg']));
  const [second] = getEventPhotos('fuel_loads', event('bbbbbbbb-2', ['https://x/1.jpg']));
  assert.match(first.name, /^combustible\//);
  assert.notEqual(first.name, second.name);
});
