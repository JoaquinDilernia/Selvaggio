import crypto from 'crypto';
import axios from 'axios';
import { getDb } from './firebase.service.js';
import { sendWhatsAppTemplate, fetchMetaTemplateStatuses } from './meta.service.js';
import { getOrCreateConversation, appendMessage, updateMessageStatus } from './conversation.service.js';
import { telefonoComanda } from './comandas.service.js';
import { esDelContacto } from './reservasCambios.service.js';
import { COL, NOMBRES_DIA, ahoraAR, diaSemana, personasDe, isLive } from './reservas.service.js';

// Confirmación automática de las reservas del día. Antes la mandaba el equipo
// a mano con la plantilla "confreserva" (sin datos de la reserva, cada uno a
// la hora que podía). Ahora a las 18:00 sale sola a cada reserva de mesa de
// esa noche, con todos los datos y tres botones: Confirmo / Quiero
// modificarla / Cancelar reserva. "Confirmo" queda anotado en la reserva (lo
// ve el admin de la web en comentarios); modificar y cancelar los resuelve el
// bot en el mismo chat con modificar_reserva / cancelar_reserva.
//
// Cada reserva guarda `confirmacionWhatsapp` ({ estado, respuesta, ... }):
// con ese campo puesto no se vuelve a mandar, aunque el server se reinicie.

export const PLANTILLA_CONFIRMACION = {
  name: 'selvaggio_confirmacion_reserva',
  displayName: 'Confirmación de reserva (automática 18 h)',
  language: 'es_AR',
  category: 'UTILITY',
  bodyText:
    'Hola {{1}}! Te escribimos de Selvaggio para recordarte tu reserva de hoy:\n\n'
    + '📅 {{2}}\n🕗 {{3}} hs\n👥 {{4}}\n📍 {{5}}\n\n'
    + '¿Nos confirmás que venís? Si necesitás cambiar algo o cancelar, tocá un botón o respondé este mensaje y lo resolvemos por acá.',
  params: ['nombre', 'fecha', 'horario', 'personas', 'ubicacion'],
  ejemplo: ['Martina', 'sábado 31/10', '21:00', '2 personas', 'Living'],
  botones: ['Confirmo', 'Quiero modificarla', 'Cancelar reserva'],
};

// Payload de cada botón (va en el mismo orden que PLANTILLA_CONFIRMACION.botones).
export const ACCIONES = ['confirmar', 'modificar', 'cancelar'];
const PREFIJO = 'confres';

export const HORA_ENVIO = '18:00';
const HORA_LIMITE = '21:00';           // si el server estuvo caído, después de esto ya no se manda
const INTERVALO_MS = 5 * 60 * 1000;

const META_API_URL = 'https://graph.facebook.com/v20.0';
const COL_TEMPLATES = 'bot-selvaggio_whatsapp_templates';

// ─── Plantilla ───────────────────────────────────────────────────────────────

/** Al arrancar: si la plantilla no está en Meta, la manda a aprobar (con botones). */
export async function asegurarPlantillaConfirmacion() {
  const { META_ACCESS_TOKEN: token, META_WHATSAPP_BUSINESS_ACCOUNT_ID: waba } = process.env;
  if (!token || !waba) return;
  const t = PLANTILLA_CONFIRMACION;
  const actual = (await fetchMetaTemplateStatuses()).find(x => x.name === t.name);
  if (actual) {
    console.log(`[confirmaciones] Plantilla ${t.name}: ${actual.status}`);
    return;
  }
  let metaStatus = 'PENDING';
  let metaSubmitError = null;
  try {
    const { data } = await axios.post(`${META_API_URL}/${waba}/message_templates`, {
      name: t.name,
      language: t.language,
      category: t.category,
      components: [
        { type: 'BODY', text: t.bodyText, example: { body_text: [t.ejemplo] } },
        { type: 'BUTTONS', buttons: t.botones.map(text => ({ type: 'QUICK_REPLY', text })) },
      ],
    }, { headers: { Authorization: `Bearer ${token}` } });
    metaStatus = data.status ?? 'PENDING';
  } catch (e) {
    metaSubmitError = e.response?.data?.error?.error_user_msg ?? e.response?.data?.error?.message ?? e.message;
  }
  const db = getDb();
  const viejas = await db.collection(COL_TEMPLATES).where('name', '==', t.name).get();
  await Promise.all(viejas.docs.map(d => d.ref.delete()));
  await db.collection(COL_TEMPLATES).add({
    name: t.name, displayName: t.displayName, bodyText: t.bodyText, language: t.language,
    category: t.category, params: t.params, botones: t.botones,
    metaStatus, metaSubmitError, createdAt: new Date(),
  });
  console.log(`[confirmaciones] Plantilla ${t.name} enviada a Meta: ${metaStatus}${metaSubmitError ? ` — ${metaSubmitError}` : ''}`);
}

// ─── Armado del mensaje ──────────────────────────────────────────────────────

const ddmm = (fecha) => `${+fecha.slice(8, 10)}/${+fecha.slice(5, 7)}`;
// Meta rechaza parámetros vacíos o con saltos de línea.
const limpio = (s, def) => String(s ?? '').replace(/\s+/g, ' ').trim() || def;

export function paramsConfirmacion(r) {
  const n = personasDe(r);
  return [
    limpio(String(r.nombre ?? '').trim().split(/\s+/)[0], 'cliente'),
    `${NOMBRES_DIA[diaSemana(r.fecha)]} ${ddmm(r.fecha)}`,
    limpio(r.horario, '-'),
    `${n} ${n === 1 ? 'persona' : 'personas'}`,
    r.evento ? limpio(`Evento: ${r.evento}`, '-') : limpio(r.preferencia, 'Sin preferencia de ubicación'),
  ];
}

/** El texto tal cual lo recibe el cliente (se guarda en el chat; el bot lo lee como contexto). */
export function textoConfirmacion(params) {
  return PLANTILLA_CONFIRMACION.bodyText.replace(/\{\{(\d)\}\}/g, (_, i) => params[+i - 1] ?? '');
}

export const payloadBoton = (accion, reservaId) => `${PREFIJO}:${accion}:${reservaId}`;

/** 'confres:modificar:abc123' → { accion: 'modificar', reservaId: 'abc123' } */
export function parsePayload(payload) {
  const m = String(payload ?? '').match(/^confres:(confirmar|modificar|cancelar):(.+)$/);
  return m ? { accion: m[1], reservaId: m[2] } : null;
}

const aMs = (v) => (v?.toMillis ? v.toMillis() : v ? new Date(v).getTime() : NaN);

/**
 * Reservas de hoy a las que hay que mandarles la confirmación: de la noche
 * (desde las 18:00, o pasada la medianoche), que todavía no pasaron y que ya
 * existían a la hora del envío (a quien reserva a las 19:30 para las 21:00 no
 * se le pide que confirme lo que acaba de reservar).
 */
export function pendientesDeConfirmar(reservas, now = new Date()) {
  const hoy = ahoraAR(now);
  const corte = new Date(`${hoy.fecha}T${HORA_ENVIO}:00-03:00`).getTime();
  return reservas.filter(r =>
    r.fecha === hoy.fecha
    && !r.confirmacionWhatsapp
    && !r.archivada
    && r.estado !== 'cancelada'
    && (r.horario >= HORA_ENVIO || r.horario < '06:00')
    && (r.horario < '06:00' || r.horario > hoy.hora)
    && !(aMs(r.createdAt) >= corte),
  );
}

// ─── Envío ───────────────────────────────────────────────────────────────────

async function plantillaAprobada() {
  const t = (await fetchMetaTemplateStatuses()).find(x => x.name === PLANTILLA_CONFIRMACION.name);
  return t?.status === 'APPROVED';
}

async function configActiva() {
  const snap = await getDb().collection('bot-selvaggio_config').doc('bot_config').get().catch(() => null);
  return snap?.data()?.confirmacionReservas?.activo !== false;
}

async function enviarUna(ref, r) {
  const db = getDb();
  const telefono = r.contactId || telefonoComanda(r.telefono);

  // Se "toma" la reserva antes de mandar: si dos corridas se pisan, sale una sola.
  const tomada = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data().confirmacionWhatsapp) return false;
    tx.update(ref, {
      confirmacionWhatsapp: telefono
        ? { estado: 'enviando', telefono, en: new Date().toISOString() }
        : { estado: 'sin_telefono', telefono: r.telefono ?? null, en: new Date().toISOString() },
    });
    return true;
  });
  if (!tomada || !telefono) return tomada && !telefono ? 'sin_telefono' : 'omitida';

  const { name, language, botones } = PLANTILLA_CONFIRMACION;
  const params = paramsConfirmacion(r);
  const nombre = [r.nombre, r.apellido].filter(Boolean).join(' ').trim() || null;
  await getOrCreateConversation(telefono, 'whatsapp', nombre);
  const msgId = crypto.randomUUID();
  await appendMessage(telefono, {
    role: 'admin',
    content: `[Plantilla: ${name}] ${textoConfirmacion(params)}`,
    msgId, msgStatus: 'sending', sentBy: 'Confirmación automática', reservaId: ref.id,
  });

  let waMsgId = null;
  let error = null;
  try {
    waMsgId = await sendWhatsAppTemplate(telefono, name, language, params, {
      botones: botones.map((_, i) => payloadBoton(ACCIONES[i], ref.id)),
    });
    if (!waMsgId) error = 'WhatsApp no está configurado en el servidor';
  } catch (e) {
    const meta = e.response?.data?.error;
    error = meta ? `Meta error ${meta.code ?? ''}: ${meta.message}` : e.message;
  }
  await updateMessageStatus(telefono, msgId, error ? 'error' : 'sent', waMsgId).catch(() => {});
  await ref.update({
    confirmacionWhatsapp: error
      ? { estado: 'error', telefono, error, en: new Date().toISOString() }
      : { estado: 'enviada', telefono, waMsgId, en: new Date().toISOString() },
  });
  if (error) console.error(`[confirmaciones] ${ref.id} → ${telefono}: ${error}`);
  return error ? 'error' : 'enviada';
}

let avisoSinAprobar = null;

/** Manda las confirmaciones de hoy si es la hora. Devuelve el conteo por resultado. */
export async function enviarConfirmacionesDelDia({ now = new Date(), forzar = false } = {}) {
  const hoy = ahoraAR(now);
  if (!forzar && (hoy.hora < HORA_ENVIO || hoy.hora >= HORA_LIMITE)) return null;
  if (!(await configActiva())) return null;

  const db = getDb();
  const snap = await db.collection(COL.mesas).where('fecha', '==', hoy.fecha).get();
  const docs = new Map(snap.docs.map(d => [d.id, d]));
  const pendientes = pendientesDeConfirmar(snap.docs.map(d => ({ id: d.id, ...d.data() })), now);
  if (!pendientes.length) return {};

  if (!(await plantillaAprobada())) {
    if (avisoSinAprobar !== hoy.fecha) {
      console.warn(`[confirmaciones] ${pendientes.length} reserva(s) sin confirmar: la plantilla todavía no está aprobada por Meta`);
      avisoSinAprobar = hoy.fecha;
    }
    return { sin_plantilla: pendientes.length };
  }

  // Un solo mensaje por teléfono y por día: hay reservas duplicadas (misma
  // persona, mismo horario) y a quien ya se le mandó hoy no se le repite.
  const telDe = (r) => r.contactId || telefonoComanda(r.telefono);
  const yaAvisados = new Set(snap.docs.map(d => d.data().confirmacionWhatsapp?.telefono).filter(Boolean));

  const conteo = {};
  for (const r of pendientes) {
    const tel = telDe(r);
    if (tel && yaAvisados.has(tel)) {
      await docs.get(r.id).ref.update({ confirmacionWhatsapp: { estado: 'duplicada', telefono: tel, en: new Date().toISOString() } });
      conteo.duplicada = (conteo.duplicada ?? 0) + 1;
      continue;
    }
    if (tel) yaAvisados.add(tel);
    const res = await enviarUna(docs.get(r.id).ref, r).catch(e => {
      console.error(`[confirmaciones] ${r.id}:`, e.message);
      return 'error';
    });
    conteo[res] = (conteo[res] ?? 0) + 1;
  }
  console.log(`[confirmaciones] ${hoy.fecha}:`, JSON.stringify(conteo));
  return conteo;
}

export function iniciarConfirmacionReservas() {
  // Solo con el bot en vivo: en sandbox o en pruebas locales no se le escribe a clientes reales.
  if (!isLive() || process.env.SELVAGGIO_TEST_WRITES === '1') return;
  asegurarPlantillaConfirmacion().catch(e => console.error('[confirmaciones] plantilla:', e.message));
  const correr = () => enviarConfirmacionesDelDia().catch(e => console.error('[confirmaciones]', e.message));
  setTimeout(correr, 30_000);
  setInterval(correr, INTERVALO_MS).unref();
}

// ─── Respuesta del cliente ───────────────────────────────────────────────────

const RESPUESTA_TEXTO = { confirmar: 'confirmó', modificar: 'pidió modificarla', cancelar: 'pidió cancelarla' };

/**
 * Anota en la reserva qué botón tocó el cliente. "Confirmo" además va a los
 * comentarios, que es lo que ve el equipo en el admin de la web.
 * @returns la reserva (o null si ya no existe o no es de este contacto)
 */
export async function registrarRespuesta({ accion, reservaId }, contactId, { now = new Date() } = {}) {
  const ref = getDb().collection(COL.mesas).doc(reservaId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const r = snap.data();
  if (!esDelContacto(r, contactId) && r.confirmacionWhatsapp?.telefono !== contactId) return null;
  const { hora } = ahoraAR(now);
  const patch = {
    'confirmacionWhatsapp.respuesta': accion,
    'confirmacionWhatsapp.respondidaAt': now.toISOString(),
  };
  if (accion === 'confirmar' && r.confirmacionWhatsapp?.respuesta !== 'confirmar') {
    patch.comentarios = [r.comentarios, `✔ Confirmó por WhatsApp ${hora}`].filter(Boolean).join(' · ').slice(-900);
  }
  await ref.update(patch);
  console.log(`[confirmaciones] ${contactId} ${RESPUESTA_TEXTO[accion]} la reserva ${reservaId}`);
  return { id: reservaId, ...r };
}

/** Respuesta fija a "Confirmo" (no hace falta pasar por Claude). */
export function respuestaConfirmo(r) {
  const nombre = String(r?.nombre ?? '').trim().split(/\s+/)[0];
  return `¡Genial${nombre ? `, ${nombre}` : ''}! Te esperamos hoy${r?.horario ? ` a las ${r.horario}` : ''} 🍷`;
}

/** Contexto para Claude cuando el cliente toca "modificar" o "cancelar". */
export function contextoParaBot({ accion, reservaId }, r) {
  const datos = r
    ? `${NOMBRES_DIA[diaSemana(r.fecha)]} ${ddmm(r.fecha)} a las ${r.horario}, ${personasDe(r)} pers.${r.evento ? `, evento ${r.evento}` : r.preferencia ? `, ${r.preferencia}` : ''}`
    : 'ya no figura en la agenda';
  return accion === 'cancelar'
    ? `[El cliente tocó "Cancelar reserva" en el recordatorio de su reserva de hoy (id ${reservaId}: ${datos}). Confirmá con él que quiere cancelarla y, si dice que sí, usá cancelar_reserva con ese id.]`
    : `[El cliente tocó "Quiero modificarla" en el recordatorio de su reserva de hoy (id ${reservaId}: ${datos}). Preguntale qué quiere cambiar (horario, personas, ubicación o día) y usá modificar_reserva con ese id.]`;
}
