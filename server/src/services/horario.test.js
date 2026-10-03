import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describirHorario } from './horario.js';
import { getDefaultConfig } from '../routes/config.routes.js';

test('describe el horario por defecto de Selvaggio agrupando días', () => {
  assert.equal(
    describirHorario(getDefaultConfig()),
    'martes a jueves y domingo de 18:00 a 00:00; viernes y sábado de 18:00 a 02:00',
  );
});

test('sin horario habilitado no describe nada', () => {
  assert.equal(describirHorario({ businessHours: { enabled: false } }), null);
});
