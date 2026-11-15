import {
  disponibilidadMesas, crearReservaMesa, cavaOcupada, ahoraAR, agenda, crearReservaEvento, crearReservaCavaBot, HORARIOS_CAVA,
  PREFERENCIAS, normalizarConfigReservas,
} from './reservas.service.js';
import { describirHorario } from './horario.js';
import { guardarCumple } from './cumpleanos.service.js';
import { reservasDelContacto, modificarReservaMesa, cancelarReservaMesa } from './reservasCambios.service.js';
import { menuTakeaway, horariosRetiro, cotizarPedido, crearPedidoTakeaway, pedidosDelContacto } from './takeaway.service.js';
import { toWaContactId } from './phone.js';
import { guardarTelefonoContacto } from './customer.service.js';

// Tools que Claude puede llamar durante una conversación. Por WhatsApp el
// teléfono de la reserva sale del contacto (no se le pide al cliente ni se
// acepta del modelo). Por Instagram no hay teléfono: el bot se lo pide al
// cliente y lo pasa en `telefono` (ver toolsParaCanal), y la reserva queda a
// nombre de ese número igual que si hubiera escrito por WhatsApp (le llega la
// confirmación de las 18 h, la ve con mis_reservas desde WhatsApp, etc.).

export const RESERVAS_TOOLS = [
  {
    name: 'guardar_cumpleanos',
    description: 'Guarda el cumpleaños del cliente en su ficha (para mandarle la promo de cumpleaños), o registra que prefirió no darlo.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Lo que dijo el cliente normalizado: DD/MM o DD/MM/AAAA (el año es opcional).' },
        noQuiere: { type: 'boolean', description: 'true si prefiere no darlo.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'consultar_agenda',
    description:
      'Horario habitual de apertura, días especiales del calendario (cerrado o con horario especial, feriados, etc.) y eventos publicados. ' +
      'Usala SIEMPRE que pregunten a qué hora abren, si abren tal día, por feriados o por eventos/actividades. No supongas horarios.',
    input_schema: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'AAAA-MM-DD (por defecto hoy)' },
        hasta: { type: 'string', description: 'AAAA-MM-DD (por defecto 45 días después; máximo 90)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'consultar_disponibilidad_mesas',
    description:
      'Devuelve si el salón abre en una fecha y qué horarios tienen lugar para reservar mesa (lugares = personas que todavía entran). ' +
      'Usala SIEMPRE antes de ofrecer horarios o confirmar una reserva; no supongas disponibilidad.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha en formato AAAA-MM-DD (hora de Argentina).' },
        personas: { type: 'integer', minimum: 1, description: 'Cantidad de personas, si ya la sabés: marca disponible solo los horarios donde entran.' },
      },
      required: ['fecha'],
      additionalProperties: false,
    },
  },
  {
    name: 'crear_reserva_mesa',
    description:
      'Registra una reserva de mesa. Queda CONFIRMADA al instante (igual que en la web). ' +
      'Llamala solo cuando el cliente confirmó explícitamente todos los datos. ' +
      'No se usa para grupos de La Cava (ver el mínimo en las instrucciones de RESERVAS).',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Nombre de quien reserva.' },
        apellido: { type: 'string' },
        email: { type: 'string', description: 'Opcional. Solo si el cliente lo dio.' },
        cantidadPersonas: { type: 'integer', minimum: 1 },
        fecha: { type: 'string', description: 'AAAA-MM-DD' },
        horario: { type: 'string', description: 'HH:MM, uno de los que devolvió consultar_disponibilidad_mesas.' },
        preferencia: { type: 'string', enum: PREFERENCIAS, description: 'Ubicación preferida.' },
        restricciones: { type: 'string', description: 'Alergias o restricciones alimentarias, si las hay.' },
        comentarios: { type: 'string' },
      },
      required: ['nombre', 'cantidadPersonas', 'fecha', 'horario', 'preferencia'],
      additionalProperties: false,
    },
  },
  {
    name: 'mis_reservas',
    description:
      'Próximas reservas de mesa (y de eventos) a nombre del número de este chat, con su id. ' +
      'Usala SIEMPRE antes de modificar o cancelar, o si el cliente pregunta por su reserva.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'modificar_reserva',
    description:
      'Cambia día, horario, cantidad de personas, ubicación o restricciones de una reserva del cliente (id de mis_reservas). ' +
      'Chequea el cupo sola. Pasá SOLO los campos que cambian. Llamala recién cuando el cliente confirmó el cambio.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        fecha: { type: 'string', description: 'AAAA-MM-DD' },
        horario: { type: 'string', description: 'HH:MM, uno de los que devolvió consultar_disponibilidad_mesas.' },
        cantidadPersonas: { type: 'integer', minimum: 1 },
        preferencia: { type: 'string', enum: PREFERENCIAS },
        restricciones: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'cancelar_reserva',
    description: 'Cancela una reserva del cliente (id de mis_reservas) y libera el lugar. Llamala recién cuando el cliente confirmó que quiere cancelar.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        motivo: { type: 'string', description: 'Si lo dijo (ej. "se enfermó"). Opcional.' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'reservar_evento',
    description:
      'Reserva lugar para un evento publicado en la agenda (el id sale de consultar_agenda). Queda CONFIRMADA al instante. ' +
      'Llamala solo cuando el cliente confirmó nombre y cantidad de personas. No la uses si el evento trae "link" (ahí se sacan entradas por el link).',
    input_schema: {
      type: 'object',
      properties: {
        eventoId: { type: 'string', description: 'id del evento devuelto por consultar_agenda.' },
        nombre: { type: 'string' },
        apellido: { type: 'string' },
        cantidadPersonas: { type: 'integer', minimum: 1, maximum: 60 },
        restricciones: { type: 'string', description: 'Alergias o restricciones alimentarias, si las hay.' },
        comentarios: { type: 'string' },
      },
      required: ['eventoId', 'nombre', 'cantidadPersonas'],
      additionalProperties: false,
    },
  },
  {
    name: 'consultar_fechas_cava',
    description:
      'Devuelve qué días de un rango ya están reservados en La Cava (un evento por día). ' +
      'Usala cuando pregunten por eventos, cumpleaños o grupos grandes.',
    input_schema: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'AAAA-MM-DD' },
        hasta: { type: 'string', description: 'AAAA-MM-DD (máximo 62 días después de desde)' },
      },
      required: ['desde', 'hasta'],
      additionalProperties: false,
    },
  },
  {
    name: 'reservar_cava',
    description:
      'Reserva La Cava (evento privado, uno por día) para el cliente. Antes chequeá la fecha con consultar_fechas_cava. ' +
      'Llamala solo cuando el cliente confirmó nombre, cantidad de personas, fecha y horario. Queda tomada con la seña pendiente.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        cantidadPersonas: { type: 'integer', minimum: 1 },
        fecha: { type: 'string', description: 'AAAA-MM-DD' },
        horario: { type: 'string', enum: HORARIOS_CAVA, description: 'Hora de llegada.' },
        traeTorta: { type: 'boolean', description: 'Si traen torta (cumpleaños).' },
        email: { type: 'string', description: 'Opcional.' },
        comentarios: { type: 'string', description: 'Motivo (cumpleaños, empresa…), alergias u otros pedidos.' },
      },
      required: ['nombre', 'cantidadPersonas', 'fecha', 'horario'],
      additionalProperties: false,
    },
  },
  {
    name: 'ver_menu_takeaway',
    description: 'Menú de Take Away: picadas (con sus secciones y opciones para elegir), adicionales, precios, días/horario de retiro, zonas de envío gratis y medios de pago. Usala antes de ofrecer o armar un pedido.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'horarios_retiro_takeaway',
    description: 'Horarios disponibles para retirar (o recibir) un pedido de Take Away en una fecha.',
    input_schema: {
      type: 'object',
      properties: { fecha: { type: 'string', description: 'AAAA-MM-DD' } },
      required: ['fecha'],
      additionalProperties: false,
    },
  },
  {
    name: 'cotizar_pedido_takeaway',
    description: 'Calcula el total de un pedido SIN crearlo (precios del catálogo, cupón y 10% por efectivo). Usala para mostrarle el resumen al cliente antes de confirmar.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Ítems con los ids de ver_menu_takeaway. Picada: { picadaId, cantidad, selecciones: { <seccionId>: [<opcionId>, ...] } }. Adicional: { adicionalId, cantidad }.',
          items: {
            type: 'object',
            properties: {
              picadaId: { type: 'string' },
              adicionalId: { type: 'string' },
              cantidad: { type: 'integer', minimum: 1 },
              selecciones: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
            },
            required: ['cantidad'],
          },
        },
        metodoPago: { type: 'string', enum: ['efectivo', 'transferencia', 'tarjeta'] },
        cuponCodigo: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['items', 'metodoPago'],
      additionalProperties: false,
    },
  },
  {
    name: 'crear_pedido_takeaway',
    description: 'Crea el pedido de Take Away. Llamala solo después de mostrar el resumen de cotizar_pedido_takeaway y que el cliente confirme explícitamente.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        apellido: { type: 'string' },
        email: { type: 'string', description: 'Opcional.' },
        items: {
          type: 'array',
          description: 'Ítems con los ids de ver_menu_takeaway. Picada: { picadaId, cantidad, selecciones: { <seccionId>: [<opcionId>, ...] } }. Adicional: { adicionalId, cantidad }.',
          items: {
            type: 'object',
            properties: {
              picadaId: { type: 'string' },
              adicionalId: { type: 'string' },
              cantidad: { type: 'integer', minimum: 1 },
              selecciones: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
            },
            required: ['cantidad'],
          },
        },
        metodoPago: { type: 'string', enum: ['efectivo', 'transferencia', 'tarjeta'] },
        fechaRetiro: { type: 'string', description: 'AAAA-MM-DD' },
        horaRetiro: { type: 'string', description: 'HH:MM, de horarios_retiro_takeaway' },
        metodoEnvio: { type: 'string', enum: ['retiro', 'envio'] },
        localidadEnvio: { type: 'string', description: 'Solo si es envío: una de envioGratisA.' },
        direccionEnvio: { type: 'string' },
        pisoDeptoEnvio: { type: 'string' },
        referenciaEnvio: { type: 'string' },
        cuponCodigo: { type: 'string' },
        comentarios: { type: 'string' },
      },
      required: ['nombre', 'items', 'metodoPago', 'fechaRetiro', 'horaRetiro', 'metodoEnvio'],
      additionalProperties: false,
    },
  },
  {
    name: 'mis_pedidos_takeaway',
    description: 'Estado de los últimos pedidos de Take Away de este cliente (por su teléfono).',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

// Tools que en Instagram necesitan el celular del cliente (crean algo a su nombre).
const TOOLS_CREAN = ['crear_reserva_mesa', 'reservar_evento', 'reservar_cava', 'crear_pedido_takeaway'];
// Tools que en Instagram buscan cosas ya hechas: celular + a nombre de quién está.
const TOOLS_BUSCAN = ['mis_reservas', 'modificar_reserva', 'cancelar_reserva', 'mis_pedidos_takeaway'];

const PROP_TELEFONO = {
  type: 'string',
  description: 'Celular del cliente con código de área, tal como lo dio (ej. 11 2345-6789). Por Instagram es obligatorio: pedíselo si no figura en el PERFIL DEL CONTACTO.',
};
const PROP_NOMBRE_TITULAR = {
  type: 'string',
  description: 'A nombre de quién está la reserva/pedido (lo dice el cliente). Hace falta si no la hizo por este Instagram.',
};

/** Tools según el canal: por Instagram suman `telefono` (y `nombreTitular` para buscar). */
export function toolsParaCanal(channel) {
  if (channel === 'whatsapp') return RESERVAS_TOOLS;
  return RESERVAS_TOOLS.map((t) => {
    const crea = TOOLS_CREAN.includes(t.name);
    const busca = TOOLS_BUSCAN.includes(t.name);
    if (!crea && !busca) return t;
    return {
      ...t,
      description: `${t.description} Por Instagram: pasá el celular del cliente en telefono${busca ? ' y, si no la hizo por este Instagram, a nombre de quién está en nombreTitular' : ''}.`,
      input_schema: {
        ...t.input_schema,
        properties: {
          ...t.input_schema.properties,
          telefono: PROP_TELEFONO,
          ...(busca && { nombreTitular: PROP_NOMBRE_TITULAR }),
        },
      },
    };
  });
}

/** Celular → id de WhatsApp (549…); null si no parece un celular. */
export function telefonoValido(raw) {
  const id = toWaContactId(raw);
  if (!id) return null;
  if (id.startsWith('54')) return /^549\d{10}$/.test(id) ? id : null;
  return /^\d{8,15}$/.test(id) ? id : null; // del exterior: se acepta tal cual
}

const sinAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** El nombre que dice el cliente coincide (alguna palabra de 3+ letras) con el titular. */
export function mismoTitular(dicho, r) {
  const titular = new Set(sinAcentos(`${r.nombre ?? ''} ${r.apellido ?? ''}`).split(/[^a-zñ]+/).filter(w => w.length >= 3));
  return sinAcentos(dicho).split(/[^a-zñ]+/).some(w => w.length >= 3 && titular.has(w));
}

/**
 * Teléfono (id de WhatsApp) a cuyo nombre se crea o se busca. Por WhatsApp es
 * el del chat; por Instagram, el que dio el cliente (y se guarda en su ficha
 * para no volver a pedirlo).
 */
async function telefonoDeLaConversacion(input, ctx) {
  if (ctx.channel === 'whatsapp') return { tel: ctx.contactId };
  const guardado = ctx.customer?.telefonoWhatsapp || null;
  if (!input.telefono && !guardado) {
    return { error: 'Falta el celular del cliente. Pedíselo (con código de área) explicándole que es para dejar la reserva/pedido a su nombre y que ahí le llega la confirmación por WhatsApp; después volvé a llamar la herramienta con telefono.' };
  }
  const tel = telefonoValido(input.telefono || guardado);
  if (!tel) return { error: 'Ese número no parece un celular válido. Pedile el celular con código de área (ej. 11 2345-6789).' };
  if (tel !== guardado) {
    await guardarTelefonoContacto(ctx.contactId, tel).catch(e => console.error('[reservas-tool] no se pudo guardar el celular de IG:', e.message));
    if (ctx.customer) ctx.customer.telefonoWhatsapp = tel;
  }
  return { tel };
}

/**
 * Por Instagram cualquiera puede escribir un número: para ver/cambiar/cancelar
 * solo vale lo que se hizo desde ese mismo Instagram o, si se hizo por otro
 * lado, cuando el nombre del titular coincide.
 */
function filtroInstagram(input, ctx) {
  if (ctx.channel === 'whatsapp') return null;
  const dicho = input.nombreTitular || '';
  return (r) => r.instagramId === ctx.contactId || (dicho && mismoTitular(dicho, r));
}

const metaCanal = (ctx) => (ctx.channel === 'instagram' ? { instagramId: ctx.contactId } : {});
const nombreCanal = (ctx) => (ctx.channel === 'instagram' ? 'Instagram' : 'WhatsApp');

/**
 * Texto para el system prompt: reglas fijas + la fecha de hoy.
 * @param {object} cfg  configReservas() (capacidad, mínimo/máximo, precio y seña de La Cava)
 * @param {{ channel?: string }} opts  por Instagram el teléfono se pide (no lo tenemos)
 */
export function reservasPrompt(now = new Date(), cfg = normalizarConfigReservas(null), { channel = 'whatsapp' } = {}) {
  const telefonoTexto = channel === 'whatsapp'
    ? 'El teléfono ya lo tenemos: no lo pidas.'
    : 'Pedí también su celular con código de área (por Instagram no lo tenemos; si figura en el PERFIL DEL CONTACTO, usalo sin volver a pedirlo).';
  const hoy = ahoraAR(now);
  const dia = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long' }).format(now);
  return `--- RESERVAS ---
Hoy es ${dia} ${hoy.fecha} y son las ${hoy.hora} (hora de Argentina). Convertí "el sábado", "mañana", etc. a AAAA-MM-DD a partir de esta fecha.

HORARIOS Y EVENTOS: para cualquier pregunta de horario de apertura, días especiales (feriados, cierres) o eventos usá consultar_agenda. Un día especial del calendario manda sobre el horario habitual. No inventes eventos ni horarios.
- Si el cliente nombra algo que puede ser un evento (una cata, "menú de pasos", una noche temática, el nombre de una actividad), consultá la agenda ANTES de responder. Nunca digas que algo no existe sin haberlo chequeado.
- Si el evento trae "infoInterna", es info que cargó el equipo para vos (precio, qué incluye, menú, políticas): usala para responder sobre ese evento. Contá lo que el cliente pregunte con tus palabras; no la pegues entera.
- Si el evento trae "link", pasalo para reservar o sacar entradas.
- PAGO: si el evento trae "gratis": true, decí que no tiene costo. Si trae "pago", contá el precio y, si tiene "sena", que para asegurar el lugar hay que transferir esa seña al alias "alias" y mandar el comprobante por este chat. Si no trae ni "pago" ni "gratis", no afirmes que es gratis ni inventes precio: usá infoInterna o derivá con [MOTIVO:sin_info|precio del evento].
- Si reservar_evento devuelve "senaPendiente": decile que la reserva quedó tomada y que se termina de asegurar cuando mande el comprobante de la seña (monto y alias) por acá.
- COMPROBANTE: si el cliente manda una imagen o archivo que parece el comprobante de una seña (de un evento o de La Cava), agradecé, decile que el equipo lo verifica y derivá con [MOTIVO:comprobante_sena|evento y monto].
- Si no trae link (o trae reservaPorEsteChat: true), la reserva se toma ACÁ con reservar_evento y queda CONFIRMADA (salvo que devuelva senaPendiente: ahí queda tomada y se asegura con el comprobante, ver arriba): nunca le mandes un link de WhatsApp (ya está hablando con nosotros) ni digas que el equipo la confirma. Pedí nombre y cantidad de personas (y alergias si las hay), resumí y con el "sí" llamá a reservar_evento. Después decile que quedó confirmada, con el evento, día y hora.

CUMPLEAÑOS: si en el PERFIL DEL CONTACTO dice "Cumpleaños: NO LO TENEMOS", pedíselo UNA sola vez, en un momento natural: después de resolver lo que vino a buscar (por ejemplo, al confirmar una reserva o pedido), nunca antes ni interrumpiendo. Algo como: "¿Me pasás tu fecha de cumpleaños? Es para mandarte una promo especial cuando se acerque 🎂". Es opcional: si no quiere, respetalo. Cuando lo diga, guardalo con guardar_cumpleanos (día y mes alcanzan; el año solo si lo da). Si no quiere, llamá guardar_cumpleanos con noQuiere=true. Si ya lo tenemos o no quiso darlo, no lo menciones.

MESAS (hasta ${cfg.mesaMaximo} personas por mesa):
- Si son más de ${cfg.mesaMaximo}, no se puede reservar mesa: ${cfg.cavaMinimo <= cfg.mesaMaximo + 1 ? 'ofrecé La Cava' : `desde ${cfg.cavaMinimo} ofrecé La Cava; entre ${cfg.mesaMaximo + 1} y ${cfg.cavaMinimo - 1} derivá al equipo`}.
- Antes de ofrecer horarios usá consultar_disponibilidad_mesas (con la cantidad de personas si ya la sabés). Ofrecé solo horarios con disponible=true.
- Datos necesarios: nombre, cantidad de personas, fecha, horario y preferencia de ubicación (${PREFERENCIAS.join(' o ')}). Preguntá también por alergias/restricciones. El email es opcional. ${telefonoTexto}
- Antes de crear la reserva, resumí los datos y pedí confirmación. Recién con el "sí" llamá a crear_reserva_mesa.
- La reserva queda CONFIRMADA al crearla (igual que en la web): decíselo con el resumen (día, hora, personas, ubicación).

CAMBIOS Y CANCELACIONES (los hacés vos, no derives):
- Usá mis_reservas para encontrar la reserva (también las que hizo en la web con este número). Si tiene más de una, preguntá cuál. Si no aparece ninguna, puede que la haya hecho otra persona o con otro número: pedí a nombre de quién está y derivá al equipo con [MOTIVO:cambio_reserva|...].
- Para cambiar día, horario o cantidad de personas, primero consultar_disponibilidad_mesas con la nueva fecha y la cantidad de personas. Ojo: los lugares que devuelve cuentan su propia reserva como ocupada; si es el mismo horario, sumale sus personas.
- Antes de modificar o cancelar, confirmá con el cliente cómo queda (o que quiere cancelar). Con el "sí" llamá a modificar_reserva (solo los campos que cambian) o cancelar_reserva.
- Después decile cómo quedó la reserva (día, hora, personas, ubicación) o que quedó cancelada. Si se cancela, despedite amable e invitalo a volver.
- Si son más de ${cfg.mesaMaximo} personas, o la reserva ya pasó, o la herramienta da error que no podés resolver, derivá al equipo.
- Si un horario se llenó o no entran, ofrecé los más cercanos que tengan lugar. El cupo es por personas: cada horario tiene lugar para ${cfg.personasPorHorario} personas en total.

LA CAVA (eventos privados, desde ${cfg.cavaMinimo}${cfg.cavaMaximo ? ` hasta ${cfg.cavaMaximo}` : ''} personas):
- $${cfg.cavaPrecioPersona.toLocaleString('es-AR')} por persona: degustación completa con maridaje libre hasta las 00:00, panera y agua. Seña de $${cfg.cavaSena.toLocaleString('es-AR')} por transferencia.
- Una sola reserva por día: usá consultar_fechas_cava para ver qué días están tomados.
- La reserva de La Cava se toma ACÁ con reservar_cava: pedí nombre, cantidad de personas, fecha, horario de llegada (${HORARIOS_CAVA.join(', ')}) y si traen torta; resumí (con el total aproximado: personas × precio) y con el "sí" llamala.
- Queda TOMADA con la seña pendiente: decile que para asegurarla tiene que transferir la seña de $${cfg.cavaSena.toLocaleString('es-AR')} (datos de transferencia en la info del local) y mandar el comprobante por este chat. Cuando lo mande, aplicá la regla COMPROBANTE.
- Si prefiere hacerlo solo, también puede reservar en https://selvaggio.com.ar/#/reserva-cava (sube el comprobante ahí).

TAKE AWAY (picadas para llevar o con envío):
- Usá ver_menu_takeaway para conocer picadas, opciones y precios: nunca inventes productos ni precios. Si una picada tiene secciones obligatorias, preguntá qué elige en cada una (respetando "elegirHasta").
- Para el retiro usá horarios_retiro_takeaway. Envío gratis solo a las localidades de envioGratisA (pedí dirección).
- Antes de confirmar, usá cotizar_pedido_takeaway y mostrá el resumen con el total (efectivo tiene 10% de descuento). Recién con el "sí" llamá a crear_pedido_takeaway. ${telefonoTexto}
- Al crear, pasale al cliente el número de pedido (TW-XXXXXX). El pago es al retirar/recibir.
- Si preguntan cómo va su pedido, usá mis_pedidos_takeaway.`;
}

/**
 * Ejecuta una tool. Nunca tira: los errores vuelven como { error } para que
 * Claude se los explique al cliente (cupo lleno, día cerrado, datos faltantes).
 * @param {object} ctx { contactId, contactName }
 */
const YA_EXISTIA = 'Esta persona ya tenía esta reserva: NO se creó otra. No la anuncies como nueva. Si quiere cambiar algo (personas, sector), usá modificar_reserva.';

export async function runReservaTool(name, input, ctx) {
  try {
    switch (name) {
      case 'guardar_cumpleanos': {
        const datos = { fecha: input.fecha, noQuiere: input.noQuiere === true, landingClient: ctx.customer?.landingClient };
        const res = await guardarCumple(ctx.contactId, datos);
        // Por Instagram también en la ficha del celular que dio: el saludo de
        // cumpleaños sale por WhatsApp a ese número.
        const tel = ctx.channel !== 'whatsapp' && ctx.customer?.telefonoWhatsapp;
        if (tel && !res.error) await guardarCumple(tel, { ...datos, landingClient: null }).catch(e => console.error('[reservas-tool] cumple en ficha WA:', e.message));
        return res;
      }

      case 'consultar_agenda':
        return await agenda({ ...input, horarioHabitual: describirHorario(ctx.botConfig || {}) });

      case 'consultar_disponibilidad_mesas':
        return await disponibilidadMesas(input.fecha, { incluirSandbox: true, personas: input.personas });

      case 'crear_reserva_mesa': {
        const { tel, error } = await telefonoDeLaConversacion(input, ctx);
        if (error) return { error };
        const { telefono: _t, ...datos } = input;
        const reserva = await crearReservaMesa(
          { ...datos, telefono: tel },
          { origen: 'bot', contactId: tel, ...metaCanal(ctx) },
        );
        return {
          ok: true, estado: reserva.estado, fecha: reserva.fecha, horario: reserva.horario, cantidadPersonas: reserva.cantidadPersonas,
          ...(reserva.yaExistia && { aviso: YA_EXISTIA }),
        };
      }

      case 'mis_reservas': {
        const { tel, error } = await telefonoDeLaConversacion(input, ctx);
        if (error) return { error };
        const reservas = await reservasDelContacto(tel, { filtro: filtroInstagram(input, ctx) });
        if (!reservas.length && ctx.channel !== 'whatsapp' && !input.nombreTitular) {
          return { reservas, aviso: 'Por Instagram solo se ven las reservas hechas desde este Instagram. Si la hizo por otro lado, preguntale a nombre de quién está y volvé a llamar con nombreTitular.' };
        }
        return { reservas };
      }

      case 'modificar_reserva': {
        const { tel, error } = await telefonoDeLaConversacion(input, ctx);
        if (error) return { error };
        const { id, telefono: _t, nombreTitular: _n, ...cambios } = input;
        return await modificarReservaMesa(id, cambios, tel, { filtro: filtroInstagram(input, ctx), canal: nombreCanal(ctx) });
      }

      case 'cancelar_reserva': {
        const { tel, error } = await telefonoDeLaConversacion(input, ctx);
        if (error) return { error };
        return await cancelarReservaMesa(input.id, tel, { motivo: input.motivo, filtro: filtroInstagram(input, ctx), canal: nombreCanal(ctx) });
      }

      case 'reservar_evento': {
        const { tel, error } = await telefonoDeLaConversacion(input, ctx);
        if (error) return { error };
        const { telefono: _t, ...datos } = input;
        const r = await crearReservaEvento({ ...datos, telefono: tel }, { contactId: tel, ...metaCanal(ctx) });
        return {
          ok: true, estado: r.estado, evento: r.evento, fecha: r.fecha, horario: r.horario, cantidadPersonas: r.cantidadPersonas,
          ...(r.yaExistia && { aviso: YA_EXISTIA }),
          ...(r.senaPendiente && { senaPendiente: r.senaPendiente }),
        };
      }

      case 'consultar_fechas_cava': {
        const dias = (new Date(input.hasta) - new Date(input.desde)) / 86400000;
        if (!(dias >= 0 && dias <= 62)) return { error: 'El rango tiene que ser de 0 a 62 días' };
        return { desde: input.desde, hasta: input.hasta, ocupadas: await cavaOcupada(input.desde, input.hasta) };
      }

      case 'reservar_cava': {
        const { tel, error } = await telefonoDeLaConversacion(input, ctx);
        if (error) return { error };
        const { telefono: _t, ...datos } = input;
        const r = await crearReservaCavaBot({ ...datos, telefono: tel }, { contactId: tel, ...metaCanal(ctx) });
        return {
          ok: true, estado: r.estado, fecha: r.fecha, horario: r.horario, cantidadPersonas: r.cantidadPersonas,
          ...(r.yaExistia ? { aviso: 'Esta persona ya tenía La Cava reservada ese día: NO se creó otra. No la anuncies como nueva; si quiere cambiar algo, derivá al equipo.' } : { senaPendiente: r.sena, precioPorPersona: r.precioPersona }),
        };
      }

      case 'ver_menu_takeaway':
        return await menuTakeaway();

      case 'horarios_retiro_takeaway':
        return await horariosRetiro(input.fecha);

      case 'cotizar_pedido_takeaway':
        return await cotizarPedido({ ...input, email: input.email });

      case 'crear_pedido_takeaway': {
        const { tel, error } = await telefonoDeLaConversacion(input, ctx);
        if (error) return { error };
        let cuponId = '';
        if (input.cuponCodigo) {
          const c = await cotizarPedido({ items: input.items, metodoPago: input.metodoPago, cuponCodigo: input.cuponCodigo, email: input.email });
          if (c.avisoCupon) return { error: c.avisoCupon };
          cuponId = c.cuponId;
        }
        const { telefono: _t, ...datos } = input;
        const p = await crearPedidoTakeaway(
          { ...datos, telefono: tel, cuponId },
          { origen: 'bot', contactId: tel, ...metaCanal(ctx) },
        );
        return { ok: true, numeroPedido: p.numeroPedido, total: p.total, estado: 'pendiente' };
      }

      case 'mis_pedidos_takeaway': {
        const { tel, error } = await telefonoDeLaConversacion(input, ctx);
        if (error) return { error };
        return { pedidos: await pedidosDelContacto(tel, { filtro: filtroInstagram(input, ctx) }) };
      }

      default:
        return { error: `Tool desconocida: ${name}` };
    }
  } catch (err) {
    if (!err.status) console.error(`[reservas-tool] ${name}:`, err.message);
    return { error: err.status ? err.message : 'No se pudo consultar el sistema de reservas en este momento' };
  }
}
