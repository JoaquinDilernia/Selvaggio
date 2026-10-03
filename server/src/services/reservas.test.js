import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horariosDelDia, ahoraAR } from './reservas.service.js';

// Octubre 2026: 5 = lunes, 6 = martes, 9 = viernes, 10 = sábado, 11 = domingo

test('lunes cerrado por defecto', () => {
  assert.deepEqual(horariosDelDia('2026-10-05'), []);
});

test('martes a jueves y domingo: 18:00 a 22:00', () => {
  for (const f of ['2026-10-06', '2026-10-11']) {
    const hs = horariosDelDia(f);
    assert.equal(hs[0], '18:00');
    assert.equal(hs.at(-1), '22:00');
  }
});

test('viernes y sábado hasta las 02:00, con lo de después de medianoche al final', () => {
  for (const f of ['2026-10-09', '2026-10-10']) {
    const hs = horariosDelDia(f);
    assert.equal(hs.at(-1), '02:00');
    assert.ok(hs.indexOf('00:00') > hs.indexOf('23:30'));
  }
});

test('excepción del calendario: cerrar y abrir con horarios propios', () => {
  assert.deepEqual(horariosDelDia('2026-10-10', { tipo: 'cerrar' }), []);
  assert.deepEqual(
    horariosDelDia('2026-10-05', { tipo: 'abrir', horarios: ['00:30', '20:00', '19:00'] }),
    ['19:00', '20:00', '00:30'],
  );
});

test('ahoraAR usa hora de Buenos Aires, no UTC', () => {
  // 02:30 UTC del sábado = 23:30 del viernes en Argentina (UTC-3)
  assert.deepEqual(ahoraAR(new Date('2026-10-10T02:30:00Z')), { fecha: '2026-10-09', hora: '23:30' });
});
