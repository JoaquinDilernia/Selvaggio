import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularTotales, validarCupon, armarItems, horasRetiro, validarRetiro } from './takeaway.service.js';

const catalogo = {
  picadas: new Map([['p1', {
    id: 'p1', nombre: 'Picada Clásica', precio: 20000,
    secciones: [
      { id: 's1', nombre: 'Quesos', limite: 2, opcional: false, ingredienteIds: ['i1', 'i2', 'i3'] },
      { id: 's2', nombre: 'Extras', limite: 1, opcional: true, ingredienteIds: ['i4'] },
    ],
  }], ['p2', { id: 'p2', nombre: 'Agotada', precio: 1, disponible: false, secciones: [] }]]),
  adicionales: new Map([['a1', { id: 'a1', nombre: 'Pan', precio: 3000 }]]),
  ingredientes: new Map([['i1', { nombre: 'Brie' }], ['i2', { nombre: 'Gouda' }], ['i3', { nombre: 'Azul' }], ['i4', { nombre: 'Miel' }]]),
};

test('totales: cupón sobre subtotal y 10% efectivo sobre lo que queda', () => {
  const t = calcularTotales({ subtotal: 43000, cupon: { tipoDescuento: 'porcentaje', valor: 10 }, metodoPago: 'efectivo' });
  assert.deepEqual(t, { subtotal: 43000, descuentoCupon: 4300, descuentoEfectivo: 3870, descuento: 8170, total: 34830 });
  const fijo = calcularTotales({ subtotal: 5000, cupon: { tipoDescuento: 'monto', valor: 8000 }, metodoPago: 'tarjeta' });
  assert.equal(fijo.total, 0); // el descuento fijo nunca supera el subtotal
});

test('cupón: vigencia, mínimo y límites', () => {
  const base = { activo: true, fechaDesde: '2026-10-01', fechaHasta: '2026-10-31', montoMinimo: 10000, limiteUsosTotal: 5, usosTotales: 4, limiteUsosPorCliente: 1 };
  assert.equal(validarCupon(base, { subtotal: 20000, hoy: '2026-10-03' }).valido, true);
  assert.equal(validarCupon(base, { subtotal: 20000, hoy: '2026-11-01' }).valido, false);
  assert.equal(validarCupon(base, { subtotal: 5000, hoy: '2026-10-03' }).valido, false);
  assert.equal(validarCupon({ ...base, usosTotales: 5 }, { subtotal: 20000, hoy: '2026-10-03' }).valido, false);
  assert.equal(validarCupon(base, { subtotal: 20000, cantidadUsosCliente: 1, hoy: '2026-10-03' }).valido, false);
  assert.equal(validarCupon({ ...base, activo: false }, { subtotal: 20000, hoy: '2026-10-03' }).valido, false);
});

test('ítems: el precio sale del catálogo, no del navegador', () => {
  const items = armarItems([
    { picadaId: 'p1', cantidad: 2, precio: 1, selecciones: { s1: ['i1', 'i2'] } },
    { adicionalId: 'a1', cantidad: 1, precio: 1 },
  ], catalogo);
  assert.equal(items[0].precio, 20000);
  assert.equal(items[0].subtotal, 40000);
  assert.deepEqual(items[0].selecciones.s1.items.map(i => i.nombre), ['Brie', 'Gouda']);
  assert.equal(items[1].subtotal, 3000);
});

test('ítems: secciones obligatorias, límites, opciones ajenas y picadas no disponibles', () => {
  assert.throws(() => armarItems([{ picadaId: 'p1', cantidad: 1, selecciones: {} }], catalogo), /Falta elegir/);
  assert.throws(() => armarItems([{ picadaId: 'p1', cantidad: 1, selecciones: { s1: ['i1', 'i2', 'i3'] } }], catalogo), /hasta 2/);
  assert.throws(() => armarItems([{ picadaId: 'p1', cantidad: 1, selecciones: { s1: ['i4'] } }], catalogo), /Opción inválida/);
  assert.throws(() => armarItems([{ picadaId: 'p2', cantidad: 1 }], catalogo), /no está disponible/);
  assert.throws(() => armarItems([{ adicionalId: 'a1', cantidad: 0 }], catalogo), /Cantidad/);
  assert.throws(() => armarItems([], catalogo), /vacío/);
});

test('retiro: slots de 30 minutos con 60 de margen si es hoy (hora AR)', () => {
  // 2026-10-03 19:10 en Argentina = 22:10 UTC
  const now = new Date('2026-10-03T22:10:00Z');
  assert.deepEqual(horasRetiro('2026-10-03', 18, 23, { now }), ['20:30', '21:00', '21:30', '22:00', '22:30']);
  assert.equal(horasRetiro('2026-10-04', 18, 23, { now }).length, 10);
  const config = { diasAbiertos: [0, 2, 3, 4, 5, 6], horarioDesde: 18, horarioHasta: 23 };
  assert.doesNotThrow(() => validarRetiro(config, '2026-10-04', '18:00', { now }));
  assert.throws(() => validarRetiro(config, '2026-10-05', '18:00', { now }), /no hay retiros/); // lunes
  assert.throws(() => validarRetiro(config, '2026-10-03', '19:30', { now }), /ya no está disponible/);
  assert.doesNotThrow(() => validarRetiro({ diasAbiertos: [] }, '', '', { now })); // sin agenda
});
