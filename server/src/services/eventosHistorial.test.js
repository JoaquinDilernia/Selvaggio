import test from 'node:test';
import assert from 'node:assert/strict';
import { claveEvento, planHistorial, resumenAnteriores, idHistorial } from './eventosHistorial.js';

test('claveEvento: tildes, signos y espacios no importan', () => {
  assert.equal(claveEvento('Cata de vino ´+ Menú de pasos'), claveEvento('Cata de vino - menú de pasos'));
  assert.equal(claveEvento('Astro night'), claveEvento('Astronight'));
});

test('planHistorial: copia la agenda y cancela solo fechas FUTURAS que desaparecieron', () => {
  const hoy = '2026-11-26';
  const existentes = [
    { id: idHistorial('2026-10-28', 'nocheinternacional'), clave: 'nocheinternacional', titulo: 'Noche Internacional', fecha: '2026-10-28', fuente: 'agenda', eventoId: 'borrado-pasado' },
    { id: idHistorial('2026-12-05', 'cancelado'), clave: 'cancelado', titulo: 'Cancelado', fecha: '2026-12-05', fuente: 'agenda', eventoId: 'borrado-futuro' },
  ];
  const { upserts, borrar } = planHistorial({
    eventos: [{ id: 'a1', titulo: 'Astronight', fecha: '2026-11-28', horaInicio: '20:30', horaFin: '22:30' }],
    existentes, hoy,
  });
  assert.deepEqual(upserts.map(u => u.id), ['2026-11-28_astronight']);
  assert.equal(upserts[0].data.horario, '20:30 a 22:30');
  assert.deepEqual(borrar, ['2026-12-05_cancelado']);
});

test('planHistorial: suma fechas pasadas desde reservas "Evento: X" con título conocido', () => {
  const { upserts } = planHistorial({
    eventos: [{ id: 'a1', titulo: 'Astronight', fecha: '2026-11-28' }],
    existentes: [],
    reservas: [
      { fecha: '2026-10-16', comentarios: 'Evento: Astronight Abono 40 mil, faltan 40' },
      { fecha: '2026-10-16', comentarios: 'Por WhatsApp (bot) · Evento: Astronight' },
      { fecha: '2026-10-15', comentarios: 'Evento: Open Bottle' }, // título desconocido
      { fecha: '2026-10-20', comentarios: 'cumple de Juan' },
      { fecha: '2026-12-01', comentarios: 'Evento: Astronight' }, // futura: no
    ],
    hoy: '2026-11-26',
  });
  const desdeReservas = upserts.filter(u => u.data.fuente === 'reservas');
  assert.deepEqual(desdeReservas.map(u => u.id), ['2026-10-16_astronight']);
  assert.equal(desdeReservas[0].data.titulo, 'Astronight');
});

test('resumenAnteriores: agrupa, ordena, frecuencia y excluye lo que tiene próxima fecha', () => {
  const docs = [
    { clave: 'astronight', titulo: 'Astronight', fecha: '2026-10-16', descripcion: 'Astrología y vino', horario: '21:00 a 00:00' },
    { clave: 'vinoyvinilos', titulo: 'Vino y vinilos', fecha: '2026-11-08' },
    { clave: 'vinoyvinilos', titulo: 'Vino y Vinilos', fecha: '2026-11-21' },
    { clave: 'vinoyvinilos', titulo: 'Vino y vinilos', fecha: '2026-10-31' },
    { clave: 'pinturayvino', titulo: 'Pintura y vino', fecha: '2026-11-20' },
    { clave: 'privado', titulo: 'Privado', fecha: '2026-11-01', oculto: true },
    { clave: 'astronight', titulo: 'Astronight', fecha: '2026-11-28' }, // futura
  ];
  const r = resumenAnteriores(docs, { hoy: '2026-11-26', excluirTitulos: ['Pintura y Vino'] });
  assert.deepEqual(r.map(x => x.titulo), ['Vino y Vinilos', 'Astronight']);
  assert.equal(r[0].ultimaFecha, '2026-11-21');
  assert.equal(r[0].dia, 'sábado');
  assert.equal(r[0].vecesQueLoHicimos, 3);
  assert.equal(r[0].frecuencia, 'más o menos cada dos semanas');
  assert.equal(r[1].ultimaFecha, '2026-10-16');
  assert.equal(r[1].descripcion, 'Astrología y vino');
  assert.equal(r[1].frecuencia, undefined);
});
