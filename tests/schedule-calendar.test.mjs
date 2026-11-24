import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRouteScheduleCalendar } from '../src/screens/admin/ScheduleCalendar.js';

test('el día muestra sus incidencias y cargas debajo de los reportes', () => {
  const html = renderRouteScheduleCalendar([], '2026-11-03', new Date(2026, 10, 1), [], {
    incidents: [
      { created_at: '2026-11-04T20:00:00Z', incident_type: 'flat_tire' },
      { created_at: '2026-11-04T02:15:00Z', incident_type: 'flat_tire' }
    ],
    fuelLoads: [{ created_at: '2026-11-03T18:00:00Z', liters: 40 }]
  });
  const positions = ['Reportes del día', 'Incidencias del día', 'Cargas de combustible del día'].map((title) => html.indexOf(title));
  assert.ok(positions[0] > 0 && positions[0] < positions[1] && positions[1] < positions[2]);
  // Local day (UTC-7), and the index still points into the full list.
  assert.deepEqual([...html.matchAll(/data-calendar-event="(\w+)" data-calendar-event-index="(\d+)"/g)].map((m) => [m[1], m[2]]),
    [['incidents', '1'], ['fuelLoads', '0']]);
});
