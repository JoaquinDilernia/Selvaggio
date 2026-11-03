import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encolarPdfCava, documentosPrompt } from './documentos.tools.js';

const carta = { id: 'c1', title: 'CARTA', uso: 'carta', fileName: 'carta.pdf', fileUrl: 'https://x/carta.pdf' };
const cava = { id: 'k1', title: 'CAVA SELVAGGIO', uso: 'otro', fileName: 'cava.pdf', fileUrl: 'https://x/cava.pdf' };
const docs = [carta, cava];

test('pdf cava: se encola si preguntan por la cava', () => {
  const cola = [];
  assert.equal(encolarPdfCava({ docs, userText: 'Sigue la cava disponible el 13?', cola })?.id, 'k1');
  assert.deepEqual(cola.map(d => d.id), ['k1']);
});

test('pdf cava: se encola si se consultaron fechas o el bot la ofreció', () => {
  assert.ok(encolarPdfCava({ docs, userText: 'somos 40 para un cumple', toolsUsadas: new Set(['consultar_fechas_cava']), cola: [] }));
  assert.ok(encolarPdfCava({ docs, userText: 'somos 40', reply: 'Para 40 te recomiendo La Cava', cola: [] }));
});

test('pdf cava: no se repite ni se duplica', () => {
  const history = [{ role: 'assistant', mediaType: 'document', mediaUrl: 'https://x/cava.pdf', fileName: 'cava.pdf' }];
  assert.equal(encolarPdfCava({ docs, history, userText: 'y la cava?', cola: [] }), null);
  const cola = [cava];
  assert.equal(encolarPdfCava({ docs, userText: 'la cava', cola }), null);
  assert.equal(cola.length, 1);
});

test('pdf cava: nada si no se habla de la cava o no hay PDF', () => {
  assert.equal(encolarPdfCava({ docs, userText: 'mesa para 2 el viernes', cola: [] }), null);
  assert.equal(encolarPdfCava({ docs: [carta], userText: 'la cava', cola: [] }), null);
  assert.equal(encolarPdfCava({ docs: [], userText: 'la cava', cola: [] }), null);
});

test('prompt: incluye la regla de La Cava con el id del PDF', () => {
  assert.match(documentosPrompt(docs), /LA CAVA:.*k1/);
  assert.doesNotMatch(documentosPrompt([carta]), /LA CAVA:/);
});
