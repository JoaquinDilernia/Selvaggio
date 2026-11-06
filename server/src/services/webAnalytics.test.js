import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rangosPeriodo, resumirPeriodo, interesCavaEnChat, tendenciaCava, ocupacionCava,
} from './webAnalytics.service.js';

const ts = (iso) => ({ toDate: () => new Date(iso) });

test('rangosPeriodo usa días de Argentina y arma el período anterior pegado', () => {
  const r = rangosPeriodo('2026-11-01', '2026-11-07');
  assert.equal(new Date(r.startMs).toISOString(), '2026-11-01T03:00:00.000Z');
  assert.equal(new Date(r.endMs).toISOString(), '2026-11-08T02:59:59.999Z');
  assert.equal(new Date(r.prevStartMs).toISOString(), '2026-10-25T03:00:00.000Z');
  assert.equal(r.prevEndMs, r.startMs - 1);
  assert.equal(r.dias, 7);
});

test('rangosPeriodo rechaza fechas mal formadas y da vuelta desde/hasta', () => {
  assert.throws(() => rangosPeriodo('ayer', '2026-11-07'), /Fechas inválidas/);
  const r = rangosPeriodo('2026-11-07', '2026-11-01');
  assert.equal(r.desde, '2026-11-01');
});

test('interés por La Cava en el chat: el cliente la nombra en el período, o etiqueta Cava y arrancó ahí', () => {
  const { startMs, endMs } = rangosPeriodo('2026-11-01', '2026-11-07');
  const nombra = { createdAt: ts('2026-10-01T12:00:00Z'), messages: [{ role: 'user', content: 'Hola, la Cava está libre el 20?', timestamp: '2026-11-02T12:00:00Z' }] };
  const soloBot = { createdAt: ts('2026-11-02T12:00:00Z'), messages: [{ role: 'assistant', content: 'Te paso el PDF de La Cava', timestamp: '2026-11-02T12:00:00Z' }] };
  const etiquetada = { createdAt: ts('2026-11-03T12:00:00Z'), labels: ['Cava'], messages: [] };
  const etiquetadaVieja = { createdAt: ts('2026-10-03T12:00:00Z'), labels: ['Cava'], messages: [] };
  const otraPalabra = { createdAt: ts('2026-11-02T12:00:00Z'), messages: [{ role: 'user', content: 'excavadora', timestamp: '2026-11-02T12:00:00Z' }] };
  assert.equal(interesCavaEnChat(nombra, startMs, endMs), Date.parse('2026-11-02T12:00:00Z'));
  assert.equal(interesCavaEnChat(soloBot, startMs, endMs), null);
  assert.notEqual(interesCavaEnChat(etiquetada, startMs, endMs), null);
  assert.equal(interesCavaEnChat(etiquetadaVieja, startMs, endMs), null);
  assert.equal(interesCavaEnChat(otraPalabra, startMs, endMs), null);
});

const datos = {
  eventos: [
    { tipo: 'click_reservar_cava', t: Date.parse('2026-11-01T03:00:00Z') },  // 00:00 AR del 1/11: entra
    { tipo: 'click_reservar_cava', t: Date.parse('2026-11-01T02:59:59Z') },  // 23:59 AR del 31/10: no
    { tipo: 'click_reservar_mesa', t: Date.parse('2026-11-03T15:00:00Z') },  // otro botón
    { tipo: 'click_reservar_cava', t: Date.parse('2026-11-08T02:00:00Z') },  // 23:00 AR del 7/11: entra
    { tipo: 'page_view', categoria: 'cava', t: Date.parse('2026-11-04T15:00:00Z') },
  ],
  reservasCava: [
    { createdAt: '2026-11-04T19:01:05.212Z', fecha: '2026-11-14', estado: 'confirmada', cantidadPersonas: 12, seña: 100000, total: 720000 },
    { createdAt: '2026-11-05T21:39:07.378Z', fecha: '2026-11-21', estado: 'cancelada', cantidadPersonas: 10, seña: 100000, total: 600000 },
    { createdAt: '2026-10-20T10:00:00.000Z', fecha: '2026-11-01', estado: 'confirmada', cantidadPersonas: 10, seña: 100000, total: 600000 }, // período anterior
  ],
  conversaciones: [
    { createdAt: ts('2026-10-01T12:00:00Z'), messages: [{ role: 'user', content: 'precio de la cava?', timestamp: '2026-11-02T12:00:00Z' }] },
    { createdAt: ts('2026-11-03T12:00:00Z'), messages: [] },
    { createdAt: ts('2026-10-01T12:00:00Z'), messages: [{ role: 'user', content: 'hola', timestamp: '2026-10-02T12:00:00Z' }] },
  ],
};

test('resumirPeriodo: reservas, plata, anticipación, interés y tasa de cierre de La Cava', () => {
  const { startMs, endMs } = rangosPeriodo('2026-11-01', '2026-11-07');
  assert.deepEqual(resumirPeriodo(datos, startMs, endMs), {
    reservasCava: 1,
    personasCava: 12,
    senasCava: 100000,
    facturacionCava: 720000,
    anticipacionDias: 10,
    toquesCava: 2,
    visitasCava: 1,
    consultasChatCava: 1,
    interesCava: 3,
    tasaCierreCava: 33.3,
    conversaciones: 2,
    conversacionesNuevas: 1,
  });
});

test('resumirPeriodo sin interés deja la tasa y la anticipación en null', () => {
  const r = resumirPeriodo({}, 0, 1);
  assert.equal(r.tasaCierreCava, null);
  assert.equal(r.anticipacionDias, null);
});

test('tendenciaCava va por día hasta 31 días y compara con el tramo equivalente anterior', () => {
  const t = tendenciaCava(datos, rangosPeriodo('2026-11-01', '2026-11-07'));
  assert.equal(t.paso, 'dia');
  assert.equal(t.tramos.length, 7);
  assert.deepEqual(t.tramos[0], { desde: '2026-11-01', hasta: '2026-11-01', web: 1, chat: 0, reservas: 0, interesAnterior: 0 });
  assert.equal(t.tramos[1].chat, 1);
  assert.equal(t.tramos[3].reservas, 1);
  assert.equal(t.tramos[6].web, 1);
  assert.equal(t.tramos[6].interesAnterior, 1); // el toque del 31/10 cae en el último día del período anterior
});

test('tendenciaCava agrupa por semana en períodos largos, con la última semana recortada', () => {
  const t = tendenciaCava({}, rangosPeriodo('2026-10-01', '2026-11-06'));
  assert.equal(t.paso, 'semana');
  assert.equal(t.tramos.length, 6);
  assert.equal(t.tramos[5].desde, '2026-11-05');
  assert.equal(t.tramos[5].hasta, '2026-11-06');
});

test('ocupacionCava: fechas tomadas y viernes/sábados libres, sin cerrados ni canceladas', () => {
  const o = ocupacionCava({
    reservasFuturas: [
      { fecha: '2026-11-06', estado: 'confirmada' },  // viernes, tomado
      { fecha: '2026-11-07', estado: 'cancelada' },   // sábado, cancelada → libre
      { fecha: '2026-11-19', estado: 'confirmada' },  // jueves
    ],
    cerrados: ['2026-11-13'],                        // viernes cerrado
  }, '2026-11-06');
  assert.deepEqual(o.fechasTomadas, ['2026-11-06', '2026-11-19']);
  assert.equal(o.tomadas30, 2);
  assert.equal(o.findesLibres[0], '2026-11-07');
  assert.ok(!o.findesLibres.includes('2026-11-06'));
  assert.ok(!o.findesLibres.includes('2026-11-13'));
  assert.equal(o.findesTomados30, 1);
});
