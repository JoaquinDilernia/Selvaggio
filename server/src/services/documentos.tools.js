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
  const lista = docs.map(d => `- ${d.id} — "${d.title}" (uso: ${USO_LABEL[d.uso] ?? d.uso})`).join('\n');
  return `--- DOCUMENTOS PARA ENVIAR ---
Podés mandar estos PDFs con la tool enviar_documento:
${lista}
Si te piden la carta, el menú o una propuesta y hay un PDF que corresponde, mandalo y acompañalo con una frase corta ("Te paso la carta"). No pegues el contenido entero del PDF en el chat: respondé lo puntual y mandá el archivo si lo quieren completo.${cava ? `
LA CAVA: cuando consulten por La Cava (precio, fechas, disponibilidad, cómo es, cumpleaños o grupos grandes), mandá el PDF ${cava.id} la primera vez en la conversación aunque no lo pidan, y decilo en el texto ("Te paso la propuesta de La Cava").` : ""}`;
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

// ── PDF de La Cava automático ─────────────────────────────────────────────
// El modelo solo mandaba el PDF cuando el cliente lo pedía explícitamente;
// en "¿está libre la cava el 13?" o "somos 40" contestaba con texto. La
// propuesta de La Cava es lo que vende el evento, así que la primera vez que
// la conversación toca La Cava sale sí o sí (una vez por sesión).

const RE_CAVA = /\bcava\b/i;

/** PDF de La Cava de la lista (por uso; si nadie lo marcó, por título). */
export function documentoCava(docs) {
  return docs.find(d => d.uso === 'cava') ?? docs.find(d => RE_CAVA.test(d.title ?? ''));
}

/**
 * Encola el PDF de La Cava si en este turno se habló de La Cava y todavía no
 * se mandó en la sesión. Devuelve el doc encolado o null.
 * @param {object} p { docs, history (sesión actual), userText, reply, toolsUsadas: Set, cola }
 */
export function encolarPdfCava({ docs, history = [], userText = '', reply = '', toolsUsadas = new Set(), cola }) {
  const doc = documentoCava(docs);
  if (!doc) return null;
  if (cola.some(d => d.id === doc.id)) return null;
  const nombre = doc.fileName || `${doc.title}.pdf`;
  const yaEnviado = history.some(m => m.role === 'assistant' && m.mediaType === 'document'
    && (m.mediaUrl === doc.fileUrl || m.fileName === nombre));
  if (yaEnviado) return null;
  const hablaDeCava = toolsUsadas.has('consultar_fechas_cava') || RE_CAVA.test(userText) || RE_CAVA.test(reply);
  if (!hablaDeCava) return null;
  cola.push(doc);
  return doc;
}
