import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummaryCsv } from '../src/screens/admin/Summary.js';

test('el CSV tiene una fila por material, kg numéricos y texto escapado', () => {
  const csv = buildSummaryCsv([
    { id: 'r1', created_at: '2026-10-20T18:00:00Z', container_id: 'C1', route_id: 'R1', fill_level: 'full', materials: ['pet', 'carton'], material_weights: { pet: 2.5, carton: 4 }, incidents: {}, incident_comments: 'dijo "hola", =1+1' },
    { id: 'r2', created_at: '2026-10-20T19:00:00Z', container_id: 'C2', route_id: 'R1', fill_level: 'low', materials: [], collected_kg: 0 },
    { id: 'r3', created_at: '2026-09-01T19:00:00Z', container_id: 'C2', materials: [] }
  ], '2026-10-20', '2026-10-20');
  const lines = csv.replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^reporte_id,fecha,/);
  assert.match(lines[1], /^r1,2026-10-20,2026-10-20 11:00:00,C1,/);
  assert.match(lines[1], /,2\.5,/);
  assert.match(lines[1], /,"dijo ""hola"", =1\+1"$/);
  assert.match(lines[3], /^r2,.*,,0,/);
});
