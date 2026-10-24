import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumirReservasBot, esReservaDelBot } from './botReservasStats.js';

const range = { startMs: Date.parse('2026-10-18T03:00:00Z'), endMs: Date.parse('2026-10-25T03:00:00Z') };
const ts = (iso) => ({ toMillis: () => Date.parse(iso) });

test('reconoce reservas del bot por origen o por la marca en comentarios', () => {
  assert.equal(esReservaDelBot({ origen: 'bot' }), true);
  assert.equal(esReservaDelBot({ comentarios: 'Por WhatsApp (bot) · ventana' }), true);
  assert.equal(esReservaDelBot({ origen: 'web', comentarios: 'cumple' }), false);
  assert.equal(esReservaDelBot({}), false);
});

test('cuenta reservas y pedidos del bot dentro del período, sin canceladas', () => {
  const mesas = [
    { id: 'a', origen: 'bot', cantidadPersonas: 4, createdAt: '2026-10-20T22:00:00.000Z', estado: 'confirmada' },
    { id: 'b', origen: 'bot', cantidadPersonas: '2', evento: 'Cata', createdAt: '2026-10-21T22:00:00.000Z', estado: 'confirmada' },
    { id: 'c', origen: 'bot', cantidadPersonas: 6, createdAt: '2026-10-22T22:00:00.000Z', estado: 'cancelada' },
    { id: 'd', cantidadPersonas: 2, createdAt: '2026-10-22T20:00:00.000Z', estado: 'confirmada' },
    { id: 'e', origen: 'bot', cantidadPersonas: 3, createdAt: '2026-10-10T22:00:00.000Z' }, // fuera del período
  ];
  const pedidos = [
    { id: 'p1', origen: 'bot', total: 25000, createdAt: ts('2026-10-21T23:00:00Z'), estado: 'listo' },
    { id: 'p2', origen: 'web', total: 18000, createdAt: ts('2026-10-21T23:30:00Z'), estado: 'completado' },
    { id: 'p3', origen: 'web', total: 9000, createdAt: ts('2026-10-22T23:30:00Z'), estado: 'pendiente' },
  ];
  const r = resumirReservasBot(mesas, pedidos, range);
  assert.deepEqual(r.mesas, { bot: 2, web: 1, sharePct: 67, personasBot: 6, eventosBot: 1, canceladasBot: 1 });
  assert.deepEqual(r.takeaway, { bot: 1, web: 2, sharePct: 33, totalBot: 25000, totalWeb: 27000, canceladosBot: 0 });
  assert.equal(r.recientes.length, 4); // 3 mesas del bot (incluida la cancelada) + 1 pedido
  assert.equal(r.recientes[0].id, 'c'); // más nueva primero
  assert.equal(r.recientes.find(x => x.id === 'b').tipo, 'evento');
});

test('sin datos devuelve ceros', () => {
  const r = resumirReservasBot([], [], range);
  assert.equal(r.mesas.sharePct, 0);
  assert.equal(r.takeaway.totalBot, 0);
  assert.deepEqual(r.recientes, []);
});
