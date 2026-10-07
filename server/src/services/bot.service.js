import { generateBotResponse } from './claude.service.js';
import { getKnowledgeBasePrompt, getDocumentosParaEnviar } from './knowledge.service.js';
import {
  getOrCreateConversation,
  appendMessage,
  getConversationHistory,
  updateConversationStatus,
  updateHumanMode,
  updateAssignment,
  dispatchConversation,
  setUrgentFlag,
  addLabelToConversation,
} from './conversation.service.js';
import { sendWhatsAppMessage, sendInstagramMessage, downloadMediaAsBase64, sendWhatsAppDocumentLink } from './meta.service.js';
import { getOrCreateCustomer, buildCustomerContext } from './customer.service.js';
import { getAllLabels, createLabel, resolverEtiqueta } from './label.service.js';
import { getActiveAreas } from './area.service.js';
import { getDb } from './firebase.service.js';
import { toWaContactId } from './phone.js';
import { getDefaultConfig } from '../routes/config.routes.js';
import { isWithinBusinessHours, describirHorario } from './horario.js';

export { isWithinBusinessHours };
import { RESERVAS_TOOLS, reservasPrompt, runReservaTool } from './reservas.tools.js';
import { documentosTool, documentosPrompt, runDocumentoTool } from './documentos.tools.js';

const URGENCY_KEYWORDS = [
  /urgente/i, /urgencia/i, /reclamo/i, /estafa/i, /fraude/i,
  /muy enojad/i, /indignado/i, /hablar con una persona/i, /quiero hablar/i,
];

function buildEscalationMessage(areaName, botConfig = {}) {
  const within = isWithinBusinessHours(botConfig);
  const hoursStr = describirHorario(botConfig);
  const label = areaName ? `*${areaName}*` : 'nuestro equipo';

  if (within) {
    return `Le paso tu consulta a ${label}. Alguien del equipo te escribe en un ratito.`;
  }
  return `Le paso tu consulta a ${label}. Ahora estamos fuera de horario${hoursStr ? ` (atendemos ${hoursStr})` : ''}, así que te escriben apenas retomemos.`;
}

function parseEscalationMarker(text, areas = []) {
  const markers = areas.map(a => ({
    re: new RegExp(`\\[ESCALAR_${a.id.toUpperCase()}\\]`, 'i'),
    assignTo: a.id,
  }));
  // Fallback genérico — no fuerza un área por defecto, queda sin asignar
  // hasta que un agente lo tome manualmente.
  markers.push({ re: /\[ESCALAR\]/i, assignTo: null });

  for (const { re, assignTo } of markers) {
    if (!re.test(text)) continue;
    const withoutLine = text.replace(/^[^\n]*\[ESCALAR[^\]]*\][^\n]*\n?/mi, '').trim();
    const cleanText = withoutLine || text.replace(re, '').trim();
    return { shouldEscalate: true, assignTo, cleanText };
  }
  return { shouldEscalate: false, assignTo: null, cleanText: text };
}

// [LABEL:x] y [NEW_LABEL:x] se tratan igual: si la etiqueta ya existe (sin
// importar mayúsculas/tildes) se usa esa; si no, se crea. Así el bot nunca
// deja etiquetas "huérfanas" ni duplica "Reserva de Mesa" / "reserva de mesa".
async function aplicarEtiquetas(contactId, nombres, labels, yaTiene) {
  const aplicadas = [];
  for (const nombre of new Set(nombres.map(n => n.trim()).filter(Boolean))) {
    try {
      const label = resolverEtiqueta(nombre, labels) ?? await createLabel(nombre);
      if (!labels.some(l => l.id === label.id)) {
        labels.push(label);
        console.log(`[bot] Etiqueta nueva creada por el bot: "${label.name}"`);
      }
      if (yaTiene.includes(label.name) || aplicadas.includes(label.name)) continue;
      await addLabelToConversation(contactId, label.name);
      aplicadas.push(label.name);
    } catch (err) {
      console.error(`[bot] No se pudo aplicar la etiqueta "${nombre}":`, err.message);
    }
  }
  if (aplicadas.length) console.log(`[bot] Etiquetas aplicadas a ${contactId}:`, aplicadas);
}

async function enviarDocumento(to, doc) {
  const fileName = doc.fileName || `${doc.title}.pdf`;
  try {
    const waMsgId = await sendWhatsAppDocumentLink(to, doc.fileUrl, fileName);
    await appendMessage(to, {
      role: 'assistant',
      content: `[Archivo: ${fileName}]`,
      mediaType: 'document',
      mediaUrl: doc.fileUrl,
      fileName,
      mimeType: 'application/pdf',
      ...(waMsgId && { waMsgId }),
    });
    console.log(`[bot] PDF "${doc.title}" enviado a ${to}`);
  } catch (err) {
    console.error(`[bot] ERROR enviando PDF "${doc.title}" a ${to}:`, err.response?.data ?? err.message);
  }
}

function parseCloseMarker(text) {
  if (/\[CERRAR\]/i.test(text)) {
    return { shouldClose: true, cleanText: text.replace(/\[CERRAR\]\s*/i, '').trim() };
  }
  return { shouldClose: false, cleanText: text };
}

function parseLabelMarkers(text) {
  const labels = [...text.matchAll(/\[LABEL:([^\]]+)\]/gi)].map(m => m[1].trim());
  const newLabels = [...text.matchAll(/\[NEW_LABEL:([^\]]+)\]/gi)].map(m => m[1].trim());
  const cleanText = text.replace(/\[(NEW_)?LABEL:[^\]]+\]/gi, '').trim();
  return { labels, newLabels, cleanText };
}

// Claude escribe negrita en Markdown estándar (**texto**), pero WhatsApp
// solo reconoce un asterisco de cada lado (*texto*) — con doble asterisco
// el cliente ve los asteriscos literales en vez de texto en negrita.
function toWhatsAppBold(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '*$1*');
}

// WhatsApp suele mandar mensajes de un mismo contacto en ráfagas de a
// segundos (varias burbujas separadas). Cada una llega como un webhook HTTP
// independiente y Express los procesa en paralelo, así que sin esta cola
// dos mensajes casi simultáneos disparan dos llamadas a Claude en paralelo
// con el mismo historial de partida. Serializamos por contactId.
const contactLocks = new Map();

export function processIncomingMessage(msg) {
  // Canonicalizar el teléfono ni bien entra. Meta manda el "from" de los
  // números argentinos a veces con el 9 de celular y a veces sin él; si no
  // lo normalizamos acá, la respuesta del cliente cae en un documento de
  // conversación distinto al de la plantilla que le mandamos y se ve como
  // dos chats separados. Solo aplica a WhatsApp — el "from" de Instagram
  // es un ID de usuario, no un teléfono.
  if (msg.channel === 'whatsapp' && msg.from) {
    const canonical = toWaContactId(msg.from);
    if (canonical) msg = { ...msg, from: canonical };
  }
  const contactId = msg.from;
  const previous = contactLocks.get(contactId) ?? Promise.resolve();
  const current = previous
    .catch(() => {})
    .then(() => processIncomingMessageInternal(msg))
    .finally(() => {
      if (contactLocks.get(contactId) === current) contactLocks.delete(contactId);
    });
  contactLocks.set(contactId, current);
  return current;
}

const REPLY_PREVIEW_MAX = 80;

function resolveReplyTo(history, replyToWaMsgId) {
  if (!replyToWaMsgId) return null;
  const original = history.find(m => m.waMsgId === replyToWaMsgId);
  if (!original) return null;
  const content = original.content ?? '';
  const preview = content.length > REPLY_PREVIEW_MAX
    ? `${content.slice(0, REPLY_PREVIEW_MAX)}…`
    : content;
  return { preview, role: original.role };
}

async function processIncomingMessageInternal(msg) {
  const { channel, from, text, type, mediaId, mediaUrl, contactName, messageId, replyToWaMsgId } = msg;
  // Datos del adjunto que se guardan junto al mensaje para que el panel pueda
  // mostrarlo (nombre del archivo, tipo, y la URL de CDN si vino de Instagram).
  const mediaFields = {
    mediaId: mediaId ?? null,
    ...(mediaUrl && { mediaUrl }),
    ...(msg.fileName && { fileName: msg.fileName }),
    ...(msg.mimeType && { mimeType: msg.mimeType }),
  };

  let conversation, history, knowledgeBase, customer, availableLabels, configDoc, areas, documentos;
  try {
    [conversation, history, knowledgeBase, customer, availableLabels, configDoc, areas, documentos] = await Promise.all([
      getOrCreateConversation(from, channel, contactName),
      getConversationHistory(from),
      getKnowledgeBasePrompt().catch(() => ''),
      getOrCreateCustomer(from, channel, contactName),
      getAllLabels().catch(() => []),
      getDb().collection('bot-selvaggio_config').doc('bot_config').get().catch(() => ({ exists: false, data: () => ({}) })),
      getActiveAreas().catch(() => []),
      getDocumentosParaEnviar().catch(() => []),
    ]);
  } catch (err) {
    console.error('[bot] Error cargando contexto para', from, err.message);
    return;
  }
  // Sin config guardada (o con campos faltantes) se usan los defaults de Selvaggio.
  const botConfig = { ...getDefaultConfig(), ...(configDoc.exists ? configDoc.data() : {}) };
  console.log(`[bot] Contexto cargado para ${from} — humanMode: ${conversation.humanMode}, status: ${conversation.status}`);
  const replyTo = resolveReplyTo(history, replyToWaMsgId);

  // Auto-reopen archived/resolved conversations when a new message arrives → always goes to bot
  const isArchived = ['resolved', 'bot_archived'].includes(conversation.status)
    || conversation.status === 'urgent'; // legacy urgent status
  if (isArchived) {
    const previousStatus = conversation.status;
    await Promise.all([
      updateConversationStatus(from, 'bot'),
      updateHumanMode(from, false),
      updateAssignment(from, null),
    ]);
    conversation.status = 'bot';
    conversation.humanMode = false;
    conversation.assignedTo = null;
    console.log(`[bot] Conversación ${from} reabierta automáticamente desde '${previousStatus}'`);
  }

  if (conversation.humanMode) {
    const SAVEABLE_MEDIA = { image: true, audio: true, video: true, document: true, sticker: true };
    if (SAVEABLE_MEDIA[type]) {
      const contentMap = {
        image:    text?.trim() ? `[Imagen] ${text}` : '[Imagen recibida]',
        audio:    '[Audio recibido]',
        video:    '[Video recibido]',
        document: msg.fileName ? `[Archivo: ${msg.fileName}]` : '[Archivo recibido]',
        sticker:  '[Sticker]',
      };
      const caption = type !== 'image' && text?.trim() ? ` ${text.trim()}` : '';
      await appendMessage(from, {
        role: 'user',
        content: contentMap[type] + caption,
        mediaType: type,
        ...mediaFields,
        contactName,
        messageId,
        ...(replyTo && { replyTo }),
      });
    } else if (text?.trim()) {
      await appendMessage(from, { role: 'user', content: text, contactName, messageId, ...(replyTo && { replyTo }) });
    }
    console.log(`[bot] humanMode activo para ${from} — bot silenciado`);
    return;
  }

  // --- Non-text type handling ---
  if (type === 'audio') {
    const prevAudios = history.filter(m => m.role === 'user' && m.mediaType === 'audio').length;
    const audioUserMsg = '[Audio recibido]';
    await appendMessage(from, { role: 'user', content: audioUserMsg, mediaType: 'audio', ...mediaFields, contactName, messageId, ...(replyTo && { replyTo }) });

    let reply;
    if (prevAudios >= 1) {
      reply = 'Perdón, los audios no los puedo escuchar. Si preferís, te paso con alguien del equipo.';
      await setUrgentFlag(from, true);
    } else {
      reply = 'Me llegó tu audio, pero no lo puedo escuchar. ¿Me lo escribís así te ayudo?';
    }
    await appendMessage(from, { role: 'assistant', content: reply });
    if (channel === 'whatsapp') await sendWhatsAppMessage(from, reply);
    else if (channel === 'instagram') await sendInstagramMessage(from, reply);
    return;
  }

  // Videos/stickers sin texto: el bot no tiene nada que contestar, pero se
  // guardan igual — antes se descartaban y el agente nunca los veía.
  if ((type === 'video' || type === 'sticker') && !text?.trim()) {
    await appendMessage(from, { role: 'user', content: type === 'video' ? '[Video recibido]' : '[Sticker]', mediaType: type, ...mediaFields, contactName, messageId, ...(replyTo && { replyTo }) });
    return;
  }

  if (type === 'document') {
    const reply = 'Recibí un archivo, pero no puedo procesarlo directamente. ¿Podés contarme por escrito en qué te ayudo?';
    // mediaId se guardaba acá antes — sin él, el archivo (ej: un PDF) quedaba
    // imposible de ver o descargar después desde el panel.
    const docLabel = msg.fileName ? `[Archivo: ${msg.fileName}]` : '[Archivo recibido]';
    await appendMessage(from, { role: 'user', content: text?.trim() ? `${docLabel} ${text.trim()}` : docLabel, mediaType: 'document', ...mediaFields, contactName, messageId, ...(replyTo && { replyTo }) });
    await appendMessage(from, { role: 'assistant', content: reply });
    if (channel === 'whatsapp') await sendWhatsAppMessage(from, reply);
    else if (channel === 'instagram') await sendInstagramMessage(from, reply);
    return;
  }

  // --- Image: download and pass to Claude ---
  let imageData = null;
  if (type === 'image') {
    if (mediaId) {
      imageData = await downloadMediaAsBase64(mediaId).catch(() => null);
    } else if (mediaUrl) {
      try {
        const axios = (await import('axios')).default;
        const { data: buffer } = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
        imageData = { base64: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
      } catch { /* continue without image */ }
    }
    const userContent = text?.trim() ? `[Imagen] ${text}` : '[Imagen recibida]';
    await appendMessage(from, { role: 'user', content: userContent, mediaType: 'image', ...mediaFields, contactName, messageId, ...(replyTo && { replyTo }) });
  } else {
    if (!text?.trim()) return;
    const isMediaWithCaption = type === 'video' || type === 'sticker';
    await appendMessage(from, {
      role: 'user',
      content: isMediaWithCaption ? `[Video] ${text}` : text,
      ...(isMediaWithCaption && { mediaType: type, ...mediaFields }),
      contactName, messageId, ...(replyTo && { replyTo }),
    });
  }

  // Detect urgency keywords and flag (as urgent flag, not status change)
  const isUrgent = text && URGENCY_KEYWORDS.some(re => re.test(text));
  if (isUrgent && !conversation.urgent) {
    setUrgentFlag(from, true).catch(() => {});
  }

  const customerContext = buildCustomerContext(customer);

  console.log(`[bot] Llamando a Claude para ${from}`);
  // Los PDFs se mandan como archivo solo por WhatsApp; en Instagram el bot pasa el contenido.
  const docsEnviables = channel === 'whatsapp' ? documentos : [];
  const docsAEnviar = [];
  const reservasTools = channel === 'whatsapp' ? RESERVAS_TOOLS : RESERVAS_TOOLS.filter(t => !['crear_reserva_mesa', 'crear_pedido_takeaway', 'mis_pedidos_takeaway', 'guardar_cumpleanos'].includes(t.name));
  let botReply;
  try {
    botReply = await generateBotResponse(text ?? '', history, {
      knowledgeBase,
      customerContext,
      availableLabels,
      botConfig,
      imageData,
      areas,
      // Crear reservas solo por WhatsApp: el contacto ES el teléfono de la
      // reserva. En otros canales el bot solo puede consultar disponibilidad.
      tools: docsEnviables.length ? [...reservasTools, documentosTool(docsEnviables)] : reservasTools,
      runTool: (name, input) => name === 'enviar_documento'
        ? runDocumentoTool(input, docsEnviables, docsAEnviar)
        : runReservaTool(name, input, { contactId: from, contactName, channel, botConfig, customer }),
      extraSystem: [reservasPrompt(), documentosPrompt(docsEnviables)].filter(Boolean).join('\n\n'),
    });
  } catch (err) {
    console.error(`[bot] Claude falló definitivamente para ${from} tras reintentos:`, err.message);
    const fallbackMsg = 'Estamos con un poco de demora, ya te contestamos.';
    await appendMessage(from, { role: 'assistant', content: fallbackMsg });
    await setUrgentFlag(from, true).catch(() => {});
    if (channel === 'whatsapp') await sendWhatsAppMessage(from, fallbackMsg).catch(() => {});
    else if (channel === 'instagram') await sendInstagramMessage(from, fallbackMsg).catch(() => {});
    return;
  }
  console.log(`[bot] Claude respondió (${botReply.length} chars) para ${from}`);

  const { shouldEscalate, assignTo, cleanText: textAfterEscalation } = parseEscalationMarker(botReply, areas);
  const { shouldClose, cleanText: textAfterClose } = parseCloseMarker(textAfterEscalation);
  const { labels: botLabels, newLabels: botNewLabels, cleanText: textAfterLabels } = parseLabelMarkers(textAfterClose);
  const cleanText = toWhatsAppBold(textAfterLabels);

  await appendMessage(from, { role: 'assistant', content: cleanText });

  await aplicarEtiquetas(from, [...botLabels, ...botNewLabels], availableLabels, conversation.labels ?? []);

  if (channel === 'whatsapp') {
    if (!cleanText.trim()) {
      console.warn(`[bot] cleanText vacío para ${from} — no se envía a WPP`);
    } else {
      try {
        console.log(`[bot] Enviando WPP a ${from}: ${cleanText.substring(0, 60)}`);
        await sendWhatsAppMessage(from, cleanText);
        console.log(`[bot] WPP enviado OK a ${from}`);
      } catch (sendErr) {
        console.error(`[bot] ERROR enviando WPP a ${from}:`, sendErr.response?.data ?? sendErr.message);
      }
    }
  } else if (channel === 'instagram') {
    if (cleanText.trim()) {
      try {
        await sendInstagramMessage(from, cleanText);
      } catch (sendErr) {
        console.error(`[bot] ERROR enviando IG a ${from}:`, sendErr.response?.data ?? sendErr.message);
      }
    }
  }

  for (const doc of docsAEnviar) await enviarDocumento(from, doc);

  if (shouldEscalate) {
    await dispatchConversation(from, {
      status: 'escalated',
      humanMode: true,
      assignedTo: assignTo ?? null,
    });
    console.log(`[bot] Escalando ${from} → área: ${assignTo ?? 'sin asignar'}`);

    const areaName = areas.find(a => a.id === assignTo)?.name ?? null;
    const escalationMsg = buildEscalationMessage(areaName, botConfig);
    try {
      await appendMessage(from, { role: 'assistant', content: escalationMsg });
      if (channel === 'whatsapp') await sendWhatsAppMessage(from, escalationMsg);
      else if (channel === 'instagram') await sendInstagramMessage(from, escalationMsg);
    } catch (err) {
      console.error('[bot] Error enviando mensaje de escalación:', err.message);
    }
  } else if (shouldClose) {
    await updateConversationStatus(from, 'resolved');
    console.log(`[bot] Conversación ${from} resuelta por el bot`);
  }
}
