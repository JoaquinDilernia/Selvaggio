import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esDelContacto, yaPaso, aplicarCambios, notaCambio } from './reservasCambios.service.js';
import { normalizarConfigReservas } from './reservas.service.js';

const cfg = normalizarConfigReservas(null); // mesas de hasta 9
const reserva = { fecha: '2026-10-31', horario: '21:00', cantidadPersonas: 4, preferencia: 'Jardín', contactId: '5491155554444' };

test('la reserva es del contacto por contactId o por el teléfono de la web', () => {
  assert.equal(esDelContacto(reserva, '5491155554444'), true);
  assert.equal(esDelContacto({ telefono: '11 5555-4444' }, '5491155554444'), true);
  assert.equal(esDelContacto({ telefono: '011 15 5555 4444' }, '5491155554444'), true);
  assert.equal(esDelContacto({ telefono: '11 5555-9999' }, '5491155554444'), false);
  assert.equal(esDelContacto(reserva, null), false);
});

test('ya pasó: días anteriores y horarios de hoy que ya llegaron (la madrugada es de la misma noche)', () => {
  const hoy = { fecha: '2026-10-31', hora: '21:30' };
  assert.equal(yaPaso({ fecha: '2026-10-30', horario: '21:00' }, hoy), true);
  assert.equal(yaPaso({ fecha: '2026-10-31', horario: '21:00' }, hoy), true);
  assert.equal(yaPaso({ fecha: '2026-10-31', horario: '22:00' }, hoy), false);
  assert.equal(yaPaso({ fecha: '2026-10-31', horario: '01:00' }, hoy), false);
  assert.equal(yaPaso({ fecha: '2026-11-01', horario: '20:00' }, hoy), false);
});

test('aplica solo lo que cambia', () => {
  const { nueva, tocados } = aplicarCambios(reserva, { horario: '22:00', cantidadPersonas: 4, preferencia: 'Living' }, cfg);
  assert.deepEqual(tocados, ['horario', 'preferencia']);
  assert.equal(nueva.horario, '22:00');
  assert.equal(nueva.fecha, '2026-10-31');
});

test('rechaza datos inválidos, más personas que una mesa y cambios vacíos', () => {
  assert.throws(() => aplicarCambios(reserva, { cantidadPersonas: 12 }, cfg), /hasta 9/);
  assert.throws(() => aplicarCambios(reserva, { preferencia: 'Terraza' }, cfg), /preferencia/);
  assert.throws(() => aplicarCambios(reserva, { fecha: '31/10' }, cfg), /Fecha inválida/);
  assert.throws(() => aplicarCambios(reserva, { horario: '21:00' }, cfg), /nada para cambiar/);
});

test('reserva de evento: cambia personas pero no día ni hora', () => {
  const ev = { ...reserva, evento: 'Cerámica y vino', preferencia: '' };
  assert.throws(() => aplicarCambios(ev, { horario: '22:00' }, cfg), /evento/);
  assert.deepEqual(aplicarCambios(ev, { cantidadPersonas: 12 }, cfg).tocados, ['cantidadPersonas']);
});

test('la nota para el equipo dice cómo era antes', () => {
  assert.equal(
    notaCambio(reserva, { fecha: '2026-10-24', hora: '15:05' }),
    'Modificada por WhatsApp (bot) el 24/10 15:05; antes: sáb 31/10 21:00 · 4 pers · Jardín',
  );
});
