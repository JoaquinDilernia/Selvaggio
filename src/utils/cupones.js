import {
  doc, getDoc, collection, runTransaction, increment, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export class CuponInvalidoError extends Error {
  constructor(motivo) {
    super(motivo);
    this.name = 'CuponInvalidoError';
    this.motivo = motivo;
  }
}

export const sanitizeEmailCupon = (email) => (email || '').toLowerCase().trim();

const formatARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export async function buscarCupon(codigoRaw) {
  const codigo = (codigoRaw || '').toUpperCase().trim();
  if (!codigo) return null;
  const snap = await getDoc(doc(db, 'selvaggio_cupones', codigo));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function calcularDescuentoCupon(cupon, subtotal) {
  if (!cupon || subtotal <= 0) return 0;
  if (cupon.tipoDescuento === 'porcentaje') {
    return Math.round(subtotal * (cupon.valor || 0) / 100);
  }
  return Math.min(cupon.valor || 0, subtotal);
}

export function validarCupon(cupon, { subtotal, cantidadUsosCliente = 0 }) {
  if (!cupon) return { valido: false, motivo: 'cupón no encontrado' };
  if (!cupon.activo) return { valido: false, motivo: 'este cupón no está activo' };

  const hoy = new Date().toISOString().split('T')[0];
  if (cupon.fechaDesde && hoy < cupon.fechaDesde) {
    return { valido: false, motivo: 'este cupón todavía no está vigente' };
  }
  if (cupon.fechaHasta && hoy > cupon.fechaHasta) {
    return { valido: false, motivo: 'este cupón ya venció' };
  }
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

export async function obtenerUsosCliente(cuponId, email) {
  const emailSanitizado = sanitizeEmailCupon(email);
  if (!cuponId || !emailSanitizado) return 0;
  const snap = await getDoc(doc(db, 'selvaggio_cupones', cuponId, 'usosPorCliente', emailSanitizado));
  return snap.exists() ? (snap.data().cantidad || 0) : 0;
}

export async function canjearCupon({ cuponId, email, subtotal, pedidoData }) {
  const pedidoRef = doc(collection(db, 'selvaggio_takeaway_pedidos'));
  const numeroPedido = 'TW-' + pedidoRef.id.slice(-6).toUpperCase();
  const emailSanitizado = sanitizeEmailCupon(email);

  await runTransaction(db, async (tx) => {
    let cupon = null;
    let cuponRef = null;
    let usosClienteRef = null;

    if (cuponId) {
      cuponRef = doc(db, 'selvaggio_cupones', cuponId);
      const cuponSnap = await tx.get(cuponRef);
      if (!cuponSnap.exists()) throw new CuponInvalidoError('el cupón ya no existe');
      cupon = { id: cuponSnap.id, ...cuponSnap.data() };

      let cantidadUsosCliente = 0;
      if (emailSanitizado) {
        usosClienteRef = doc(db, 'selvaggio_cupones', cuponId, 'usosPorCliente', emailSanitizado);
        const usosSnap = await tx.get(usosClienteRef);
        cantidadUsosCliente = usosSnap.exists() ? (usosSnap.data().cantidad || 0) : 0;
      }

      const { valido, motivo } = validarCupon(cupon, { subtotal, cantidadUsosCliente });
      if (!valido) throw new CuponInvalidoError(motivo);
    }

    tx.set(pedidoRef, { ...pedidoData, numeroPedido });

    if (cupon) {
      const descuentoCupon = pedidoData.descuentoCupon || 0;
      tx.update(cuponRef, {
        usosTotales: increment(1),
        montoDescontadoTotal: increment(descuentoCupon),
        ingresosGenerados: increment(pedidoData.total || 0),
      });
      if (usosClienteRef) {
        tx.set(usosClienteRef, { cantidad: increment(1) }, { merge: true });
      }
      const usoLogRef = doc(collection(db, 'selvaggio_cupones', cuponId, 'usos'));
      tx.set(usoLogRef, {
        email: emailSanitizado,
        nombre: `${pedidoData.nombre || ''}${pedidoData.apellido ? ' ' + pedidoData.apellido : ''}`,
        pedidoId: pedidoRef.id,
        numeroPedido,
        descuentoAplicado: descuentoCupon,
        totalPedido: pedidoData.total || 0,
        fecha: Timestamp.now(),
      });
    }
  });

  return { pedidoRef, numeroPedido };
}
