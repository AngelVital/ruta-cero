import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDispatchInspection, getInspectionProgress, getInspectionStatusLabel } from '../src/domain/inspection.js';
import { getActiveIncidents, getMissingReportPhotos, getTotalMaterialWeight, isContainerReportReady } from '../src/domain/report.js';
import { filterReportsByMaterial, filterRoutes, getKgByDay, getPeriodRange, getTodaySummary, summarizeReports, upsertRoute } from '../src/domain/route.js';
import { inspectionKeys } from '../src/data/inspectionItems.js';

const allGood = Object.fromEntries(inspectionKeys.map((key) => [key, 'BIEN']));

test('la inspección indica cuántos puntos faltan y si falta la foto del odómetro', () => {
  const progress = getInspectionProgress({ ...allGood, tires: null, lights: null, odometerPhotoEvidence: false });
  assert.equal(progress.missingPoints, 2);
  assert.equal(progress.ready, false);
  assert.equal(getInspectionStatusLabel(progress), 'FALTAN 2 PUNTOS Y FOTO DEL ODÓMETRO');
});

test('los estados Regular y Mal exigen comentario antes de confirmar', () => {
  const inspection = { ...allGood, brakes: 'MAL', mirrors: 'REGULAR', odometerPhotoEvidence: true };
  const progress = getInspectionProgress(inspection, { brakes: 'Pastillas gastadas', mirrors: '  ' });
  assert.deepEqual(progress.missingCommentKeys, ['mirrors']);
  assert.equal(getInspectionStatusLabel(progress), 'FALTA 1 COMENTARIO');

  const complete = getInspectionProgress(inspection, { brakes: 'Pastillas gastadas', mirrors: 'Espejo flojo' });
  assert.equal(complete.ready, true);
  assert.equal(getInspectionStatusLabel(complete), 'CONFIRMAR Y FIRMAR INSPECCIÓN');
});

test('la inspección del despacho envía resultados, solo los comentarios exigidos y la foto del odómetro', () => {
  const inspection = buildDispatchInspection({
    inspection360: { ...allGood, brakes: 'MAL', odometerPhotoEvidence: 'data:image/jpeg;base64,x', completed: true },
    inspectionComments: { brakes: ' Pastillas gastadas ', tires: 'ya no aplica' },
    fuelLevel: { liters: 120 },
    route: { id: 'R-01' }
  });
  assert.equal(inspection.results.brakes, 'MAL');
  assert.equal('completed' in inspection.results, false);
  assert.deepEqual(inspection.comments, { brakes: 'Pastillas gastadas' });
  assert.equal(inspection.odometerPhoto, 'data:image/jpeg;base64,x');
  assert.equal(inspection.fuelLiters, 120);

  const legacy = buildDispatchInspection({ inspection360: { ...allGood, odometerPhotoEvidence: true }, fuelLevel: { liters: 0 }, route: { id: 'R-01' } });
  assert.equal(legacy.odometerPhoto, null);
});

test('el reporte requiere las cuatro fotos y suma el peso de los materiales seleccionados', () => {
  const photos = { initialExterior: 'x', initialInterior: 'x', finalExterior: 'x' };
  assert.deepEqual(getMissingReportPhotos(photos), ['finalInterior']);
  assert.equal(isContainerReportReady('low', [], {}, photos), false);
  assert.equal(isContainerReportReady('low', [], {}, { ...photos, finalInterior: 'x' }), true);
  assert.equal(getTotalMaterialWeight(['papel', 'carton'], { papel: '12.5', carton: 3, plastico: 99 }), 15.5);
  assert.deepEqual(getActiveIncidents({ damaged: true, graffiti: false }), ['damaged']);
});

const routes = [
  { id: 'R-01', zone: 'Centro', pointIds: ['CONT-01', 'CONT-02'], status: 'active', statusLabel: 'En curso', stopsDone: 1, stopsTotal: 2, lastUpdate: '09:10', syncLabel: 'Sin iniciar', scheduledDates: ['2026-10-20'], completedPointIds: ['CONT-01'] },
  { id: 'R-02', zone: 'Norte', pointIds: ['CONT-03'], status: 'unscheduled', statusLabel: 'No programada', stopsDone: 0, stopsTotal: 1, lastUpdate: '--:--', syncLabel: 'Sin iniciar', scheduledDates: [] }
];

test('el filtro de rutas busca por id, zona o punto y por estado', () => {
  assert.deepEqual(filterRoutes(routes, 'cont-03', 'all').map((route) => route.id), ['R-02']);
  assert.deepEqual(filterRoutes(routes, 'centro', 'active').map((route) => route.id), ['R-01']);
  assert.deepEqual(filterRoutes(routes, '', 'completed'), []);
});

test('editar los puntos de una ruta reinicia su avance; cambiar solo el nombre lo conserva', () => {
  const renamed = upsertRoute(routes, { routeId: 'R-01', zone: 'Centro Histórico', pointIds: ['CONT-01', 'CONT-02'] });
  assert.equal(renamed[0].zone, 'Centro Histórico');
  assert.equal(renamed[0].stopsDone, 1);

  const redefined = upsertRoute(routes, { routeId: 'R-01', zone: 'Centro', pointIds: ['CONT-02'] });
  assert.equal(redefined[0].stopsDone, 0);
  assert.equal(redefined[0].status, 'scheduled');
  assert.equal(redefined[0].stopsTotal, 1);

  const created = upsertRoute(routes, { routeId: 'R-03', zone: 'Sur', pointIds: ['CONT-05'] });
  assert.equal(created.length, 3);
  assert.equal(created[2].statusLabel, 'Programada');
});

test('el resumen del día cuenta puntos atendidos por reportes de la ruta programada', () => {
  const reports = [
    { route_id: 'R-01', container_id: 'CONT-02', created_at: '2026-10-20T17:00:00.000Z' },
    { route_id: 'R-01', container_id: 'CONT-09', created_at: '2026-10-20T17:05:00.000Z' },
    { route_id: 'R-01', container_id: 'CONT-02', created_at: '2026-10-19T17:00:00.000Z' }
  ];
  const summary = getTodaySummary(routes, reports, '2026-10-20');
  assert.equal(summary.scheduledRoute.id, 'R-01');
  assert.equal(summary.scheduledCount, 1);
  assert.equal(summary.todaysReports.length, 2);
  assert.equal(summary.totalPoints, 2);
  assert.equal(summary.completedPoints, 2);
});

test('el resumen agrupa el peso por material dentro del periodo', () => {
  assert.deepEqual(getPeriodRange('week', '2026-10-21'), ['2026-10-19', '2026-10-25']);
  assert.deepEqual(getPeriodRange('month', '2026-10-21'), ['2026-10-01', '2026-10-31']);
  const reports = [
    { created_at: '2026-10-21T18:00:00Z', container_id: 'CONT-01', collected_kg: 5, materials: ['papel', 'carton'], material_weights: { papel: 2, carton: 3 } },
    { created_at: '2026-10-20T18:00:00Z', container_id: 'CONT-02', collected_kg: 4, materials: ['papel'], material_weights: { papel: 4 } },
    { created_at: '2026-09-30T18:00:00Z', container_id: 'CONT-01', collected_kg: 9, materials: ['papel'], material_weights: { papel: 9 } }
  ];
  const day = summarizeReports(reports, '2026-10-21', '2026-10-21');
  assert.equal(day.reports.length, 1);
  const week = summarizeReports(reports, ...getPeriodRange('week', '2026-10-21'));
  assert.deepEqual(week.materials, { papel: 6, carton: 3 });
  assert.equal(week.totalKg, 9);
  assert.equal(week.containers, 2);
  assert.deepEqual(week.byContainer['CONT-01'], { reports: 1, kg: 5, materials: { papel: 2, carton: 3 } });
  assert.equal(summarizeReports(reports, '2026-09-30', '2026-10-20').totalKg, 13);

  const carton = filterReportsByMaterial(reports, 'carton');
  assert.equal(summarizeReports(carton, '2026-10-19', '2026-10-25').totalKg, 3);
  assert.deepEqual(getKgByDay(reports, '2026-10-19', '2026-10-21'), [
    ['2026-10-19', 0, {}],
    ['2026-10-20', 4, { papel: 4 }],
    ['2026-10-21', 5, { papel: 2, carton: 3 }]
  ]);
});
