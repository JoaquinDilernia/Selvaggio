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

// Foco en el primer campo del formulario (Cava, Mesa o Take Away)
const INITIATE_CHECKOUT_META = {
  cava: { content_name: 'Reservar La Cava', content_category: 'Reservas' },
  mesa: { content_name: 'Reservar Mesa', content_category: 'Reservas' },
  takeaway: { content_name: 'Checkout Take Away', content_category: 'Take Away' },
};

export const trackInitiateCheckout = (tipo) =>
  fbq('track', 'InitiateCheckout', INITIATE_CHECKOUT_META[tipo] || INITIATE_CHECKOUT_META.mesa);

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

// Producto agregado al carrito
export const trackAddToCart = (item) =>
  fbq('track', 'AddToCart', {
    content_name: item.nombre,
    content_category: 'Take Away',
    value: item.precio,
    currency: 'ARS',
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
