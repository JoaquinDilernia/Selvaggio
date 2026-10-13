import crypto from 'crypto';
import { getDb } from './firebase.service.js';
import { toWaContactId } from './phone.js';
import { sendWhatsAppTemplate, fetchMetaTemplateStatuses } from './meta.service.js';
import { getOrCreateConversation, appendMessage, updateMessageStatus } from './conversation.service.js';
import { createTemplate } from './template.service.js';

// Aviso "pedido listo" de Caja → Cocina. Antes Cocina abría wa.me y alguien
// apretaba enviar desde su WhatsApp; ahora lo manda el número del bot con una
// plantilla aprobada (el cliente de caja nunca le escribió al bot, así que
// fuera de la ventana de 24 h solo se le puede escribir con plantilla).
// Mismo texto que el mensaje de wa.me que se usaba antes.

const COL_PEDIDOS = 'selvaggio_pedidos';

export const PLANTILLA_PEDIDO_LISTO = {
  name: 'selvaggio_pedido_listo',
  displayName: 'Pedido listo (Cocina)',
  language: 'es_AR',
  category: 'UTILITY',
  bodyText: 'Hola {{1}}! Tu pedido #{{2}} está listo para retirar. Te esperamos! 🍷 - Selvaggio',
  params: ['nombre', 'numeroPedido'],
};

// Al arrancar el server: si la plantilla no está en Meta (primera vez, o se
// recreó el WABA), la manda a aprobar. Sin credenciales de Meta no hace nada.
export async function asegurarPlantillaPedidoListo() {
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID) return;
  const { name } = PLANTILLA_PEDIDO_LISTO;
  const enMeta = await fetchMetaTemplateStatuses();
  const actual = enMeta.find(t => t.name === name);
  if (actual) {
    console.log(`[comandas] Plantilla ${name}: ${actual.status}`);
    return;
  }
  // Una copia local sin plantilla en Meta quedaría huérfana: se reemplaza.
  const db = getDb();
  const viejas = await db.collection('bot-selvaggio_whatsapp_templates').where('name', '==', name).get();
  await Promise.all(viejas.docs.map(d => d.ref.delete()));
  const t = await createTemplate(PLANTILLA_PEDIDO_LISTO);
  console.log(`[comandas] Plantilla ${name} enviada a Meta: ${t.metaStatus}${t.metaSubmitError ? ` — ${t.metaSubmitError}` : ''}`);
}

const err = (status, message) => Object.assign(new Error(message), { status });

// Teléfono de caja → celular argentino canónico (549 + área + abonado = 13
// dígitos). Devuelve null si no es un celular argentino válido: WhatsApp no
// entrega a fijos y un número de otro largo seguro está mal tipeado.
export function telefonoComanda(raw) {
  const valido = (t) => (t && /^549\d{10}$/.test(t) ? t : null);
  // En caja se anota a veces "11 15 5566 7788" (área + 15 + abonado, 12
  // dígitos): toWaContactId no lo reconoce como argentino sin el 0 adelante.
  const d = String(raw ?? '').replace(/\D/g, '');
  return valido(toWaContactId(raw)) ?? (d.length === 12 ? valido(toWaContactId(`0${d}`)) : null);
}

// Variables de la plantilla: {{1}} nombre (solo el primero, como en un
// saludo), {{2}} número de pedido. Meta rechaza parámetros vacíos.
export function paramsPedidoListo(pedido) {
  const nombre = String(pedido.nombre ?? '').trim().split(/\s+/)[0] || 'cliente';
  const numero = String(pedido.numeroPedido ?? '').trim().replace(/^#/, '') || '-';
  return [nombre, numero];
}

export async function avisarPedidoListo(pedidoId, { sentBy = null } = {}) {
  const db = getDb();
  const ref = db.collection(COL_PEDIDOS).doc(pedidoId);
  const snap = await ref.get();
  if (!snap.exists) throw err(404, 'Pedido no encontrado');
  const pedido = snap.data();

  const telefono = telefonoComanda(pedido.telefono);
  if (!telefono) {
    const error = `Teléfono inválido: "${pedido.telefono ?? ''}". Tiene que ser un celular con código de área, ej. 1155667788`;
    await ref.update({ avisoWhatsapp: { estado: 'error', error, en: new Date() } });
    throw err(400, error);
  }

  const params = paramsPedidoListo(pedido);
  const { name, language } = PLANTILLA_PEDIDO_LISTO;

  // Queda registrado en el chat del cliente en el panel, como cualquier envío.
  await getOrCreateConversation(telefono, 'whatsapp', pedido.nombre?.trim() || null);
  const msgId = crypto.randomUUID();
  await appendMessage(telefono, {
    role: 'admin', content: `[Plantilla: ${name}] ${params.join(' | ')}`, msgId, msgStatus: 'sending', sentBy,
  });

  let waMsgId = null;
  let sendError = null;
  try {
    waMsgId = await sendWhatsAppTemplate(telefono, name, language, params);
    if (!waMsgId) sendError = 'WhatsApp no está configurado en el servidor';
  } catch (e) {
    const meta = e.response?.data?.error;
    sendError = meta ? `Meta error ${meta.code ?? ''}: ${meta.message}` : e.message;
    console.error('[comandas] Error enviando aviso:', sendError);
  }

  await updateMessageStatus(telefono, msgId, sendError ? 'error' : 'sent', waMsgId).catch(() => {});
  await ref.update({
    avisoWhatsapp: sendError
      ? { estado: 'error', error: sendError, telefono, en: new Date() }
      : { estado: 'enviado', telefono, waMsgId, en: new Date() },
  });

  if (sendError) throw err(502, `No se pudo mandar el WhatsApp: ${sendError}`);
  return { ok: true, telefono };
}
