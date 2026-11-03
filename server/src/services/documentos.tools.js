// PDFs de la base de conocimiento que el bot puede mandar como archivo
// ("pasame la carta"). El envío se encola y sale DESPUÉS del texto de la
// respuesta, así el cliente lee "Te paso la carta" y recién ahí le llega.

const USO_LABEL = {
  carta: 'carta del salón',
  eventos: 'eventos',
  cava: 'La Cava',
  takeaway: 'take away',
  politicas: 'políticas',
  otro: 'otro',
};

/** Tool con los ids de los PDFs disponibles como enum (el modelo no puede inventar uno). */
export function documentosTool(docs) {
  return {
    name: 'enviar_documento',
    description:
      'Manda al cliente un PDF como archivo (carta, menú de eventos, propuesta de La Cava, etc.). ' +
      'Usala cuando el cliente lo pida ("pasame la carta", "tenés el menú?") o cuando mandar el PDF responda mejor que un texto largo. ' +
      'No mandes el mismo PDF dos veces en la conversación.',
    input_schema: {
      type: 'object',
      properties: {
        documentoId: { type: 'string', enum: docs.map(d => d.id), description: 'id del PDF de la lista DOCUMENTOS PARA ENVIAR.' },
      },
      required: ['documentoId'],
      additionalProperties: false,
    },
  };
}

export function documentosPrompt(docs) {
  if (!docs.length) return '';
  const cava = documentoCava(docs);
  const degu = documentoDegustacion(docs);
  const lista = docs.map(d => `- ${d.id} — "${d.title}" (uso: ${USO_LABEL[d.uso] ?? d.uso})`).join('\n');
  return `--- DOCUMENTOS PARA ENVIAR ---
Podés mandar estos PDFs con la tool enviar_documento:
${lista}
Si te piden la carta, el menú o una propuesta y hay un PDF que corresponde, mandalo y acompañalo con una frase corta ("Te paso la carta"). No pegues el contenido entero del PDF en el chat: respondé lo puntual y mandá el archivo si lo quieren completo.${cava ? `
LA CAVA: cuando consulten por La Cava (precio, fechas, disponibilidad, cómo es, cumpleaños o grupos grandes), mandá el PDF ${cava.id} la primera vez en la conversación aunque no lo pidan, y decilo en el texto ("Te paso la propuesta de La Cava").` : ""}${degu ? `
DEGUSTACIÓN: cuando pregunten por la Degustación Selvaggio (precio, qué incluye, si conviene pedirla), mandá el PDF ${degu.id} la primera vez en la conversación aunque no lo pidan. El "menú de pasos" es otra cosa (evento de la agenda).` : ""}`;
}

/**
 * @param {object} input { documentoId }
 * @param {Array} docs  documentos disponibles
 * @param {Array} cola  se le agregan los documentos a mandar después del texto
 */
export function runDocumentoTool(input, docs, cola) {
  const doc = docs.find(d => d.id === input.documentoId);
  if (!doc) return { error: 'Ese documento no existe' };
  if (cola.some(d => d.id === doc.id)) return { ok: true, yaEncolado: true };
  cola.push(doc);
  return { ok: true, enviado: doc.title, nota: 'El archivo se manda después de tu mensaje.' };
}

// ── PDFs automáticos (La Cava y Degustación) ──────────────────────────────
// El modelo solo mandaba estos PDFs cuando el cliente pedía "el PDF"; en
// "¿está libre la cava el 13?" o "¿precio de la degustación completa?"
// contestaba con texto. La primera vez en la sesión que se toca el tema, el
// PDF sale sí o sí. Se busca por TÍTULO primero (el 'uso' puede estar mal
// marcado en la KB).

const RE_CAVA = /\bcava\b/i;
const RE_DEGUSTACION = /degustaci[oó]n/i;

/** PDF de La Cava de la lista (por título; si no, por uso, sin confundirlo con la degustación). */
export function documentoCava(docs) {
  return docs.find(d => RE_CAVA.test(d.title ?? ''))
    ?? docs.find(d => d.uso === 'cava' && !RE_DEGUSTACION.test(d.title ?? ''));
}

/** PDF de la Degustación Selvaggio (por título). */
export function documentoDegustacion(docs) {
  return docs.find(d => RE_DEGUSTACION.test(d.title ?? '') && !RE_CAVA.test(d.title ?? ''));
}

function yaEnviado(doc, history, cola) {
  if (cola.some(d => d.id === doc.id)) return true;
  const nombre = doc.fileName || `${doc.title}.pdf`;
  return history.some(m => m.role === 'assistant' && m.mediaType === 'document'
    && (m.mediaUrl === doc.fileUrl || m.fileName === nombre));
}

/**
 * Encola los PDFs de La Cava / Degustación si en este turno se habló del tema
 * y todavía no se mandaron en la sesión. Devuelve los docs encolados.
 * @param {object} p { docs, history (sesión actual), userText, reply, toolsUsadas: Set, cola }
 */
export function encolarPdfsAutomaticos({ docs, history = [], userText = '', reply = '', toolsUsadas = new Set(), cola }) {
  const encolados = [];
  const hablaDeCava = toolsUsadas.has('consultar_fechas_cava') || RE_CAVA.test(userText) || RE_CAVA.test(reply);
  const cava = documentoCava(docs);
  if (cava && hablaDeCava && !yaEnviado(cava, history, cola)) { cola.push(cava); encolados.push(cava); }

  // La propuesta de La Cava también dice "degustación": si el tema es la cava, no va este.
  const degu = documentoDegustacion(docs);
  const hablaDeDegustacion = RE_DEGUSTACION.test(userText) || /degustaci[oó]n selvaggio/i.test(reply);
  if (degu && hablaDeDegustacion && !hablaDeCava && !yaEnviado(degu, history, cola)) { cola.push(degu); encolados.push(degu); }
  return encolados;
}
