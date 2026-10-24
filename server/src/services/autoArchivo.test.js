import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debeArchivarse, INACTIVIDAD_MS } from './autoArchivo.service.js';

const now = Date.parse('2026-10-24T15:00:00Z');
const viejo = new Date(now - INACTIVIDAD_MS - 1000);
const reciente = new Date(now - 60 * 1000);
const charla = (over = {}) => ({
  status: 'bot', humanMode: false, updatedAt: viejo,
  messages: [{ role: 'user', content: 'quiero reservar' }, { role: 'assistant', content: '¡Listo, reserva confirmada!' }],
  ...over,
});

test('archiva charla del bot quieta con el bot como último en hablar', () => {
  assert.equal(debeArchivarse(charla(), now), true);
  assert.equal(debeArchivarse(charla({ updatedAt: { toMillis: () => viejo.getTime() } }), now), true);
});

test('no archiva si es reciente, está con un humano o ya cerrada', () => {
  assert.equal(debeArchivarse(charla({ updatedAt: reciente }), now), false);
  assert.equal(debeArchivarse(charla({ humanMode: true }), now), false);
  assert.equal(debeArchivarse(charla({ status: 'escalated' }), now), false);
  assert.equal(debeArchivarse(charla({ status: 'bot_archived' }), now), false);
});

test('no archiva si el último mensaje es del cliente (el bot no contestó)', () => {
  assert.equal(debeArchivarse(charla({ messages: [{ role: 'assistant', content: 'hola' }, { role: 'user', content: '?' }] }), now), false);
  assert.equal(debeArchivarse(charla({ messages: [] }), now), false);
});
