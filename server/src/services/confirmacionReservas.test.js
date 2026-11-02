import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pendientesDeConfirmar, paramsConfirmacion, textoConfirmacion, parsePayload, payloadBoton,
  respuestaConfirmo, contextoParaBot,
} from './confirmacionReservas.service.js';

// 2026-10-31 18:05 en Argentina (UTC-3)
const NOW = new Date('2026-10-31T21:05:00Z');
const base = { fecha: '2026-10-31', horario: '21:00', nombre: 'Martina', cantidadPersonas: 2, createdAt: '2026-10-20T10:00:00Z' };

test('manda solo a las reservas de esta noche que no pasaron y no tienen confirmación', () => {
  const rs = [
    { id: 'ok', ...base },
    { id: 'madrugada', ...base, horario: '01:00' },
    { id: 'otroDia', ...base, fecha: '2026-11-01' },
    { id: 'almuerzo', ...base, horario: '13:00' },
    { id: 'yaPaso', ...base, horario: '18:00' },
    { id: 'yaMandada', ...base, confirmacionWhatsapp: { estado: 'enviada' } },
    { id: 'archivada', ...base, archivada: true },
    { id: 'cancelada', ...base, estado: 'cancelada' },
  ];
  assert.deepEqual(pendientesDeConfirmar(rs, NOW).map(r => r.id), ['ok', 'madrugada']);
});

test('no le pide confirmar a quien reservó después de las 18', () => {
  const rs = [
    { id: 'antes', ...base, createdAt: '2026-10-31T20:59:00Z' },          // 17:59 AR
    { id: 'despues', ...base, createdAt: '2026-10-31T21:01:00Z' },        // 18:01 AR
    { id: 'timestamp', ...base, createdAt: { toMillis: () => Date.parse('2026-10-31T21:02:00Z') } },
    { id: 'sinFecha', ...base, createdAt: undefined },
  ];
  assert.deepEqual(pendientesDeConfirmar(rs, NOW).map(r => r.id), ['antes', 'sinFecha']);
});

test('parámetros de la plantilla: todos con datos, sin vacíos ni saltos de línea', () => {
  assert.deepEqual(paramsConfirmacion({ ...base, nombre: 'Martina Sol', preferencia: 'Living' }),
    ['Martina', 'sábado 31/10', '21:00', '2 personas', 'Living']);
  assert.deepEqual(paramsConfirmacion({ fecha: '2026-11-06', horario: '20:00', cantidadPersonas: 1, nombre: '', preferencia: '' }),
    ['cliente', 'viernes 6/11', '20:00', '1 persona', 'Sin preferencia de ubicación']);
  assert.equal(paramsConfirmacion({ ...base, evento: 'Noche\nInternacional' })[4], 'Evento: Noche Internacional');
});

test('el texto guardado en el chat es el que recibe el cliente', () => {
  const txt = textoConfirmacion(['Martina', 'sábado 31/10', '21:00', '2 personas', 'Living']);
  assert.match(txt, /^Hola Martina! .*\n\n📅 sábado 31\/10\n🕗 21:00 hs\n👥 2 personas\n📍 Living\n\n/s);
  assert.doesNotMatch(txt, /\{\{/);
});

test('payload de los botones ida y vuelta', () => {
  assert.deepEqual(parsePayload(payloadBoton('cancelar', 'abc123')), { accion: 'cancelar', reservaId: 'abc123' });
  assert.equal(parsePayload('Confirmo'), null);
  assert.equal(parsePayload(null), null);
});

test('respuestas al cliente y contexto para el bot', () => {
  assert.equal(respuestaConfirmo(base), '¡Genial, Martina! Te esperamos hoy a las 21:00 🍷');
  assert.equal(respuestaConfirmo(null), '¡Genial! Te esperamos hoy 🍷');
  assert.match(contextoParaBot({ accion: 'cancelar', reservaId: 'X' }, base), /cancelar_reserva con ese id/);
  assert.match(contextoParaBot({ accion: 'modificar', reservaId: 'X' }, base), /modificar_reserva.*/);
});
