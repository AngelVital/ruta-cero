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

test('el tablero exportado es un HTML independiente con una versión por material', async () => {
  const { buildBoardExport } = await import('../src/screens/admin/Summary.js');
  const reports = [
    { id: 'r1', created_at: '2026-10-20T18:00:00Z', container_id: 'C1', materials: ['plastico', 'carton'], material_weights: { plastico: 2.5, carton: 4 }, collected_kg: 6.5 },
    { id: 'r2', created_at: '2026-10-21T18:00:00Z', container_id: 'C2', materials: ['papel'], material_weights: { papel: 3 }, collected_kg: 3, incident_comments: 'no debe salir' }
  ];
  const html = buildBoardExport(reports, '2026-10-19', '2026-10-25', 'week', '.x{}');
  assert.match(html, /^<!doctype html>/);
  for (const material of ['', 'plastico', 'carton', 'papel']) assert.match(html, new RegExp(`<template data-material="${material}">`));
  assert.doesNotMatch(html, /no debe salir/);
  // The embedded script must parse on its own (it holds attachBoardHover's source).
  const script = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
  assert.doesNotThrow(() => new Function(script));
});
