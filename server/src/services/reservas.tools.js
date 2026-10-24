import {
  disponibilidadMesas, crearReservaMesa, cavaOcupada, ahoraAR, agenda, crearReservaEvento,
  PREFERENCIAS, normalizarConfigReservas,
} from './reservas.service.js';
import { describirHorario } from './horario.js';
import { guardarCumple } from './cumpleanos.service.js';
import { reservasDelContacto, modificarReservaMesa, cancelarReservaMesa } from './reservasCambios.service.js';
import { menuTakeaway, horariosRetiro, cotizarPedido, crearPedidoTakeaway, pedidosDelContacto } from './takeaway.service.js';

// Tools que Claude puede llamar durante una conversación. El teléfono de la
// reserva sale del contacto (no se le pide al cliente ni se acepta del modelo).

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

/**
 * Texto para el system prompt: reglas fijas + la fecha de hoy.
 * @param {object} cfg  configReservas() (capacidad, mínimo/máximo, precio y seña de La Cava)
 */
export function reservasPrompt(now = new Date(), cfg = normalizarConfigReservas(null)) {
  const hoy = ahoraAR(now);
  const dia = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long' }).format(now);
  return `--- RESERVAS ---
Hoy es ${dia} ${hoy.fecha} y son las ${hoy.hora} (hora de Argentina). Convertí "el sábado", "mañana", etc. a AAAA-MM-DD a partir de esta fecha.

HORARIOS Y EVENTOS: para cualquier pregunta de horario de apertura, días especiales (feriados, cierres) o eventos usá consultar_agenda. Un día especial del calendario manda sobre el horario habitual. No inventes eventos ni horarios.
- Si el cliente nombra algo que puede ser un evento (una cata, "menú de pasos", una noche temática, el nombre de una actividad), consultá la agenda ANTES de responder. Nunca digas que algo no existe sin haberlo chequeado.
- Si el evento trae "infoInterna", es info que cargó el equipo para vos (precio, qué incluye, menú, políticas): usala para responder sobre ese evento. Contá lo que el cliente pregunte con tus palabras; no la pegues entera.
- Si el evento trae "link", pasalo para reservar o sacar entradas.
- Si no trae link (o trae reservaPorEsteChat: true), la reserva se toma ACÁ y queda CONFIRMADA: nunca le mandes un link de WhatsApp (ya está hablando con nosotros) ni digas que el equipo la confirma. Pedí nombre y cantidad de personas (y alergias si las hay), resumí y con el "sí" llamá a reservar_evento. Después decile que quedó confirmada, con el evento, día y hora.

CUMPLEAÑOS: si en el PERFIL DEL CONTACTO dice "Cumpleaños: NO LO TENEMOS", pedíselo UNA sola vez, en un momento natural: después de resolver lo que vino a buscar (por ejemplo, al confirmar una reserva o pedido), nunca antes ni interrumpiendo. Algo como: "¿Me pasás tu fecha de cumpleaños? Es para mandarte una promo especial cuando se acerque 🎂". Es opcional: si no quiere, respetalo. Cuando lo diga, guardalo con guardar_cumpleanos (día y mes alcanzan; el año solo si lo da). Si no quiere, llamá guardar_cumpleanos con noQuiere=true. Si ya lo tenemos o no quiso darlo, no lo menciones.

MESAS (hasta ${cfg.mesaMaximo} personas por mesa):
- Si son más de ${cfg.mesaMaximo}, no se puede reservar mesa: ${cfg.cavaMinimo <= cfg.mesaMaximo + 1 ? 'ofrecé La Cava' : `desde ${cfg.cavaMinimo} ofrecé La Cava; entre ${cfg.mesaMaximo + 1} y ${cfg.cavaMinimo - 1} derivá al equipo`}.
- Antes de ofrecer horarios usá consultar_disponibilidad_mesas (con la cantidad de personas si ya la sabés). Ofrecé solo horarios con disponible=true.
- Datos necesarios: nombre, cantidad de personas, fecha, horario y preferencia de ubicación (${PREFERENCIAS.join(' o ')}). Preguntá también por alergias/restricciones. El email es opcional. El teléfono ya lo tenemos: no lo pidas.
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
- Por WhatsApp NO se reserva La Cava (requiere el comprobante de la seña): pasá el link https://selvaggio.com.ar/#/reserva-cava o derivá al equipo si tienen dudas.

TAKE AWAY (picadas para llevar o con envío):
- Usá ver_menu_takeaway para conocer picadas, opciones y precios: nunca inventes productos ni precios. Si una picada tiene secciones obligatorias, preguntá qué elige en cada una (respetando "elegirHasta").
- Para el retiro usá horarios_retiro_takeaway. Envío gratis solo a las localidades de envioGratisA (pedí dirección).
- Antes de confirmar, usá cotizar_pedido_takeaway y mostrá el resumen con el total (efectivo tiene 10% de descuento). Recién con el "sí" llamá a crear_pedido_takeaway. El teléfono ya lo tenemos.
- Al crear, pasale al cliente el número de pedido (TW-XXXXXX). El pago es al retirar/recibir.
- Si preguntan cómo va su pedido, usá mis_pedidos_takeaway.`;
}

/**
 * Ejecuta una tool. Nunca tira: los errores vuelven como { error } para que
 * Claude se los explique al cliente (cupo lleno, día cerrado, datos faltantes).
 * @param {object} ctx { contactId, contactName }
 */
export async function runReservaTool(name, input, ctx) {
  try {
    switch (name) {
      case 'guardar_cumpleanos':
        if (ctx.channel !== 'whatsapp') return { error: 'Solo se guarda desde WhatsApp' };
        return await guardarCumple(ctx.contactId, { fecha: input.fecha, noQuiere: input.noQuiere === true, landingClient: ctx.customer?.landingClient });

      case 'consultar_agenda':
        return await agenda({ ...input, horarioHabitual: describirHorario(ctx.botConfig || {}) });

      case 'consultar_disponibilidad_mesas':
        return await disponibilidadMesas(input.fecha, { incluirSandbox: true, personas: input.personas });

      case 'crear_reserva_mesa': {
        if (ctx.channel !== 'whatsapp') return { error: 'Por este canal no se pueden crear reservas; pasale el link https://selvaggio.com.ar/#/reserva-mesas' };
        const reserva = await crearReservaMesa(
          { ...input, telefono: ctx.contactId },
          { origen: 'bot', contactId: ctx.contactId },
        );
        return { ok: true, estado: reserva.estado, fecha: reserva.fecha, horario: reserva.horario, cantidadPersonas: reserva.cantidadPersonas };
      }

      case 'mis_reservas':
        if (ctx.channel !== 'whatsapp') return { error: 'Solo desde WhatsApp' };
        return { reservas: await reservasDelContacto(ctx.contactId) };

      case 'modificar_reserva': {
        if (ctx.channel !== 'whatsapp') return { error: 'Por este canal no se pueden cambiar reservas; que escriba por WhatsApp' };
        const { id, ...cambios } = input;
        return await modificarReservaMesa(id, cambios, ctx.contactId);
      }

      case 'cancelar_reserva':
        if (ctx.channel !== 'whatsapp') return { error: 'Por este canal no se pueden cancelar reservas; que escriba por WhatsApp' };
        return await cancelarReservaMesa(input.id, ctx.contactId, { motivo: input.motivo });

      case 'reservar_evento': {
        if (ctx.channel !== 'whatsapp') return { error: 'Por este canal no se pueden tomar reservas; que escriba por WhatsApp' };
        const r = await crearReservaEvento({ ...input, telefono: ctx.contactId }, { contactId: ctx.contactId });
        return { ok: true, estado: r.estado, evento: r.evento, fecha: r.fecha, horario: r.horario, cantidadPersonas: r.cantidadPersonas };
      }

      case 'consultar_fechas_cava': {
        const dias = (new Date(input.hasta) - new Date(input.desde)) / 86400000;
        if (!(dias >= 0 && dias <= 62)) return { error: 'El rango tiene que ser de 0 a 62 días' };
        return { desde: input.desde, hasta: input.hasta, ocupadas: await cavaOcupada(input.desde, input.hasta) };
      }

      case 'ver_menu_takeaway':
        return await menuTakeaway();

      case 'horarios_retiro_takeaway':
        return await horariosRetiro(input.fecha);

      case 'cotizar_pedido_takeaway':
        return await cotizarPedido({ ...input, email: input.email });

      case 'crear_pedido_takeaway': {
        if (ctx.channel !== 'whatsapp') return { error: 'Por este canal no se pueden crear pedidos; pasale el link https://selvaggio.com.ar/#/take-away' };
        let cuponId = '';
        if (input.cuponCodigo) {
          const c = await cotizarPedido({ items: input.items, metodoPago: input.metodoPago, cuponCodigo: input.cuponCodigo, email: input.email });
          if (c.avisoCupon) return { error: c.avisoCupon };
          cuponId = c.cuponId;
        }
        const p = await crearPedidoTakeaway(
          { ...input, telefono: ctx.contactId, cuponId },
          { origen: 'bot', contactId: ctx.contactId },
        );
        return { ok: true, numeroPedido: p.numeroPedido, total: p.total, estado: 'pendiente' };
      }

      case 'mis_pedidos_takeaway':
        return { pedidos: await pedidosDelContacto(ctx.contactId) };

      default:
        return { error: `Tool desconocida: ${name}` };
    }
  } catch (err) {
    if (!err.status) console.error(`[reservas-tool] ${name}:`, err.message);
    return { error: err.status ? err.message : 'No se pudo consultar el sistema de reservas en este momento' };
  }
}
