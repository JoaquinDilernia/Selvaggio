import { test } from 'node:test';
import assert from 'node:assert/strict';
import { telefonoComanda, paramsPedidoListo, PLANTILLA_PEDIDO_LISTO } from './comandas.service.js';

test('teléfono de caja: formatos habituales → 549 + 10 dígitos', () => {
  for (const raw of ['1155667788', '11 5566-7788', '01155667788', '+54 9 11 5566 7788', '541155667788', '11 15 5566 7788']) {
    assert.equal(telefonoComanda(raw), '5491155667788', raw);
  }
  assert.equal(telefonoComanda('351 516 3920'), '5493515163920');
});

test('teléfono de caja: inválidos → null', () => {
  for (const raw of ['', null, '5566778', '55667788', '115566778', '11556677889', '+1 415 555 0100', 'abc']) {
    assert.equal(telefonoComanda(raw), null, String(raw));
  }
});

test('variables de la plantilla: primer nombre y número sin #', () => {
  assert.deepEqual(paramsPedidoListo({ nombre: '  Juan Pérez ', numeroPedido: '#042' }), ['Juan', '042']);
  assert.deepEqual(paramsPedidoListo({ nombre: '', numeroPedido: '' }), ['cliente', '-']);
  assert.deepEqual(paramsPedidoListo({ nombre: 'Ana', numeroPedido: 7 }), ['Ana', '7']);
});

test('la plantilla tiene una variable por parámetro', () => {
  const vars = PLANTILLA_PEDIDO_LISTO.bodyText.match(/\{\{\d+\}\}/g);
  assert.equal(vars.length, PLANTILLA_PEDIDO_LISTO.params.length);
});
