import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInstagramWindowError, sendInstagramAsAgent, splitInstagramText, toInstagramText, IG_TEXT_MAX } from './meta.service.js';
import { isOwnMediaPath } from './mediaStore.js';
import { prepareInstagramMedia, MediaRejectedError } from './media.service.js';

const igErr = (error) => Object.assign(new Error('meta'), { response: { data: { error } } });

test('isInstagramWindowError: subcode 2534022 o mensaje de ventana', () => {
  assert.equal(isInstagramWindowError(igErr({ code: 10, error_subcode: 2534022 })), true);
  assert.equal(isInstagramWindowError(igErr({ code: 10, message: 'This message is sent outside of allowed window.' })), true);
  assert.equal(isInstagramWindowError(igErr({ code: 100, message: 'Invalid parameter' })), false);
});

test('sendInstagramAsAgent: si la ventana venció reintenta con HUMAN_AGENT', async () => {
  const calls = [];
  const r = await sendInstagramAsAgent(async (opts) => {
    calls.push(opts.humanAgent);
    if (!opts.humanAgent) throw igErr({ code: 10, error_subcode: 2534022 });
    return 'mid-ok';
  });
  assert.deepEqual(calls, [false, true]);
  assert.equal(r, 'mid-ok');
});

test('sendInstagramAsAgent: otros errores no reintentan', async () => {
  const calls = [];
  await assert.rejects(sendInstagramAsAgent(async (opts) => {
    calls.push(opts.humanAgent);
    throw igErr({ code: 100, message: 'Invalid parameter' });
  }));
  assert.deepEqual(calls, [false]);
});

test('splitInstagramText: corto queda igual; largo se parte en ≤1000 sin perder texto', () => {
  assert.deepEqual(splitInstagramText('hola'), ['hola']);
  const largo = Array.from({ length: 60 }, (_, i) => `Oración número ${i} con algo de texto.`).join(' ');
  const partes = splitInstagramText(largo);
  assert.ok(partes.length > 1);
  assert.ok(partes.every(p => p.length <= IG_TEXT_MAX));
  assert.equal(partes.join(' '), largo);
});

test('splitInstagramText: palabra gigante sin espacios igual se corta', () => {
  const partes = splitInstagramText('x'.repeat(2500));
  assert.ok(partes.every(p => p.length <= IG_TEXT_MAX));
  assert.equal(partes.join(''), 'x'.repeat(2500));
});

test('toInstagramText: saca los asteriscos de negrita', () => {
  assert.equal(toInstagramText('La *Cava* cuesta **$50.000** por persona'), 'La Cava cuesta $50.000 por persona');
  assert.equal(toInstagramText('2 * 3'), '2 * 3');
});

test('isOwnMediaPath: solo rutas de selvaggio/ig-media, sin ..', () => {
  assert.equal(isOwnMediaPath('selvaggio/ig-media/2026-11/abc.jpg'), true);
  assert.equal(isOwnMediaPath('selvaggio/kb/carta.pdf'), false);
  assert.equal(isOwnMediaPath('selvaggio/ig-media/../../otra-app/x'), false);
  assert.equal(isOwnMediaPath(undefined), false);
});

test('prepareInstagramMedia: PDF → file, foto → image', async () => {
  const pdf = await prepareInstagramMedia({ buffer: Buffer.from('%PDF'), mimetype: 'application/pdf', originalname: 'carta.pdf' });
  assert.equal(pdf.igType, 'file');
  assert.equal(pdf.mediaType, 'document');
  const img = await prepareInstagramMedia({ buffer: Buffer.from('x'), mimetype: 'image/jpeg', originalname: 'a.jpg' });
  assert.equal(img.igType, 'image');
});

test('prepareInstagramMedia: Word no se puede por IG', async () => {
  await assert.rejects(
    prepareInstagramMedia({ buffer: Buffer.from('x'), mimetype: '', originalname: 'presupuesto.docx' }),
    MediaRejectedError,
  );
});

import { formatInstagramName } from './meta.service.js';
test('formatInstagramName: "Nombre (@usuario)", solo @usuario, o null', () => {
  assert.equal(formatInstagramName({ name: 'Paula', username: 'pauraton' }), 'Paula (@pauraton)');
  assert.equal(formatInstagramName({ username: 'pauraton' }), '@pauraton');
  assert.equal(formatInstagramName({ name: '  ', username: 'x' }), '@x');
  assert.equal(formatInstagramName({}), null);
});
