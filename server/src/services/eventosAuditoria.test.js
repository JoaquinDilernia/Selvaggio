import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limpiarEvento, camposCambiados, describirCambios, quien } from './eventosAuditoria.js';

test('limpiarEvento: pide título y fecha al crear, normaliza tipos', () => {
  assert.throws(() => limpiarEvento({ fecha: '2026-12-01' }), /título/);
  assert.throws(() => limpiarEvento({ titulo: 'X' }), /fecha/);
  const e = limpiarEvento({ titulo: ' Cata ', fecha: '2026-12-01', visible: false, esPago: 'x', otro: 1 });
  assert.deepEqual(e, { titulo: 'Cata', fecha: '2026-12-01', visible: false, esPago: null });
  assert.throws(() => limpiarEvento({ titulo: 'X', fecha: '2026-12-01', esPago: true, precio: '' }), /precio/);
});

test('limpiarEvento parcial: sólo valida lo que viene', () => {
  assert.deepEqual(limpiarEvento({ visible: true }, { parcial: true }), { visible: true });
  assert.throws(() => limpiarEvento({ titulo: '' }, { parcial: true }), /título/);
});

test('camposCambiados + describirCambios', () => {
  const antes = { titulo: 'A', fecha: '2026-12-01', precio: '' };
  const c = camposCambiados(antes, { titulo: 'B', fecha: '2026-12-01', precio: '100', horaInicio: '' });
  assert.deepEqual(c, ['titulo', 'precio']);
  assert.equal(describirCambios(c), 'título y precio');
  assert.equal(describirCambios(['titulo', 'fecha', 'precio']), 'título, fecha y precio');
  assert.equal(describirCambios(['fecha']), 'fecha');
});

test('quien: nombre del usuario o Sistema', () => {
  assert.deepEqual(quien({ name: 'Cielo', email: 'c@x' }), { nombre: 'Cielo', email: 'c@x' });
  assert.deepEqual(quien(null), { nombre: 'Sistema', email: null });
});
