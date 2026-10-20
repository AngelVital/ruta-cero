import test from 'node:test';
import assert from 'node:assert/strict';
import { getLatestReportCreatedAt, mergeNewReports } from '../src/domain/report.js';

const reports = [
  { id: 'b', created_at: '2026-10-20T15:00:00+00:00' },
  { id: 'a', created_at: '2026-10-20T14:00:00+00:00' }
];

test('la sincronización incremental parte del reporte más reciente', () => {
  assert.equal(getLatestReportCreatedAt(reports), '2026-10-20T15:00:00+00:00');
  assert.equal(getLatestReportCreatedAt([]), null);
});

test('los reportes nuevos se agregan al inicio sin duplicar los ya cargados', () => {
  const merged = mergeNewReports(reports, [
    { id: 'c', created_at: '2026-10-20T16:00:00+00:00' },
    { id: 'b', created_at: '2026-10-20T15:00:00+00:00' }
  ]);
  assert.deepEqual(merged.map((report) => report.id), ['c', 'b', 'a']);
});

test('sin reportes nuevos se conserva la misma lista', () => {
  assert.equal(mergeNewReports(reports, [reports[0]]), reports);
});
