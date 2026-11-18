import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esMensajeRepetido } from './duplicateGuard.js';

const now = new Date('2026-11-18T15:00:00Z');
const hace = (seg) => new Date(now.getTime() - seg * 1000);

test('mismo id de Meta = repetido (reentrega del webhook)', () => {
  const history = [{ role: 'user', content: 'hola', waMsgId: 'm1', timestamp: hace(600) }];
  assert.equal(esMensajeRepetido({ messageId: 'm1', type: 'text', text: 'otra cosa' }, history, now), 'mismo_id');
});

test('mismo texto que el último del cliente hace segundos = repetido', () => {
  const history = [
    { role: 'user', content: 'Hola, tienen lugar el sábado?', waMsgId: 'm1', timestamp: hace(20) },
    { role: 'assistant', content: 'Sí! ¿Para cuántas personas?', timestamp: hace(15) },
  ];
  assert.equal(esMensajeRepetido({ messageId: 'm2', type: 'text', text: 'hola, tienen lugar el sabado?  ' }, history, now), 'mismo_texto');
});

test('acepta timestamps de Firestore (toDate)', () => {
  const history = [{ role: 'user', content: 'hola', timestamp: { toDate: () => hace(5) } }];
  assert.equal(esMensajeRepetido({ messageId: 'm2', type: 'text', text: 'hola' }, history, now), 'mismo_texto');
});

test('mismo texto pero hace más de 3 minutos = no repetido', () => {
  const history = [{ role: 'user', content: 'hola', timestamp: hace(400) }];
  assert.equal(esMensajeRepetido({ messageId: 'm2', type: 'text', text: 'hola' }, history, now), null);
});

test('texto distinto = no repetido', () => {
  const history = [{ role: 'user', content: 'hola', timestamp: hace(5) }];
  assert.equal(esMensajeRepetido({ messageId: 'm2', type: 'text', text: 'somos 4' }, history, now), null);
});

test('solo mira el último mensaje del cliente', () => {
  const history = [
    { role: 'user', content: 'si', timestamp: hace(60) },
    { role: 'assistant', content: '¿Confirmo?', timestamp: hace(50) },
    { role: 'user', content: 'a las 21', timestamp: hace(40) },
  ];
  assert.equal(esMensajeRepetido({ messageId: 'm9', type: 'text', text: 'si' }, history, now), null);
});

test('"si" repetido después de una pregunta del bot = respuesta real', () => {
  const history = [
    { role: 'user', content: 'si', timestamp: hace(20) },
    { role: 'assistant', content: '¿Te confirmo la mesa para 4 a las 21?', timestamp: hace(15) },
  ];
  assert.equal(esMensajeRepetido({ messageId: 'm2', type: 'text', text: 'Sí!' }, history, now), null);
});

test('"si" repetido sin pregunta del bot en el medio = repetido', () => {
  const history = [
    { role: 'user', content: 'si', timestamp: hace(20) },
    { role: 'assistant', content: 'Listo, te espero el sábado.', timestamp: hace(15) },
  ];
  assert.equal(esMensajeRepetido({ messageId: 'm2', type: 'text', text: 'si' }, history, now), 'mismo_texto');
});

test('"hola" repetido aunque el bot haya preguntado = repetido', () => {
  const history = [
    { role: 'user', content: 'Hola', timestamp: hace(20) },
    { role: 'assistant', content: '¡Hola! ¿En qué te ayudo?', timestamp: hace(15) },
  ];
  assert.equal(esMensajeRepetido({ messageId: 'm2', type: 'text', text: 'Hola' }, history, now), 'mismo_texto');
});

test('fotos/audios no se filtran por contenido', () => {
  const history = [{ role: 'user', content: '[Imagen recibida]', mediaType: 'image', timestamp: hace(5) }];
  assert.equal(esMensajeRepetido({ messageId: 'm2', type: 'image', text: '' }, history, now), null);
});
