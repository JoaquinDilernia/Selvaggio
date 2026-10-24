import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReasonMarker, isTeamStarted } from './escalationReasons.js';

test('lee categoría y detalle y saca la línea del marcador', () => {
  const r = parseReasonMarker('Te paso con el equipo para cambiar el horario.\n[ESCALAR_SOPORTE]\n[MOTIVO:cambio_reserva|quiere pasar de 21 a 22]');
  assert.equal(r.reason, 'cambio_reserva');
  assert.equal(r.detail, 'quiere pasar de 21 a 22');
  assert.equal(r.cleanText, 'Te paso con el equipo para cambiar el horario.\n[ESCALAR_SOPORTE]');
});

test('sin detalle, mayúsculas y categoría desconocida', () => {
  assert.equal(parseReasonMarker('[MOTIVO:RECLAMO]').reason, 'reclamo');
  assert.equal(parseReasonMarker('[MOTIVO:reclamo]').detail, null);
  assert.equal(parseReasonMarker('Hola [MOTIVO:cualquiera|x]').reason, 'otro');
  assert.equal(parseReasonMarker('Hola [MOTIVO:cualquiera|x]').cleanText, 'Hola');
});

test('sin marcador no toca el texto', () => {
  const r = parseReasonMarker('Te paso con alguien del equipo.');
  assert.deepEqual(r, { reason: null, detail: null, cleanText: 'Te paso con alguien del equipo.' });
});

test('solo las charlas que arrancó el equipo quedan fuera de la tasa del bot', () => {
  assert.equal(isTeamStarted('equipo_inicio'), true);
  assert.equal(isTeamStarted('equipo_toma'), false);
  assert.equal(isTeamStarted(null), false);
});
