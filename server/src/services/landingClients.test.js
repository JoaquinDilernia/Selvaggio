import { test } from 'node:test';
import assert from 'node:assert/strict';
import { _mergeClientsForTest as merge } from './landingClients.service.js';

const base = { nombre: null, email: null, telefono: null, fechaNacimiento: null, totalReservas: 0, totalPedidos: 0, ultimaReserva: null, ultimoPedido: null, creado: null };

test('mismo teléfono con dos mails: suma contadores y junta los mails', () => {
  const a = { ...base, id: 'a@x.com', email: 'a@x.com', nombre: 'Ana', totalReservas: 2, ultimaReserva: '2026-05-01T00:00:00Z' };
  const b = { ...base, id: 'b@x.com', email: 'b@x.com', nombre: 'Ana Pérez', totalPedidos: 3, ultimoPedido: '2026-09-01T00:00:00Z' };
  const m = merge(a, b);
  assert.equal(m.totalReservas, 2);
  assert.equal(m.totalPedidos, 3);
  assert.deepEqual(m.emails.sort(), ['a@x.com', 'b@x.com']);
  assert.equal(m.nombre, 'Ana Pérez'); // el más reciente manda
});

test('un campo vacío del más reciente no pisa el dato del viejo', () => {
  const viejo = { ...base, email: 'v@x.com', fechaNacimiento: '1990-01-01', creado: '2025-01-01' };
  const nuevo = { ...base, email: 'n@x.com', fechaNacimiento: '', creado: '2026-01-01' };
  assert.equal(merge(viejo, nuevo).fechaNacimiento, '1990-01-01');
});
