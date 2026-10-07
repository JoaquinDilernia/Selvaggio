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
  const lista = docs.map(d => `- ${d.id} — "${d.title}" (uso: ${USO_LABEL[d.uso] ?? d.uso})`).join('\n');
  return `--- DOCUMENTOS PARA ENVIAR ---
Podés mandar estos PDFs con la tool enviar_documento:
${lista}
Si te piden la carta, el menú o una propuesta y hay un PDF que corresponde, mandalo y acompañalo con una frase corta ("Te paso la carta"). No pegues el contenido entero del PDF en el chat: respondé lo puntual y mandá el archivo si lo quieren completo.`;
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
