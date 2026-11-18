// Por Instagram (y a veces WhatsApp) el mismo mensaje entra 2 o 3 veces:
// Meta reentrega el webhook con el mismo id, o el cliente manda la misma
// burbuja repetida porque la app le marcó error. Sin este filtro el bot
// contestaba una vez por cada copia.

export const VENTANA_REPETIDO_MS = 3 * 60 * 1000;

const normalizar = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// Respuestas cortas que el cliente puede repetir a propósito: "sí" → el bot
// pregunta "¿Confirmo?" → "sí" otra vez. Si el bot preguntó algo en el medio,
// no se filtran.
const RESPUESTAS_CORTAS = new Set(['si', 'no', 'ok', 'oka', 'okey', 'dale', 'listo', 'perfecto', 'bueno', 'genial', 'gracias', 'claro', 'exacto', 'correcto', 'confirmo', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

const aDate = (t) => (t?.toDate ? t.toDate() : t ? new Date(t) : null);

/**
 * ¿Este mensaje entrante es una copia de uno que ya procesamos?
 * - mismo id de Meta (reentrega del webhook), o
 * - texto igual al último mensaje del cliente, hace menos de 3 minutos.
 * Solo compara texto: dos fotos o dos audios seguidos se procesan igual.
 * Un "sí"/"no"/número repetido después de una pregunta del bot es una
 * respuesta real, no una copia.
 */
export function esMensajeRepetido(msg, history, now = new Date()) {
  if (msg.messageId && history.some(m => m.role === 'user' && m.waMsgId === msg.messageId)) {
    return 'mismo_id';
  }
  if ((msg.type ?? 'text') !== 'text') return null;
  const texto = normalizar(msg.text);
  if (!texto) return null;

  const idx = history.findLastIndex(m => m.role === 'user');
  const ultimoCliente = history[idx];
  if (!ultimoCliente || ultimoCliente.mediaType) return null;
  if (normalizar(ultimoCliente.content) !== texto) return null;
  const cuando = aDate(ultimoCliente.timestamp);
  if (!cuando || now - cuando > VENTANA_REPETIDO_MS) return null;
  const botPreguntoDespues = history.slice(idx + 1).some(m => m.role === 'assistant' && String(m.content ?? '').includes('?'));
  if (RESPUESTAS_CORTAS.has(texto.replace(/[!.¡,]+/g, '').trim()) && botPreguntoDespues) return null;
  return 'mismo_texto';
}
