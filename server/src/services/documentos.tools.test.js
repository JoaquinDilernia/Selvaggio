import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encolarPdfsAutomaticos, documentosPrompt, documentoCava } from './documentos.tools.js';

const carta = { id: 'c1', title: 'CARTA', uso: 'carta', fileName: 'carta.pdf', fileUrl: 'https://x/carta.pdf' };
const cava = { id: 'k1', title: 'CAVA SELVAGGIO', uso: 'otro', fileName: 'cava.pdf', fileUrl: 'https://x/cava.pdf' };
const degu = { id: 'd1', title: 'DEGUSTACION SELVAGGIO', uso: 'cava', fileName: 'degu.pdf', fileUrl: 'https://x/degu.pdf' };
const docs = [carta, degu, cava];
const ids = arr => arr.map(d => d.id);

test('pdf cava: se encola si preguntan por la cava', () => {
  const cola = [];
  assert.deepEqual(ids(encolarPdfsAutomaticos({ docs, userText: 'Sigue la cava disponible el 13?', cola })), ['k1']);
  assert.deepEqual(ids(cola), ['k1']);
});

test('pdf cava: se encola si se consultaron fechas o el bot la ofreció', () => {
  assert.deepEqual(ids(encolarPdfsAutomaticos({ docs, userText: 'somos 40 para un cumple', toolsUsadas: new Set(['consultar_fechas_cava']), cola: [] })), ['k1']);
  assert.deepEqual(ids(encolarPdfsAutomaticos({ docs, userText: 'somos 40', reply: 'Para 40 te recomiendo La Cava', cola: [] })), ['k1']);
});

test('pdf cava: se elige por título aunque otro PDF tenga uso cava', () => {
  assert.equal(documentoCava(docs).id, 'k1');
});

test('pdf degustación: se encola si preguntan por la degustación', () => {
  assert.deepEqual(ids(encolarPdfsAutomaticos({ docs, userText: 'Que precio la degustacion completa c maridaje?', cola: [] })), ['d1']);
  assert.deepEqual(ids(encolarPdfsAutomaticos({ docs, userText: 'qué tienen para picar?', reply: 'Te recomiendo la Degustación Selvaggio', cola: [] })), ['d1']);
});

test('pdf degustación: no va si el tema es la cava ni con "menú de pasos"', () => {
  assert.deepEqual(ids(encolarPdfsAutomaticos({ docs, userText: 'qué incluye la cava?', reply: 'incluye la degustación completa con maridaje', cola: [] })), ['k1']);
  assert.deepEqual(encolarPdfsAutomaticos({ docs, userText: 'quiero reservar para menú de pasos jueves', cola: [] }), []);
});

test('pdfs automáticos: no se repiten ni se duplican', () => {
  const history = [{ role: 'assistant', mediaType: 'document', mediaUrl: 'https://x/cava.pdf', fileName: 'cava.pdf' }];
  assert.deepEqual(encolarPdfsAutomaticos({ docs, history, userText: 'y la cava?', cola: [] }), []);
  const cola = [degu];
  assert.deepEqual(encolarPdfsAutomaticos({ docs, userText: 'la degustación', cola }), []);
  assert.equal(cola.length, 1);
});

test('pdfs automáticos: nada si no se habla del tema o no hay PDF', () => {
  assert.deepEqual(encolarPdfsAutomaticos({ docs, userText: 'mesa para 2 el viernes', cola: [] }), []);
  assert.deepEqual(encolarPdfsAutomaticos({ docs: [carta], userText: 'la cava y la degustación', cola: [] }), []);
  assert.deepEqual(encolarPdfsAutomaticos({ docs: [], userText: 'la cava', cola: [] }), []);
});

test('prompt: incluye las reglas de La Cava y la Degustación con sus ids', () => {
  const p = documentosPrompt(docs);
  assert.match(p, /LA CAVA:.*k1/);
  assert.match(p, /DEGUSTACIÓN:.*d1/);
  assert.doesNotMatch(documentosPrompt([carta]), /LA CAVA:|DEGUSTACIÓN:/);
});
