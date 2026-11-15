import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toolsParaCanal, telefonoValido, mismoTitular, reservasPrompt, runReservaTool, RESERVAS_TOOLS } from './reservas.tools.js';
import { marcaBot, camposCanal } from './reservas.service.js';
import { esReservaDelBot } from './botReservasStats.js';

test('WhatsApp: mismas tools de siempre, sin campo telefono', () => {
  const tools = toolsParaCanal('whatsapp');
  assert.equal(tools, RESERVAS_TOOLS);
  assert.ok(!tools.find(t => t.name === 'crear_reserva_mesa').input_schema.properties.telefono);
});

test('Instagram: están todas las tools y las que crean/buscan piden telefono', () => {
  const tools = toolsParaCanal('instagram');
  assert.equal(tools.length, RESERVAS_TOOLS.length);
  for (const n of ['crear_reserva_mesa', 'reservar_evento', 'reservar_cava', 'crear_pedido_takeaway', 'mis_reservas', 'modificar_reserva', 'cancelar_reserva', 'mis_pedidos_takeaway']) {
    assert.ok(tools.find(t => t.name === n).input_schema.properties.telefono, n);
  }
  assert.ok(tools.find(t => t.name === 'cancelar_reserva').input_schema.properties.nombreTitular);
  assert.ok(!tools.find(t => t.name === 'crear_reserva_mesa').input_schema.properties.nombreTitular);
  assert.ok(!tools.find(t => t.name === 'consultar_agenda').input_schema.properties.telefono);
  // No toca las originales.
  assert.ok(!RESERVAS_TOOLS.find(t => t.name === 'mis_reservas').input_schema.properties.telefono);
});

test('telefonoValido: normaliza celulares argentinos y rechaza basura', () => {
  assert.equal(telefonoValido('11 2345-6789'), '5491123456789');
  assert.equal(telefonoValido('+54 9 11 2345 6789'), '5491123456789');
  assert.equal(telefonoValido('011 15 2345-6789'), '5491123456789');
  assert.equal(telefonoValido('1234'), null);
  assert.equal(telefonoValido('hola'), null);
  assert.equal(telefonoValido(''), null);
});

test('mismoTitular: coincide por nombre o apellido, sin acentos', () => {
  const r = { nombre: 'Lucía', apellido: 'Pérez' };
  assert.equal(mismoTitular('lucia', r), true);
  assert.equal(mismoTitular('a nombre de Perez', r), true);
  assert.equal(mismoTitular('Martín', r), false);
  assert.equal(mismoTitular('', r), false);
});

test('marca y campos de canal', () => {
  assert.equal(marcaBot({}), 'Por WhatsApp (bot)');
  assert.equal(marcaBot({ instagramId: '123' }), 'Por Instagram (bot)');
  assert.deepEqual(camposCanal({ instagramId: '123' }), { canal: 'instagram', instagramId: '123' });
  assert.deepEqual(camposCanal({}), {});
  assert.equal(esReservaDelBot({ comentarios: 'Por Instagram (bot) · cumple' }), true);
});

test('prompt: por WhatsApp no pide teléfono; por Instagram sí', () => {
  assert.match(reservasPrompt(new Date(), undefined, { channel: 'whatsapp' }), /El teléfono ya lo tenemos/);
  const ig = reservasPrompt(new Date(), undefined, { channel: 'instagram' });
  assert.doesNotMatch(ig, /El teléfono ya lo tenemos/);
  assert.match(ig, /celular con código de área/);
});

test('Instagram sin celular: la tool pide el número (no crea nada)', async () => {
  const ctx = { channel: 'instagram', contactId: '17840000000000000', customer: {} };
  const r = await runReservaTool('crear_reserva_mesa', { nombre: 'Lu', cantidadPersonas: 2, fecha: '2026-12-01', horario: '20:00', preferencia: 'Jardín' }, ctx);
  assert.match(r.error, /Falta el celular/);
  const r2 = await runReservaTool('cancelar_reserva', { id: 'x', telefono: '123' }, ctx);
  assert.match(r2.error, /no parece un celular/);
});
