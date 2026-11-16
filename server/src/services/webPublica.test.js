import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarPostulacion, PUESTOS } from './webPublica.service.js';

test('validarPostulacion: acepta los datos del formulario y los limpia', () => {
  const p = validarPostulacion({ nombre: '  Ana Pérez ', email: 'Ana@Mail.com ', telefono: '11 5555', puesto: 'Cocina', mensaje: 'Hola' });
  assert.deepEqual(p, { nombre: 'Ana Pérez', email: 'ana@mail.com', telefono: '11 5555', puesto: 'Cocina', mensaje: 'Hola' });
});

test('validarPostulacion: exige nombre, email válido y un puesto de la lista', () => {
  assert.throws(() => validarPostulacion({ nombre: 'A', email: 'x', puesto: 'CEO' }), err => {
    assert.equal(err.status, 400);
    assert.match(err.message, /nombre/);
    assert.match(err.message, /email/);
    assert.match(err.message, /puesto/);
    return true;
  });
  assert.ok(PUESTOS.includes('Sommelier/Bartender'));
});

test('validarPostulacion: corta textos largos e ignora tipos raros', () => {
  const p = validarPostulacion({ nombre: 'Ana', email: 'a@b.co', puesto: 'Otro', mensaje: 'x'.repeat(5000), telefono: { $ne: 1 } });
  assert.equal(p.mensaje.length, 2000);
  assert.equal(p.telefono, '');
});
