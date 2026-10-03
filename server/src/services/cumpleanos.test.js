import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarCumple, cumpleDelCliente } from './cumpleanos.service.js';

const opt = { anioActual: 2026 };

test('normaliza los formatos que escribe la gente', () => {
  assert.deepEqual(normalizarCumple('15/3', opt), { cumpleanos: '03-15', fechaNacimiento: '' });
  assert.deepEqual(normalizarCumple('15/03/1990', opt), { cumpleanos: '03-15', fechaNacimiento: '1990-03-15' });
  assert.deepEqual(normalizarCumple('1990-03-15', opt), { cumpleanos: '03-15', fechaNacimiento: '1990-03-15' });
  assert.deepEqual(normalizarCumple('03-15', opt), { cumpleanos: '03-15', fechaNacimiento: '' });
  assert.deepEqual(normalizarCumple('5/7/92', opt), { cumpleanos: '07-05', fechaNacimiento: '1992-07-05' });
  assert.deepEqual(normalizarCumple('29/02', opt), { cumpleanos: '02-29', fechaNacimiento: '' });
});

test('rechaza fechas imposibles y descarta años absurdos', () => {
  assert.equal(normalizarCumple('31/02', opt), null);
  assert.equal(normalizarCumple('mañana', opt), null);
  assert.deepEqual(normalizarCumple('15/03/2026', opt), { cumpleanos: '03-15', fechaNacimiento: '' });
});

test('estado: bot > web válida > no quiere > desconocido; año 2026 de la web es dudoso', () => {
  assert.equal(cumpleDelCliente({ cumpleanos: '03-15' }, opt).estado, 'conocido');
  assert.deepEqual(cumpleDelCliente({ landingClient: { fechaNacimiento: '1988-11-02' } }, opt), { estado: 'conocido', mmdd: '11-02', fuente: 'web' });
  assert.equal(cumpleDelCliente({ landingClient: { fechaNacimiento: '2026-11-02' } }, opt).estado, 'desconocido');
  assert.equal(cumpleDelCliente({ cumpleanosNoQuiere: true }, opt).estado, 'no_quiere');
  assert.equal(cumpleDelCliente({}, opt).estado, 'desconocido');
});
