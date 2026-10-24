import https from 'https';
import { getDb } from './firebase.service.js';
import { reasonPromptLines } from './escalationReasons.js';
import { sessionHistory } from './sessionHistory.js';

const MODEL = 'claude-sonnet-5';
// Caché de prompt: escribir cuesta 1.25x la entrada (TTL 5 min), leer 0.1x.
const PRICING = { inputPerMTok: 2.00, outputPerMTok: 10.00, cacheWritePerMTok: 2.50, cacheReadPerMTok: 0.20 };

// Con adaptive thinking (Sonnet 5) el primer bloque puede ser 'thinking' y no
// 'text' — leer content[0].text a ciegas devuelve undefined y rompe la respuesta.
function extractText(response) {
  const textBlock = response?.content?.find(b => b.type === 'text');
  return textBlock?.text ?? '';
}

function logUsage(usage, type) {
  if (!usage?.input_tokens && !usage?.cache_read_input_tokens) return;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const costUSD =
    (usage.input_tokens / 1e6) * PRICING.inputPerMTok +
    (cacheWrite / 1e6) * PRICING.cacheWritePerMTok +
    (cacheRead / 1e6) * PRICING.cacheReadPerMTok +
    (usage.output_tokens / 1e6) * PRICING.outputPerMTok;
  getDb().collection('bot-selvaggio_usage_logs').add({
    service: 'claude',
    model: MODEL,
    inputTokens: usage.input_tokens, // sólo la parte NO cacheada
    cacheWriteTokens: cacheWrite,
    cacheReadTokens: cacheRead,
    outputTokens: usage.output_tokens,
    costUSD: Math.round(costUSD * 1e6) / 1e6,
    type,
    createdAt: new Date(),
  }).catch(err => console.error('[claude] Error logging usage to Firestore:', err.message));
}

function buildEscalationInstructions(areas = []) {
  if (!areas.length) {
    return `
IMPORTANTE — ESCALADA: Si la consulta requiere atención humana y no podés resolverla, usá el marcador [ESCALAR] en una línea separada.

IMPORTANTE — MOTIVO DE LA DERIVACIÓN: Cada vez que derivás, agregá también en una línea separada [MOTIVO:categoria|detalle], donde detalle es una frase corta (máx. 12 palabras) y categoria es una de estas:
${reasonPromptLines()}
Ejemplo: "[MOTIVO:cambio_reserva|quiere pasar su reserva del sábado de 21 a 22 hs]". El cliente no lo ve.

IMPORTANTE — CIERRE: Empezá tu respuesta con [CERRAR] cuando la charla terminó: el cliente se despide o agradece ("gracias", "genial", "dale, nos vemos") y no queda nada pendiente — por ejemplo después de confirmar una reserva o un pedido. Si tu respuesta termina con una pregunta ("¿Te ayudo con algo más?", "¿para cuántas personas?"), NO uses [CERRAR]: estás esperando que el cliente conteste. Si el cliente vuelve a escribir después, la charla se reabre sola.
Ejemplo: "[CERRAR] ¡Gracias a vos! Nos vemos el viernes 🍷"`;
  }

  const lines = areas.map(a => `- [ESCALAR_${a.id.toUpperCase()}] — ${a.description}`).join('\n');

  return `
IMPORTANTE — ESCALADA: Cuando la consulta requiere atención humana, usá UNO de estos marcadores en una línea separada (NUNCA pongas otro texto en esa misma línea):
${lines}

Si la consulta requiere atención humana pero ninguna de las áreas de arriba encaja bien, usá [ESCALAR] sin especificar — no fuerces una de ellas si ninguna es la correcta.

El texto de tu respuesta (antes o después del marcador) es lo que le llega al cliente — avisale que lo derivás y que puede haber una pequeña demora. El marcador es invisible para el cliente.
Ejemplo correcto:
"Dale, te paso con alguien del equipo que te puede ayudar mejor con esto.
[ESCALAR_${areas[0].id.toUpperCase()}]"

IMPORTANTE — MOTIVO DE LA DERIVACIÓN: Cada vez que derivás, agregá también en una línea separada [MOTIVO:categoria|detalle], donde detalle es una frase corta (máx. 12 palabras) y categoria es una de estas:
${reasonPromptLines()}
Ejemplo: "[MOTIVO:cambio_reserva|quiere pasar su reserva del sábado de 21 a 22 hs]". El cliente no lo ve.

IMPORTANTE — CIERRE: Empezá tu respuesta con [CERRAR] cuando la charla terminó: el cliente se despide o agradece ("gracias", "genial", "dale, nos vemos") y no queda nada pendiente — por ejemplo después de confirmar una reserva o un pedido. Si tu respuesta termina con una pregunta ("¿Te ayudo con algo más?", "¿para cuántas personas?"), NO uses [CERRAR]: estás esperando que el cliente conteste. Si el cliente vuelve a escribir después, la charla se reabre sola.
Ejemplo: "[CERRAR] ¡Gracias a vos! Nos vemos el viernes 🍷"`;
}

function callAnthropicAPIOnce(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode !== 200) {
          const err = new Error(`Anthropic API ${res.statusCode}: ${data}`);
          err.statusCode = res.statusCode;
          err.retryAfter = res.headers['retry-after'];
          return reject(err);
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse Anthropic response: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const CLAUDE_MAX_RETRIES = 5;

async function callAnthropicAPI(payload) {
  let lastErr;
  for (let attempt = 1; attempt <= CLAUDE_MAX_RETRIES; attempt++) {
    try {
      return await callAnthropicAPIOnce(payload);
    } catch (err) {
      lastErr = err;
      const retryable = !err.statusCode || err.statusCode === 429 || err.statusCode === 529 || err.statusCode >= 500;
      if (!retryable || attempt === CLAUDE_MAX_RETRIES) throw err;
      const waitMs = err.retryAfter ? parseInt(err.retryAfter, 10) * 1000 : Math.min(1000 * 2 ** (attempt - 1), 15000);
      console.warn(`[claude] Retry ${attempt}/${CLAUDE_MAX_RETRIES} tras error: ${err.message} — esperando ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

export async function generateConversationSummary(messages) {
  if (!messages?.length) return 'Sin mensajes para resumir.';
  const formatted = messages
    .map(m => {
      const who = m.role === 'user' ? 'Cliente' : m.role === 'admin' ? 'Agente' : 'Bot';
      return `${who}: ${m.content ?? ''}`;
    })
    .join('\n');

  const response = await callAnthropicAPI({
    model: MODEL,
    max_tokens: 350,
    system: 'Generás resúmenes breves de conversaciones de atención al cliente en español rioplatense. Respondés SOLO con el resumen, sin encabezados ni listas.',
    messages: [{
      role: 'user',
      content: `Generá un resumen de 2 a 4 oraciones de esta conversación. Incluí: el motivo principal de la consulta y cómo terminó (resuelto, derivado a agente, pendiente).\n\nConversación:\n${formatted}`,
    }],
  });
  logUsage(response.usage, 'summary');
  return extractText(response).trim();
}

export async function generateBotResponse(userMessage, conversationHistory, context = {}) {
  const {
    knowledgeBase = '', customerContext = null, availableLabels = [], botConfig = {}, imageData = null, areas = [],
    tools = [], runTool = null, extraSystem = '',
  } = context;

  const systemContent = buildSystemPrompt(botConfig, knowledgeBase, customerContext, availableLabels, areas, extraSystem);
  const messages = buildMessages(conversationHistory, userMessage, imageData);

  // Loop de tool-use: mientras Claude pida tools, se ejecutan y se le
  // devuelven los resultados. El turno del asistente se reenvía con su
  // `content` COMPLETO (incluidos los bloques thinking) y todos los
  // tool_result van juntos en un único mensaje de usuario.
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callAnthropicAPI({
      model: MODEL,
      max_tokens: 2048,
      system: systemContent,
      messages,
      ...(tools.length && { tools }),
    });
    logUsage(response.usage, round === 0 ? 'bot_reply' : 'bot_reply_tool');

    if (response.stop_reason !== 'tool_use' || !runTool) return extractText(response);

    const calls = response.content.filter(b => b.type === 'tool_use');
    const results = await Promise.all(calls.map(async (call) => {
      const output = await runTool(call.name, call.input ?? {});
      console.log(`[claude] tool ${call.name}`, JSON.stringify(call.input), '→', JSON.stringify(output).slice(0, 300));
      return {
        type: 'tool_result',
        tool_use_id: call.id,
        content: JSON.stringify(output),
        ...(output?.error && { is_error: true }),
      };
    }));
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: results });
  }

  console.warn('[claude] Se alcanzó el máximo de rondas de tools sin respuesta final');
  return 'Perdón, se me complicó revisar eso. ¿Me lo repetís o preferís que te pase con alguien del equipo?';
}

const MAX_TOOL_ROUNDS = 6;

// availableLabels: [{ name, description }] (o strings, por compatibilidad).
function buildLabelInstructions(availableLabels = []) {
  const labels = availableLabels.map(l => (typeof l === 'string' ? { name: l } : l)).filter(l => l?.name);
  const lista = labels.length
    ? labels.map(l => `- ${l.name}${l.description ? ` → ${l.description}` : ''}`).join('\n')
    : '(todavía no hay etiquetas)';
  return `

--- ETIQUETAS ---
Clasificá SIEMPRE la conversación con [LABEL:nombre] en tu respuesta (es invisible para el cliente; el equipo filtra las conversaciones por estas etiquetas).
Etiquetas existentes:
${lista}
Reglas:
- Las etiquetas van en tu respuesta final al cliente, también cuando usaste herramientas (agenda, disponibilidad, menú) para responder.
- Usá la más específica. "Consulta" solo si no aplica ninguna otra.
- Podés poner más de una si corresponde (ej: [LABEL:Evento / Presupuesto] [LABEL:Cava]).
- Etiquetá en cuanto quede clara la intención, aunque todavía falten datos. Si la conversación cambia de tema, agregá la etiqueta del tema nuevo; no repitas las que ya tiene.
- Si el tema es claramente del restaurante y no entra en ninguna, creá una con [NEW_LABEL:Nombre]: corto (1 a 3 palabras), genérico y reutilizable (ej: "Gift card", "Alergias"). Nunca con nombres de personas, fechas ni detalles de un caso puntual.`;
}

// Caché de prompt: el system va en 2 bloques — lo que es IGUAL para todos los
// clientes (personalidad, KB, etiquetas) con cache_control (~10% del costo),
// y lo que cambia por cliente/mensaje (perfil, reservas con la fecha de hoy,
// documentos) al final. No meter nada variable en el primer bloque.
// Errores vistos en charlas reales (oct 2026): inventar el contexto de un
// mensaje, "corregir" al que escribe, contestar seco a una imagen y leer mal
// horarios. Va en el bloque cacheado.
const EXACTITUD = `

IMPORTANTE — EXACTITUD:
- Respondé solo sobre lo que el cliente escribió. No supongas ni agregues datos que no dijo (nombres, ocasiones, fechas, cantidades, para quién es). Si te falta un dato, preguntalo.
- Si alguien menciona otra marca o un nombre que no es Selvaggio (agencias, proveedores, colaboraciones), no lo corrijas ni le digas que se equivocó: tomá su propuesta como dirigida a Selvaggio y seguí el procedimiento que corresponda.
- Si te mandan una imagen, contestá con amabilidad según lo que se ve y la charla. Nunca respondas "no puedo ayudarte con eso" ni que la imagen "no tiene relación".
- Si te mandan un CV (en texto, imagen o archivo), agradecé y pasá el link para cargarlo en la web. No digas que no podés abrir el archivo ni le pidas que te lo escriba.
- Horarios: el local abre de tarde/noche, así que una hora ambigua ("a las 9", "11:30") es de noche (21:00, 23:30). No ofrezcas reservas en el horario de cierre ni después.
- Cada charla es independiente: no retomes temas de charlas anteriores salvo que el cliente los mencione.`;

function buildSystemPrompt(botConfig = {}, knowledgeBase, customerContext, availableLabels = [], areas = [], extraSystem = '') {
  const botName = botConfig.botName || 'Asistente';
  const businessName = botConfig.businessName || 'Selvaggio Wine Bar & Delicatessen';
  const personality = botConfig.botPersonality ||
    `Respondés de forma amigable, natural y cercana — como lo haría una persona real del equipo.
Usás un tono cálido y profesional. Nunca robótico ni genérico.
Escribís en español rioplatense (vos, etc.) con claridad.
Si no sabés algo, lo decís honestamente y ofrecés derivar a la persona correcta.
Nunca inventás información sobre servicios, precios, plazos, procesos o links — solo usás los datos que te den. Si algo no está en la información que tenés, lo decís honestamente en vez de inventar o suponer.`;

  let prompt = `Sos el asistente virtual de ${businessName}. Tu nombre es ${botName}.\n${personality}`;
  prompt += buildEscalationInstructions(areas);
  prompt += EXACTITUD;
  if (knowledgeBase) {
    prompt += `\n\n--- INFORMACIÓN DE LA EMPRESA ---\n${knowledgeBase}`;
    prompt += `\n\nIMPORTANTE — USO DE ESTA INFORMACIÓN: Es TU ÚNICA fuente de verdad sobre servicios, precios, procesos y políticas. Antes de responder CUALQUIER consulta, revisá esta sección completa primero. Si algo aplica, compartilo directamente aunque el cliente no lo pida explícitamente. Si la consulta no está cubierta acá, NUNCA inventes ni supongas una respuesta — decí que no tenés esa info y ofrecé derivar a alguien del equipo.`;
  }
  prompt += buildLabelInstructions(availableLabels);

  let dyn = '';
  if (customerContext) dyn += `\n\n--- PERFIL DEL CONTACTO ---\n${customerContext}`;
  if (extraSystem) dyn += `\n\n${extraSystem}`;

  const blocks = [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }];
  if (dyn.trim()) blocks.push({ type: 'text', text: dyn.trim() });
  return blocks;
}

function buildMessages(conversationHistory, newMessage, imageData = null) {
  const messages = [];
  for (const msg of sessionHistory(conversationHistory ?? [])) {
    const role = msg.role === 'user' ? 'user' : 'assistant';
    const content = msg.transcript ? `[Audio transcripto] ${msg.transcript}` : msg.content;
    messages.push({ role, content });
  }
  if (imageData) {
    messages.push({
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: imageData.mimeType, data: imageData.base64 } },
        { type: 'text', text: newMessage || 'Describí esta imagen en el contexto de la consulta del cliente.' },
      ],
    });
  } else {
    messages.push({ role: 'user', content: newMessage });
  }
  return messages;
}

/**
 * Transcribe un PDF (carta, menú de eventos, políticas…) a texto plano para
 * que el bot lo use como conocimiento. Se hace UNA vez al subirlo: Claude lee
 * también los PDFs diseñados como imagen, que un extractor de texto no lee.
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
export async function transcribirPdf(buffer, titulo = '') {
  const response = await callAnthropicAPI({
    model: MODEL,
    max_tokens: 16000,
    system: 'Transcribís documentos de un wine bar (cartas, menús, propuestas de eventos, políticas) a texto plano en español. Respondés SOLO con la transcripción.',
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') } },
        {
          type: 'text',
          text: `Transcribí este PDF${titulo ? ` ("${titulo}")` : ''} completo y fiel: todos los productos, descripciones, precios, condiciones, fechas y horarios tal cual aparecen. ` +
            'Mantené la estructura con títulos de sección en MAYÚSCULAS y un ítem por línea ("Nombre — descripción — $precio"). ' +
            'No resumas, no agregues nada que no esté, no inventes precios. Si una parte no se lee, poné [ilegible].',
        },
      ],
    }],
  });
  logUsage(response.usage, 'kb_pdf');
  return extractText(response).trim();
}
