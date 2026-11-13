import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unaFechaPorSerie } from './proximosEventos.js';

test('unaFechaPorSerie: de cada evento fijo queda solo la próxima fecha', () => {
  const evs = [
    { id: 'a', fecha: '2026-11-13', serieId: 's1' },
    { id: 'b', fecha: '2026-11-13', titulo: 'Alfajores' },
    { id: 'c', fecha: '2026-11-14', serieId: 's2' },
    { id: 'd', fecha: '2026-11-20', serieId: 's1' },
    { id: 'e', fecha: '2026-11-21', titulo: 'Vinilos' },
  ];
  assert.deepEqual(unaFechaPorSerie(evs).map(e => e.id), ['a', 'b', 'c', 'e']);
});
