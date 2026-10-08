import { test } from 'node:test';
import assert from 'node:assert/strict';
import { primerDiaVigente } from './archivoReservas.service.js';

test('antes de las 6 de la mañana el día anterior sigue vigente (vie/sáb hasta las 02:00)', () => {
  // 2026-10-10 01:30 en Argentina = 04:30 UTC
  assert.equal(primerDiaVigente(new Date('2026-10-10T04:30:00Z')), '2026-10-09');
});

test('desde las 6 de la mañana se archiva todo lo de ayer', () => {
  // 2026-10-10 06:00 en Argentina = 09:00 UTC
  assert.equal(primerDiaVigente(new Date('2026-10-10T09:00:00Z')), '2026-10-10');
});
