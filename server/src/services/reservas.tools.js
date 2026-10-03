import {
  disponibilidadMesas, crearReservaMesa, cavaOcupada, ahoraAR,
  PREFERENCIAS, MINIMO_CAVA, CAVA, LIMITE_POR_SLOT,
} from './reservas.service.js';

// Tools que Claude puede llamar durante una conversación. El teléfono de la
// reserva sale del contacto (no se le pide al cliente ni se acepta del modelo).

export const RESERVAS_TOOLS = [
  {
    name: 'consultar_disponibilidad_mesas',
    description:
      'Devuelve si el salón abre en una fecha y qué horarios tienen lugar para reservar mesa. ' +
      'Usala SIEMPRE antes de ofrecer horarios o confirmar una reserva; no supongas disponibilidad.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha en formato AAAA-MM-DD (hora de Argentina).' },
      },
      required: ['fecha'],
      additionalProperties: false,
    },
  },
  {
    name: 'crear_reserva_mesa',
    description:
      'Registra una reserva de mesa (queda en estado pendiente hasta que el local la confirme). ' +
      'Llamala solo cuando el cliente confirmó explícitamente todos los datos. ' +
      `Para ${MINIMO_CAVA} personas o más no se usa: eso es La Cava.`,
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Nombre de quien reserva.' },
        apellido: { type: 'string' },
        email: { type: 'string', description: 'Opcional. Solo si el cliente lo dio.' },
        cantidadPersonas: { type: 'integer', minimum: 1, maximum: MINIMO_CAVA - 1 },
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
];

/** Texto para el system prompt: reglas fijas + la fecha de hoy. */
export function reservasPrompt(now = new Date()) {
  const hoy = ahoraAR(now);
  const dia = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long' }).format(now);
  return `--- RESERVAS ---
Hoy es ${dia} ${hoy.fecha} y son las ${hoy.hora} (hora de Argentina). Convertí "el sábado", "mañana", etc. a AAAA-MM-DD a partir de esta fecha.

MESAS (hasta ${MINIMO_CAVA - 1} personas):
- Antes de ofrecer horarios usá consultar_disponibilidad_mesas. Ofrecé solo horarios con disponible=true.
- Datos necesarios: nombre, cantidad de personas, fecha, horario y preferencia de ubicación (${PREFERENCIAS.join(' o ')}). Preguntá también por alergias/restricciones. El email es opcional. El teléfono ya lo tenemos: no lo pidas.
- Antes de crear la reserva, resumí los datos y pedí confirmación. Recién con el "sí" llamá a crear_reserva_mesa.
- La reserva queda PENDIENTE: decí que el equipo la confirma, nunca que ya está confirmada.
- Si un horario se llenó, ofrecé los más cercanos que tengan lugar. Hay cupo de ${LIMITE_POR_SLOT} reservas por horario.

LA CAVA (eventos privados, desde ${MINIMO_CAVA} personas):
- $${CAVA.precioPersona.toLocaleString('es-AR')} por persona: degustación completa con maridaje libre hasta las 00:00, panera y agua. Seña de $${CAVA.seña.toLocaleString('es-AR')} por transferencia.
- Una sola reserva por día: usá consultar_fechas_cava para ver qué días están tomados.
- Por WhatsApp NO se reserva La Cava (requiere el comprobante de la seña): pasá el link https://selvaggio.com.ar/#/reserva-cava o derivá al equipo si tienen dudas.`;
}

/**
 * Ejecuta una tool. Nunca tira: los errores vuelven como { error } para que
 * Claude se los explique al cliente (cupo lleno, día cerrado, datos faltantes).
 * @param {object} ctx { contactId, contactName }
 */
export async function runReservaTool(name, input, ctx) {
  try {
    switch (name) {
      case 'consultar_disponibilidad_mesas':
        return await disponibilidadMesas(input.fecha);

      case 'crear_reserva_mesa': {
        if (ctx.channel !== 'whatsapp') return { error: 'Por este canal no se pueden crear reservas; pasale el link https://selvaggio.com.ar/#/reserva-mesas' };
        const reserva = await crearReservaMesa(
          { ...input, telefono: ctx.contactId },
          { origen: 'bot', contactId: ctx.contactId },
        );
        return { ok: true, estado: reserva.estado, fecha: reserva.fecha, horario: reserva.horario, cantidadPersonas: reserva.cantidadPersonas };
      }

      case 'consultar_fechas_cava': {
        const dias = (new Date(input.hasta) - new Date(input.desde)) / 86400000;
        if (!(dias >= 0 && dias <= 62)) return { error: 'El rango tiene que ser de 0 a 62 días' };
        return { desde: input.desde, hasta: input.hasta, ocupadas: await cavaOcupada(input.desde, input.hasta) };
      }

      default:
        return { error: `Tool desconocida: ${name}` };
    }
  } catch (err) {
    if (!err.status) console.error(`[reservas-tool] ${name}:`, err.message);
    return { error: err.status ? err.message : 'No se pudo consultar el sistema de reservas en este momento' };
  }
}
