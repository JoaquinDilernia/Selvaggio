import { lazy, Suspense } from 'react';

// Pantallas de edición que antes vivían en la landing (/#/admin,
// /#/admin-contenidos, /#/caja, /#/cocina). Se cargan perezosas: Firebase y
// estas pantallas solo se bajan al entrar a una de ellas.
const WebPage = lazy(() => import('./WebPage.jsx'));

function pagina(loader, titulo, subtitulo, opts = {}) {
  const Comp = lazy(loader);
  return function Pagina() {
    return (
      <Suspense fallback={null}>
        <WebPage titulo={titulo} subtitulo={subtitulo} fullscreen={opts.fullscreen}>
          <Comp />
        </WebPage>
      </Suspense>
    );
  };
}

// ── Gestión ──────────────────────────────────────────────────────────────
export const Reservas      = pagina(() => import('./Admin/AdminReservas.jsx'), 'Reservas', 'Mesas, La Cava e invitaciones: alta, edición, archivo y borrado.');
export const TakeAway      = pagina(() => import('./Admin/AdminTakeAway.jsx'), 'Take Away', 'Pedidos y catálogo (ingredientes, picadas y adicionales).');
export const Cupones       = pagina(() => import('./Admin/tabs/CuponesTab.jsx'), 'Cupones', 'Cupones de descuento del take away.');
export const Calendario    = pagina(() => import('./Admin/tabs/CalendarioTab.jsx'), 'Calendario', 'Días de apertura, cierres y horarios especiales.');
export const Eventos       = pagina(() => import('./Admin/tabs/EventosTab.jsx'), 'Eventos', 'Agenda y pop-up de la web.');
export const Salon         = pagina(() => import('./Admin/tabs/PedidosTab.jsx'), 'Salón', 'Comandas cargadas en Caja y despachadas por Cocina.');
export const Mensajes      = pagina(() => import('./Admin/tabs/ContactoTab.jsx'), 'Mensajes', 'Formulario de contacto de la web.');
export const Postulaciones = pagina(() => import('./Admin/tabs/PostulacionesTab.jsx'), 'Postulaciones', 'Trabajá con nosotros.');
export const Newsletter    = pagina(() => import('./Admin/tabs/NewsletterTab.jsx'), 'Newsletter', 'Suscriptos desde la web.');
export const Feedback      = pagina(() => import('./Admin/tabs/FeedbackTab.jsx'), 'Feedback', 'Respuestas del formulario de feedback.');
export const Analytics     = pagina(() => import('./Admin/tabs/AnalyticsTab.jsx'), 'Analytics', 'Visitas y conversiones de la web.');

// ── Contenido web ────────────────────────────────────────────────────────
export const Carta         = pagina(() => import('./Admin/AdminCarta.jsx'), 'Carta', 'PDF de la carta que se abre desde la web.');
export const Maridajes     = pagina(() => import('./Admin/AdminMaridajes.jsx'), 'Maridajes', 'Maridajes publicados en la web.');
export const Galeria       = pagina(() => import('./Admin/AdminGaleria.jsx'), 'Galería', 'Fotos de la galería de la web.');
export const Resenas       = pagina(() => import('./Admin/AdminReseñas.jsx'), 'Reseñas', 'Reseñas que muestra la web.');
export const Prensa        = pagina(() => import('./Admin/AdminPrensa.jsx'), 'Prensa', 'Notas de prensa de la web.');
export const ConfigWeb     = pagina(() => import('./Admin/AdminConfiguracion.jsx'), 'Configuración de la web', 'Badges de productos y vinos, y mensaje de WhatsApp de pedido listo.');

// ── Caja y cocina (pantalla completa) ────────────────────────────────────
export const Caja          = pagina(() => import('./Caja/Caja.jsx'), 'Caja', '', { fullscreen: true });
export const Cocina        = pagina(() => import('./Cocina/Cocina.jsx'), 'Cocina', '', { fullscreen: true });
