import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionHistory, SESSION_GAP_MS } from './sessionHistory.js';

const now = Date.parse('2026-10-24T20:00:00Z');
const at = (msAgo, content) => ({ role: 'user', content, timestamp: new Date(now - msAgo).toISOString() });

test('deja afuera lo de una charla anterior', () => {
  const h = [at(SESSION_GAP_MS * 5, 'Astronight'), at(SESSION_GAP_MS * 5 - 1000, 'ok'), at(60_000, 'info de la cava')];
  assert.deepEqual(sessionHistory(h, now).map(m => m.content), ['info de la cava']);
});

test('si el último mensaje es viejo, no manda historial', () => {
  assert.deepEqual(sessionHistory([at(SESSION_GAP_MS + 1000, 'hola')], now), []);
});

test('charla continua: manda hasta 10 y respeta mensajes sin fecha', () => {
  const h = Array.from({ length: 14 }, (_, i) => at((14 - i) * 60_000, `m${i}`));
  h.push({ role: 'assistant', content: 'sin fecha' });
  const r = sessionHistory(h, now);
  assert.equal(r.length, 10);
  assert.equal(r.at(-1).content, 'sin fecha');
});
