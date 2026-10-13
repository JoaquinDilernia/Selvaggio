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

test('evento para el bot: incluye la info interna y la descripción pública', async () => {
  const { eventoParaBot } = await import('./reservas.service.js');
  const ev = eventoParaBot({
    id: 'abc', titulo: 'Cata', fecha: '2026-10-09', horaInicio: '20:00', horaFin: '23:00',
    descripcion: 'Noche de vinos', infoBot: 'Precio $30.000, incluye 4 copas. Hay opción vegetariana.',
  });
  assert.equal(ev.descripcion, 'Noche de vinos');
  assert.equal(ev.infoInterna, 'Precio $30.000, incluye 4 copas. Hay opción vegetariana.');
  assert.equal(ev.horario, '20:00 a 23:00');
});

test('evento para el bot: sin info interna no agrega el campo', async () => {
  const { eventoParaBot } = await import('./reservas.service.js');
  const ev = eventoParaBot({ id: 'x', titulo: 'Cata', fecha: '2026-10-09', infoBot: '   ' });
  assert.equal('infoInterna' in ev, false);
});

// ── Capacidad configurable ───────────────────────────────────────────────

test('config de reservas: sin doc usa los valores por defecto', async () => {
  const { normalizarConfigReservas } = await import('./reservas.service.js');
  assert.deepEqual(normalizarConfigReservas(null), {
    personasPorHorario: 16, mesaMaximo: 9, cavaMinimo: 10, cavaMaximo: null, cavaPrecioPersona: 60000, cavaSena: 100000,
  });
});

test('config de reservas: respeta lo cargado y descarta valores inválidos', async () => {
  const { normalizarConfigReservas } = await import('./reservas.service.js');
  const c = normalizarConfigReservas({ personasPorHorario: '30', mesaMaximo: '6', cavaMinimo: 12, cavaMaximo: 40, cavaPrecioPersona: -5, cavaSena: 'abc' });
  assert.equal(c.personasPorHorario, 30);
  assert.equal(c.mesaMaximo, 6);
  assert.equal(c.cavaMinimo, 12);
  assert.equal(c.cavaMaximo, 40);
  assert.equal(c.cavaPrecioPersona, 60000);
  assert.equal(c.cavaSena, 100000);
});

test('config de reservas: un máximo de La Cava menor al mínimo se ignora', async () => {
  const { normalizarConfigReservas } = await import('./reservas.service.js');
  assert.equal(normalizarConfigReservas({ cavaMinimo: 12, cavaMaximo: 8 }).cavaMaximo, null);
});

test('cupo por personas: un horario está disponible solo si entran las personas pedidas', async () => {
  const { calcularHorarios } = await import('./reservas.service.js');
  const hs = calcularHorarios({
    horas: ['20:00', '20:30', '21:00'],
    personasPorHorario: { '20:00': 13, '20:30': 16 },
    cupo: 16, personas: 4, yaPaso: () => false,
  });
  assert.deepEqual(hs, [
    { hora: '20:00', disponible: false, lugares: 3 },
    { hora: '20:30', disponible: false, lugares: 0 },
    { hora: '21:00', disponible: true, lugares: 16 },
  ]);
});

test('cupo por personas: horario que ya pasó queda sin lugares', async () => {
  const { calcularHorarios } = await import('./reservas.service.js');
  const [h] = calcularHorarios({ horas: ['18:00'], personasPorHorario: {}, cupo: 16, personas: 1, yaPaso: () => true });
  assert.deepEqual(h, { hora: '18:00', disponible: false, lugares: 0 });
});

test('prompt del bot: usa la capacidad, el mínimo/máximo y los precios configurados', async () => {
  const { reservasPrompt } = await import('./reservas.tools.js');
  const { normalizarConfigReservas } = await import('./reservas.service.js');
  const txt = reservasPrompt(new Date('2026-10-13T15:00:00Z'), normalizarConfigReservas({
    personasPorHorario: 30, mesaMaximo: 8, cavaMinimo: 12, cavaMaximo: 40, cavaPrecioPersona: 75000, cavaSena: 150000,
  }));
  assert.match(txt, /MESAS \(hasta 8 personas por mesa\)/);
  assert.match(txt, /entre 9 y 11 derivá al equipo/);
  assert.match(txt, /lugar para 30 personas/);
  assert.match(txt, /desde 12 hasta 40 personas/);
  assert.match(txt, /\$75\.000 por persona/);
  assert.match(txt, /Seña de \$150\.000/);
});
