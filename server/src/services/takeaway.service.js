import admin from 'firebase-admin';
import { getDb } from './firebase.service.js';
import { ahoraAR, isLive } from './reservas.service.js';
import { toWaContactId } from './phone.js';
import { colEscritura } from './testWrites.js';

// Checkout de Take Away del lado del servidor. Hoy la landing calcula precios,
// descuentos y valida el cupón en el navegador y escribe el pedido directo en
// Firestore (cualquiera puede mandar un total inventado). Acá se recalcula
// TODO con el catálogo de Firestore y se crea el pedido en una transacción,
// replicando las reglas de src/TakeAway/TakeAway.jsx y src/utils/cupones.js:
//   - precio de la picada fijo (los ingredientes elegidos no lo cambian)
//   - cupón sobre el subtotal; efectivo 10% sobre lo que queda; envío gratis
//   - retiro: días/horario de takeaway_config, slots de 30', 60' de margen hoy

const COL = {
  pedidos: 'selvaggio_takeaway_pedidos',
  picadas: 'selvaggio_tw_picadas',
  ingredientes: 'selvaggio_tw_ingredientes',
  adicionales: 'selvaggio_tw_adicionales',
  cupones: 'selvaggio_cupones',
  config: 'selvaggio_configuracion',
  sandboxPedidos: 'bot-selvaggio_takeaway_sandbox',
};

export const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta'];
export const DESCUENTO_EFECTIVO = 0.10;
const MAX_UNIDADES = 50;

const err = (status, message) => Object.assign(new Error(message), { status });
const limpiar = (s, max = 300) => String(s ?? '').trim().slice(0, max);

// ── Cupones (misma lógica que src/utils/cupones.js) ──────────────────────

const formatARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export function calcularDescuentoCupon(cupon, subtotal) {
  if (!cupon || subtotal <= 0) return 0;
  if (cupon.tipoDescuento === 'porcentaje') return Math.round(subtotal * (cupon.valor || 0) / 100);
  return Math.min(cupon.valor || 0, subtotal);
}

export function validarCupon(cupon, { subtotal, cantidadUsosCliente = 0, hoy }) {
  if (!cupon) return { valido: false, motivo: 'cupón no encontrado' };
  if (!cupon.activo) return { valido: false, motivo: 'este cupón no está activo' };
  if (cupon.fechaDesde && hoy < cupon.fechaDesde) return { valido: false, motivo: 'este cupón todavía no está vigente' };
  if (cupon.fechaHasta && hoy > cupon.fechaHasta) return { valido: false, motivo: 'este cupón ya venció' };
  if (cupon.montoMinimo && subtotal < cupon.montoMinimo) {
    return { valido: false, motivo: `requiere una compra mínima de ${formatARS(cupon.montoMinimo)}` };
  }
  if (cupon.limiteUsosTotal != null && (cupon.usosTotales || 0) >= cupon.limiteUsosTotal) {
    return { valido: false, motivo: 'este cupón alcanzó el límite de usos' };
  }
  if (cupon.limiteUsosPorCliente != null && cantidadUsosCliente >= cupon.limiteUsosPorCliente) {
    return { valido: false, motivo: 'ya alcanzaste el límite de usos de este cupón' };
  }
  return { valido: true };
}

export const sanitizeEmail = (email) => (email || '').toLowerCase().trim();

// ── Totales ──────────────────────────────────────────────────────────────

export function calcularTotales({ subtotal, cupon, metodoPago }) {
  const descuentoCupon = cupon ? calcularDescuentoCupon(cupon, subtotal) : 0;
  const subtotalPostCupon = subtotal - descuentoCupon;
  const descuentoEfectivo = metodoPago === 'efectivo' ? Math.round(subtotalPostCupon * DESCUENTO_EFECTIVO) : 0;
  return {
    subtotal,
    descuentoCupon,
    descuentoEfectivo,
    descuento: descuentoCupon + descuentoEfectivo,
    total: subtotalPostCupon - descuentoEfectivo,
  };
}

// ── Retiro (hora de Argentina) ───────────────────────────────────────────

const diaSemana = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay();
const aMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Slots HH:MM de retiro para una fecha AAAA-MM-DD. */
export function horasRetiro(fecha, desde, hasta, { now = new Date(), bufferMinutos = 60 } = {}) {
  if (desde == null || hasta == null) return [];
  const hoy = ahoraAR(now);
  const minimo = fecha === hoy.fecha ? aMin(hoy.hora) + bufferMinutos : -1;
  if (fecha < hoy.fecha) return [];
  const slots = [];
  for (let h = desde; h < hasta; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h * 60 + m < minimo) continue;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

/** Valida fecha/hora de retiro contra la config (mismo criterio que el form). */
export function validarRetiro(config, fechaRetiro, horaRetiro, { now = new Date() } = {}) {
  const dias = config?.diasAbiertos;
  // Sin días configurados el form no ofrece fecha: el pedido va sin retiro agendado.
  if (!dias?.length) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaRetiro || '')) throw err(400, 'Elegí una fecha de retiro');
  const hoy = ahoraAR(now).fecha;
  const limite = new Date(`${hoy}T12:00:00Z`); limite.setUTCDate(limite.getUTCDate() + 28);
  if (fechaRetiro < hoy || fechaRetiro > limite.toISOString().slice(0, 10)) throw err(400, 'Fecha de retiro fuera de rango');
  if (!dias.includes(diaSemana(fechaRetiro))) throw err(400, 'Ese día no hay retiros');
  if (!horasRetiro(fechaRetiro, config.horarioDesde, config.horarioHasta, { now }).includes(horaRetiro)) {
    throw err(400, 'Ese horario de retiro ya no está disponible, elegí otro');
  }
}

// ── Ítems: se reconstruyen con el catálogo, el navegador solo elige ──────

/**
 * @param {Array} itemsCliente [{ picadaId, cantidad, selecciones: { [seccionId]: [ingredienteId] } }
 *                             | { adicionalId, cantidad }]
 */
export function armarItems(itemsCliente, { picadas, adicionales, ingredientes }) {
  if (!Array.isArray(itemsCliente) || itemsCliente.length === 0) throw err(400, 'El carrito está vacío');
  if (itemsCliente.length > 30) throw err(400, 'Demasiados ítems en el pedido');

  return itemsCliente.map((it, idx) => {
    const cantidad = parseInt(it?.cantidad, 10);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_UNIDADES) throw err(400, 'Cantidad inválida');

    if (it.adicionalId) {
      const a = adicionales.get(it.adicionalId);
      if (!a || a.disponible === false) throw err(409, 'Un adicional del carrito ya no está disponible');
      return {
        cartId: `adic-${it.adicionalId}`, adicionalId: it.adicionalId, tipo: 'adicional',
        nombre: a.nombre, precio: a.precio, cantidad, subtotal: a.precio * cantidad,
      };
    }

    const p = picadas.get(it.picadaId);
    if (!p || p.disponible === false) throw err(409, 'Una picada del carrito ya no está disponible');
    const selecciones = {};
    for (const s of p.secciones || []) {
      const elegidos = [...new Set(Array.isArray(it.selecciones?.[s.id]) ? it.selecciones[s.id] : [])];
      if (!s.opcional && elegidos.length === 0) throw err(400, `Falta elegir "${s.nombre}" en ${p.nombre}`);
      if (s.limite && elegidos.length > s.limite) throw err(400, `En "${s.nombre}" se pueden elegir hasta ${s.limite}`);
      const items = elegidos.map(id => {
        if (Array.isArray(s.ingredienteIds) && !s.ingredienteIds.includes(id)) throw err(400, `Opción inválida en "${s.nombre}"`);
        const ing = ingredientes.get(id);
        if (!ing) throw err(409, `Una opción de "${s.nombre}" ya no está disponible`);
        return { id, nombre: ing.nombre };
      });
      selecciones[s.id] = { nombre: s.nombre, items };
    }
    return {
      cartId: limpiar(it.cartId, 40) || `item-${idx}`, picadaId: it.picadaId,
      nombre: p.nombre, precio: p.precio, cantidad, selecciones, subtotal: p.precio * cantidad,
    };
  });
}

// ── Lecturas ─────────────────────────────────────────────────────────────

async function cargarCatalogo(db) {
  const [pic, ing, adi, cfg] = await Promise.all([
    db.collection(COL.picadas).get(),
    db.collection(COL.ingredientes).get(),
    db.collection(COL.adicionales).get(),
    db.collection(COL.config).doc('takeaway_config').get(),
  ]);
  const toMap = (snap) => new Map(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
  return { picadas: toMap(pic), ingredientes: toMap(ing), adicionales: toMap(adi), config: cfg.exists ? cfg.data() : { activo: false } };
}

async function usosCliente(db, cuponId, email, tx = null) {
  const e = sanitizeEmail(email);
  if (!cuponId || !e) return { ref: null, cantidad: 0 };
  const ref = db.collection(COL.cupones).doc(cuponId).collection('usosPorCliente').doc(e);
  const snap = tx ? await tx.get(ref) : await ref.get();
  return { ref, cantidad: snap.exists ? (snap.data().cantidad || 0) : 0 };
}

/**
 * Preview del cupón para el checkout (reemplaza buscarCupon/validarCupon
 * del navegador). No devuelve límites ni contadores del cupón.
 */
export async function previewCupon({ codigo, email, items, metodoPago }, { now = new Date() } = {}) {
  const db = getDb();
  const id = limpiar(codigo, 40).toUpperCase();
  if (!id) throw err(400, 'Ingresá un código');
  const [catalogo, cuponSnap] = await Promise.all([cargarCatalogo(db), db.collection(COL.cupones).doc(id).get()]);
  if (!cuponSnap.exists) return { valido: false, motivo: 'Cupón no encontrado' };
  const cupon = { id: cuponSnap.id, ...cuponSnap.data() };
  const subtotal = armarItems(items, catalogo).reduce((a, i) => a + i.subtotal, 0);
  const { cantidad } = await usosCliente(db, cupon.id, email);
  const { valido, motivo } = validarCupon(cupon, { subtotal, cantidadUsosCliente: cantidad, hoy: ahoraAR(now).fecha });
  if (!valido) return { valido: false, motivo: motivo.charAt(0).toUpperCase() + motivo.slice(1) };
  return {
    valido: true,
    cupon: { id: cupon.id, codigo: cupon.codigo ?? cupon.id, tipoDescuento: cupon.tipoDescuento, valor: cupon.valor },
    totales: calcularTotales({ subtotal, cupon, metodoPago }),
  };
}

// ── Alta del pedido ──────────────────────────────────────────────────────

/**
 * @param {object} opts.origen     'web' | 'bot'
 * @param {string} opts.contactId  contacto de WhatsApp (pedidos del bot)
 * Un pedido del bot fuera de BOT_MODE=live va al sandbox: no aparece en
 * Admin/Cocina, no suma usos a cupones reales y no toca selvaggio_clientes.
 */
export async function crearPedidoTakeaway(body, { now = new Date(), origen = 'web', contactId = null } = {}) {
  const db = getDb();
  const sandbox = origen === 'bot' && !isLive();
  const catalogo = await cargarCatalogo(db);
  if (catalogo.config.activo === false) throw err(409, 'El take away no está tomando pedidos en este momento');

  const d = {
    nombre: limpiar(body.nombre, 80), apellido: limpiar(body.apellido, 80),
    email: sanitizeEmail(limpiar(body.email, 120)), telefono: limpiar(body.telefono, 40),
    metodoPago: limpiar(body.metodoPago, 20), comentarios: limpiar(body.comentarios, 500),
    fechaRetiro: limpiar(body.fechaRetiro, 10), horaRetiro: limpiar(body.horaRetiro, 5),
    metodoEnvio: body.metodoEnvio === 'envio' ? 'envio' : 'retiro',
  };
  const errores = [];
  if (!d.nombre) errores.push('falta el nombre');
  if (!d.telefono) errores.push('falta el teléfono');
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errores.push('email inválido');
  if (!METODOS_PAGO.includes(d.metodoPago)) errores.push('medio de pago inválido');
  if (errores.length) throw err(400, errores.join('; '));

  const envio = d.metodoEnvio === 'envio'
    ? {
        localidadEnvio: limpiar(body.localidadEnvio, 80), direccionEnvio: limpiar(body.direccionEnvio, 160),
        pisoDeptoEnvio: limpiar(body.pisoDeptoEnvio, 40), referenciaEnvio: limpiar(body.referenciaEnvio, 200),
      }
    : { localidadEnvio: '', direccionEnvio: '', pisoDeptoEnvio: '', referenciaEnvio: '' };
  if (d.metodoEnvio === 'envio') {
    if (!(catalogo.config.zonasEnvio || []).includes(envio.localidadEnvio)) throw err(400, 'No hacemos envíos a esa localidad');
    if (!envio.direccionEnvio) throw err(400, 'Falta la dirección de envío');
  }

  validarRetiro(catalogo.config, d.fechaRetiro, d.horaRetiro, { now });
  const items = armarItems(body.items, catalogo);
  const subtotal = items.reduce((a, i) => a + i.subtotal, 0);
  const cuponId = limpiar(body.cuponId, 40).toUpperCase() || null;

  const pedidoRef = db.collection(sandbox ? COL.sandboxPedidos : colEscritura(COL.pedidos)).doc();
  const numeroPedido = 'TW-' + pedidoRef.id.slice(-6).toUpperCase();
  let totales;

  await db.runTransaction(async (tx) => {
    let cupon = null; let cuponRef = null; let usos = { ref: null, cantidad: 0 };
    if (cuponId) {
      cuponRef = db.collection(COL.cupones).doc(cuponId);
      const snap = await tx.get(cuponRef);
      if (!snap.exists) throw err(409, 'El cupón ya no existe');
      cupon = { id: snap.id, ...snap.data() };
      usos = await usosCliente(db, cuponId, d.email, tx);
      const { valido, motivo } = validarCupon(cupon, { subtotal, cantidadUsosCliente: usos.cantidad, hoy: ahoraAR(now).fecha });
      if (!valido) throw err(409, `Cupón: ${motivo}`);
    }
    totales = calcularTotales({ subtotal, cupon, metodoPago: d.metodoPago });

    // Mismos campos que escribía la landing (los leen AdminTakeAway y Cocina).
    tx.set(pedidoRef, {
      ...d, ...envio, items, ...totales,
      cuponCodigo: cupon ? (cupon.codigo ?? cupon.id) : '', cuponId: cupon ? cupon.id : '',
      estado: 'pendiente', origen, ...(contactId && { contactId }), numeroPedido, createdAt: new Date(),
    });

    if (cupon && !sandbox) {
      const { FieldValue } = admin.firestore;
      tx.update(cuponRef, {
        usosTotales: FieldValue.increment(1),
        montoDescontadoTotal: FieldValue.increment(totales.descuentoCupon),
        ingresosGenerados: FieldValue.increment(totales.total),
      });
      if (usos.ref) tx.set(usos.ref, { cantidad: FieldValue.increment(1) }, { merge: true });
      tx.set(cuponRef.collection('usos').doc(), {
        email: d.email, nombre: `${d.nombre}${d.apellido ? ' ' + d.apellido : ''}`,
        pedidoId: pedidoRef.id, numeroPedido, descuentoAplicado: totales.descuentoCupon,
        totalPedido: totales.total, fecha: new Date(),
      });
    }
  });

  if (d.email && !sandbox) await upsertClientePedido(db, d).catch(e => console.error('[takeaway] upsert cliente:', e.message));
  return { numeroPedido, items, ...totales, sandbox };
}

async function upsertClientePedido(db, d) {
  const ref = db.collection(colEscritura('selvaggio_clientes')).doc(d.email);
  const nombre = d.nombre + (d.apellido ? ' ' + d.apellido : '');
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const ahora = new Date().toISOString();
    if (snap.exists) {
      tx.set(ref, {
        nombre, telefono: d.telefono || snap.data().telefono || '',
        totalPedidos: (snap.data().totalPedidos || 0) + 1, ultimoPedido: ahora,
      }, { merge: true });
    } else {
      tx.set(ref, { nombre, email: d.email, telefono: d.telefono || '', totalReservas: 0, totalPedidos: 1, ultimoPedido: ahora, creado: ahora });
    }
  });
}

// ── Para el bot ──────────────────────────────────────────────────────────

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Menú compacto (ids + nombres + precios) para que Claude arme el pedido. */
export async function menuTakeaway() {
  const { picadas, ingredientes, adicionales, config } = await cargarCatalogo(getDb());
  const orden = (a, b) => (a.orden || 0) - (b.orden || 0);
  return {
    activo: config.activo !== false,
    dias: (config.diasAbiertos || []).map(d => NOMBRES_DIA[d]),
    horario: config.horarioDesde != null ? `${config.horarioDesde}:00 a ${config.horarioHasta}:00` : null,
    envioGratisA: config.zonasEnvio || [],
    mediosDePago: ['efectivo (10% de descuento)', 'transferencia', 'tarjeta'],
    picadas: [...picadas.values()].filter(p => p.disponible !== false).sort(orden).map(p => ({
      id: p.id, nombre: p.nombre, precio: p.precio, descripcion: p.descripcion || undefined,
      secciones: (p.secciones || []).map(s => ({
        id: s.id, nombre: s.nombre, elegirHasta: s.limite, obligatoria: !s.opcional,
        opciones: (s.ingredienteIds || []).filter(id => ingredientes.has(id)).map(id => ({ id, nombre: ingredientes.get(id).nombre })),
      })),
    })),
    adicionales: [...adicionales.values()].filter(a => a.disponible !== false).sort(orden)
      .map(a => ({ id: a.id, nombre: a.nombre, precio: a.precio })),
  };
}

/** Horarios de retiro disponibles para una fecha (AAAA-MM-DD). */
export async function horariosRetiro(fecha, { now = new Date() } = {}) {
  const { config } = await cargarCatalogo(getDb());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) throw err(400, 'Fecha inválida (formato AAAA-MM-DD)');
  const dias = config.diasAbiertos || [];
  if (dias.length && !dias.includes(new Date(`${fecha}T12:00:00Z`).getUTCDay())) {
    return { fecha, horarios: [], motivo: `ese día no hay retiros (días: ${dias.map(d => NOMBRES_DIA[d]).join(', ')})` };
  }
  return { fecha, horarios: horasRetiro(fecha, config.horarioDesde, config.horarioHasta, { now }) };
}

/** Cotiza sin crear nada: ítems armados con el catálogo + totales (+ cupón). */
export async function cotizarPedido({ items, metodoPago, cuponCodigo, email }, { now = new Date() } = {}) {
  const db = getDb();
  const catalogo = await cargarCatalogo(db);
  const armados = armarItems(items, catalogo);
  const subtotal = armados.reduce((a, i) => a + i.subtotal, 0);
  let cupon = null; let avisoCupon;
  if (cuponCodigo) {
    const snap = await db.collection(COL.cupones).doc(limpiar(cuponCodigo, 40).toUpperCase()).get();
    const c = snap.exists ? { id: snap.id, ...snap.data() } : null;
    const { cantidad } = await usosCliente(db, c?.id, email);
    const v = validarCupon(c, { subtotal, cantidadUsosCliente: cantidad, hoy: ahoraAR(now).fecha });
    if (v.valido) cupon = c; else avisoCupon = `Cupón no aplicado: ${v.motivo}`;
  }
  return {
    items: armados.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, subtotal: i.subtotal,
      elecciones: Object.values(i.selecciones || {}).map(s => `${s.nombre}: ${s.items.map(x => x.nombre).join(', ') || '—'}`) })),
    ...calcularTotales({ subtotal, cupon, metodoPago }),
    ...(cupon && { cuponId: cupon.id }),
    ...(avisoCupon && { avisoCupon }),
  };
}

/** Últimos pedidos de un contacto de WhatsApp (por teléfono normalizado). */
export async function pedidosDelContacto(contactId, { limit = 3 } = {}) {
  const db = getDb();
  const cols = [COL.pedidos, ...(isLive() ? [] : [COL.sandboxPedidos])];
  const snaps = await Promise.all(cols.map(c => db.collection(c).orderBy('createdAt', 'desc').limit(60).get()));
  return snaps.flatMap(s => s.docs.map(d => d.data()))
    .filter(p => p.contactId === contactId || toWaContactId(p.telefono) === contactId)
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
    .slice(0, limit)
    .map(p => ({ numeroPedido: p.numeroPedido, estado: p.estado, total: p.total, fechaRetiro: p.fechaRetiro, horaRetiro: p.horaRetiro, metodoEnvio: p.metodoEnvio }));
}

/** Pedidos creados por el bot (panel). */
export async function listarPedidosBot({ limit = 100 } = {}) {
  const col = isLive() ? COL.pedidos : COL.sandboxPedidos;
  const snap = await getDb().collection(col).where('origen', '==', 'bot').get();
  return {
    sandbox: !isLive(),
    pedidos: snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.().toISOString() ?? null }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, limit),
  };
}
