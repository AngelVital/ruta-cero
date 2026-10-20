import test from 'node:test';
import assert from 'node:assert/strict';
import { getLatestReportReceivedAt, mergeNewReports } from '../src/domain/report.js';

const reports = [
  { id: 'b', created_at: '2026-10-20T15:00:00+00:00', received_at: '2026-10-20T15:00:01+00:00' },
  { id: 'a', created_at: '2026-10-20T14:00:00+00:00', received_at: '2026-10-20T16:30:00+00:00' }
];

test('la sincronización incremental parte del último reporte recibido', () => {
  assert.equal(getLatestReportReceivedAt(reports), '2026-10-20T16:30:00+00:00');
  assert.equal(getLatestReportReceivedAt([]), null);
});

test('los reportes nuevos se agregan sin duplicar y en orden de captura', () => {
  const merged = mergeNewReports(reports, [
    { id: 'c', created_at: '2026-10-20T16:00:00+00:00' },
    // Captured offline earlier than the loaded ones, synced later.
    { id: 'd', created_at: '2026-10-20T13:00:00+00:00' },
    { id: 'b', created_at: '2026-10-20T15:00:00+00:00' }
  ]);
  assert.deepEqual(merged.map((report) => report.id), ['c', 'b', 'a', 'd']);
});

test('sin reportes nuevos se conserva la misma lista', () => {
  assert.equal(mergeNewReports(reports, [reports[0]]), reports);
});
