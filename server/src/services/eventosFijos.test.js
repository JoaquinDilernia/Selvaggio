import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fechasDeSerie, docGenerado, idGenerado, planSerie } from './eventosFijos.js';

const hoy = '2026-11-13'; // viernes
const serie = { id: 's1', diaSemana: 5, desde: '2026-11-01', titulo: 'Pintura y Vino', horaInicio: '19:00', horaFin: '02:00', visible: true };

test('fechasDeSerie: todos los viernes de las próximas 8 semanas', () => {
  assert.deepEqual(fechasDeSerie(serie, { hoy }), [
    '2026-11-13', '2026-11-20', '2026-11-27', '2026-12-04',
    '2026-12-11', '2026-12-18', '2026-12-25', '2027-01-01',
  ]);
});

test('fechasDeSerie: respeta hasta, excluidas, activo y desde', () => {
  assert.equal(fechasDeSerie({ ...serie, hasta: '2026-11-27' }, { hoy }).length, 3);
  assert.ok(!fechasDeSerie({ ...serie, excluidas: ['2026-11-20'] }, { hoy }).includes('2026-11-20'));
  assert.deepEqual(fechasDeSerie({ ...serie, activo: false }, { hoy }), []);
  assert.equal(fechasDeSerie({ ...serie, desde: '2026-11-20' }, { hoy })[0], '2026-11-20');
  assert.deepEqual(fechasDeSerie({ ...serie, hasta: '2026-11-01' }, { hoy }), []);
});

test('docGenerado: copia campos, nunca popup, marca la serie', () => {
  const d = docGenerado({ ...serie, esPopup: true, popupImagen: 'x' }, '2026-11-20');
  assert.equal(d.esPopup, false);
  assert.equal(d.popupImagen, undefined);
  assert.equal(d.serieId, 's1');
  assert.equal(d.generado, true);
  assert.equal(d.fecha, '2026-11-20');
  assert.equal(d.titulo, 'Pintura y Vino');
  assert.equal(idGenerado('s1', '2026-11-20'), 'fijo_s1_2026-11-20');
});

test('planSerie: no pisa un generado editado a mano', () => {
  const { upserts, borrar } = planSerie(serie, [{ id: 'fijo_s1_2026-11-13', fecha: '2026-11-13', editadoManual: true }], { hoy });
  assert.ok(!upserts.some(u => u.id === 'fijo_s1_2026-11-13'));
  assert.ok(!borrar.includes('fijo_s1_2026-11-13'));
  assert.equal(upserts.length, 7);
});

test('planSerie: cambiar el día borra los viejos y crea los nuevos', () => {
  const { upserts, borrar } = planSerie({ ...serie, diaSemana: 6 }, [{ id: 'fijo_s1_2026-11-20', fecha: '2026-11-20' }], { hoy });
  assert.deepEqual(borrar, ['fijo_s1_2026-11-20']);
  assert.equal(upserts[0].id, 'fijo_s1_2026-11-14');
});

test('planSerie: serie desactivada borra solo los no editados', () => {
  const { upserts, borrar } = planSerie({ ...serie, activo: false }, [
    { id: 'fijo_s1_2026-11-20', fecha: '2026-11-20' },
    { id: 'fijo_s1_2026-11-27', fecha: '2026-11-27', editadoManual: true },
  ], { hoy });
  assert.deepEqual(upserts, []);
  assert.deepEqual(borrar, ['fijo_s1_2026-11-20']);
});

test('planSerie: no duplica un evento cargado a mano con el mismo título', () => {
  const { upserts } = planSerie(serie, [], { hoy, sueltos: [{ fecha: '2026-11-20', titulo: 'Pintura y vino ' }] });
  assert.ok(!upserts.some(u => u.data.fecha === '2026-11-20'));
  assert.ok(upserts.some(u => u.data.fecha === '2026-11-27'));
});

test('planSerie: un suelto con otro título no bloquea la fecha', () => {
  const { upserts } = planSerie(serie, [], { hoy, sueltos: [{ fecha: '2026-11-13', titulo: 'Noche de vinos y alfajores' }] });
  assert.ok(upserts.some(u => u.data.fecha === '2026-11-13'));
});

import { limpiarSerie } from './eventosFijos.service.js';
test('limpiarSerie: valida título, día y rango', () => {
  assert.throws(() => limpiarSerie({ diaSemana: 5 }), /título/);
  assert.throws(() => limpiarSerie({ titulo: 'X', diaSemana: 7 }), /día/);
  assert.throws(() => limpiarSerie({ titulo: 'X', diaSemana: 5, desde: '2026-12-01', hasta: '2026-11-01' }), /Hasta/);
  const s = limpiarSerie({ titulo: ' Pintura ', diaSemana: '5', desde: '2026-11-01' });
  assert.equal(s.titulo, 'Pintura');
  assert.equal(s.diaSemana, 5);
  assert.equal(s.visible, true);
  assert.equal(s.activo, true);
  assert.deepEqual(limpiarSerie({ horaFin: '03:00' }, { parcial: true }), { horaFin: '03:00' });
});
