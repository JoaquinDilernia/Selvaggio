const fbq = (...args) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq(...args);
  }
};

// SHA-256 para Advanced Matching — mejora el match rate de Meta
const hashData = async (value) => {
  if (!value) return undefined;
  try {
    const normalized = String(value).toLowerCase().trim();
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
};

// Normaliza teléfonos argentinos al formato E.164 (sin +)
const normalizarTelefono = (tel) => {
  if (!tel) return '';
  let t = tel.replace(/\D/g, '');
  if (t.startsWith('54')) return t;
  if (t.startsWith('0')) t = t.slice(1);
  return '54' + t;
};

// ID único por evento para deduplicación server-side
const genEventId = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ─── Page tracking ───────────────────────────────────────────

// Llamar en cada cambio de ruta (ver RouteTracker en App.jsx)
export const trackPageView = () => fbq('track', 'PageView');

// Cuando el usuario llega a una página importante del funnel
export const trackViewContent = (contentName, contentCategory) =>
  fbq('track', 'ViewContent', {
    content_name: contentName,
    content_category: contentCategory,
  });

// ─── Reservas ────────────────────────────────────────────────

// Click en botón "Reservar" desde la landing
export const trackInitiateCheckout = (tipo) =>
  fbq('track', 'InitiateCheckout', {
    content_name: tipo === 'cava' ? 'Reservar La Cava' : 'Reservar Mesa',
    content_category: 'Reservas',
  });

// Reserva completada con Advanced Matching
export const trackSchedule = async (tipo, userData = {}) => {
  const eventId = genEventId();
  const [em, ph] = await Promise.all([
    hashData(userData.email),
    hashData(normalizarTelefono(userData.telefono)),
  ]);
  fbq('track', 'Schedule', {
    content_name: tipo === 'cava' ? 'Reserva Cava' : 'Reserva Mesa',
    content_category: 'Reservas',
    ...(em && { em }),
    ...(ph && { ph }),
    ...(userData.nombre   && { fn: userData.nombre.toLowerCase().trim() }),
    ...(userData.apellido && { ln: userData.apellido.toLowerCase().trim() }),
  }, { eventID: eventId });
};

// ─── Take Away ───────────────────────────────────────────────

// Usuario llega al formulario de checkout
export const trackTakeAwayInicio = () =>
  fbq('track', 'InitiateCheckout', {
    content_name: 'Checkout Take Away',
    content_category: 'Take Away',
  });

// Pedido confirmado y guardado con Advanced Matching
export const trackTakeAwayPedido = async (total, userData = {}) => {
  const eventId = genEventId();
  const [em, ph] = await Promise.all([
    hashData(userData.email),
    hashData(normalizarTelefono(userData.telefono)),
  ]);
  fbq('track', 'Purchase', {
    value: total,
    currency: 'ARS',
    content_name: 'Pedido Take Away',
    content_category: 'Take Away',
    num_items: 1,
    ...(em && { em }),
    ...(ph && { ph }),
    ...(userData.nombre   && { fn: userData.nombre.toLowerCase().trim() }),
    ...(userData.apellido && { ln: userData.apellido.toLowerCase().trim() }),
  }, { eventID: eventId });
};

// ─── Otros ───────────────────────────────────────────────────

export const trackContact = () => fbq('track', 'Contact');
export const trackLead    = () => fbq('track', 'Lead');
