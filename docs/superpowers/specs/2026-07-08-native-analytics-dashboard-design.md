# Tracking nativo + dashboard de funnel

## Contexto y objetivo

Hoy la única medición de tráfico y conversión es el Meta Pixel (ver
[[2026-07-08-meta-pixel-checkout-fix-design]]), que además tenía eventos
rotos. El equipo necesita una fuente propia de datos — independiente de
Meta — para:

- Saber cuánta gente toca cada uno de los 3 botones principales
  (Reservar La Cava, Reservar Mesa, Take Away).
- Ver el funnel completo: click → vio la página → inició checkout →
  completó la reserva/pedido — y así identificar cuántos abandonan y en
  qué paso.
- Tener un dashboard propio para comparar contra lo que reporta el
  administrador de eventos de Meta y detectar divergencias.

No reemplaza al Meta Pixel; es una medición paralela e independiente.

## Identificación de sesión

Para poder unir los eventos de una misma visita sin usar datos
personales, se genera un `sessionId` (UUID v4) la primera vez que alguien
entra al sitio y se guarda en `localStorage` bajo la clave
`selvaggio_session_id`. Se reutiliza en todos los eventos de esa sesión de
navegador. No contiene ni deriva de nombre, email o teléfono.

## Modelo de datos

Colección nueva en Firestore: **`selvaggio_analytics_eventos`**.

Un documento por evento:

```js
{
  tipo: 'page_view' | 'click_reservar_cava' | 'click_reservar_mesa' | 'click_take_away'
      | 'view_content' | 'add_to_cart' | 'checkout_iniciado' | 'conversion',
  categoria: 'home' | 'cava' | 'mesa' | 'takeaway',
  sessionId: string,
  pagina: string,          // path de la ruta, ej: '/reserva-cava'
  valor: number | null,    // solo se completa en 'conversion' (total $ de la reserva/pedido)
  timestamp: Timestamp,    // serverTimestamp()
}
```

Sin subcolecciones ni relaciones — se resuelve todo con queries filtradas
por `tipo`, `categoria` y rango de `timestamp`.

## Helper de tracking

Nuevo archivo `src/utils/nativeAnalytics.js`:

- `getSessionId()`: lee `selvaggio_session_id` de `localStorage`; si no
  existe, genera un UUID y lo guarda.
- `trackEvento(tipo, categoria, valor = null)`: hace `addDoc` a
  `selvaggio_analytics_eventos` con `sessionId`, `pagina` (via
  `window.location.pathname`) y `serverTimestamp()`. Es "fire and
  forget": los errores se atrapan y no interrumpen la UI ni se
  muestran al usuario.

## Puntos de instrumentación

Se agrega una llamada a `trackEvento(...)` junto a cada llamada existente
a Meta Pixel — mismo lugar, mismo trigger, sin lógica de UX nueva:

| Archivo | Trigger existente (Meta) | Evento nativo nuevo |
|---|---|---|
| `App.jsx` (`RouteTracker`) | `trackPageView()` en cada cambio de ruta | `page_view` (categoria según ruta) |
| `LandingDemo.jsx` | — (no instrumentado hoy) | `click_reservar_cava` / `click_reservar_mesa` / `click_take_away` en el `onClick` de cada botón que apunta a esa ruta, sin distinguir de qué sección de la página vino el click |
| `ReservaCava.jsx` | `trackViewContent` / `trackInitiateCheckout('cava')` (agregado en el fix anterior) / `trackSchedule('cava', …)` | `view_content` / `checkout_iniciado` / `conversion` (categoria `cava`, `valor` = null en reservas) |
| `ReservaMesas.jsx` | ídem, tipo `'mesa'` | ídem, categoria `mesa` |
| `TakeAway.jsx` | `trackViewContent` / `trackAddToCart` / `trackInitiateCheckout('takeaway')` / `trackTakeAwayPedido` | `view_content` / `add_to_cart` / `checkout_iniciado` / `conversion` (categoria `takeaway`, `valor` = total del pedido) |

`click_reservar_*` se cuenta por destino agregado (todas las apariciones
del botón en la landing sumadas), sin dimensión de ubicación — decisión
tomada para arrancar simple; se puede sumar después si hace falta.

## Dashboard

Nueva pestaña **"Analytics"** dentro del panel de Admin existente
(`src/Admin/AdminNew.jsx` → nuevo tab, mismo `ProtectedRoute` que ya
protege `/admin`), componente `src/Admin/tabs/AnalyticsTab.jsx`.

- **Filtro de rango de fechas**: hoy / últimos 7 días / últimos 30 días /
  rango personalizado.
- **Funnel por categoría** (Cava, Mesa, Take Away), cada uno mostrando
  los conteos de `click_reservar_*` → `view_content` → `checkout_iniciado`
  → `conversion` para el rango seleccionado, con el % de caída entre cada
  paso consecutivo.
- Construcción visual siguiendo la skill `dataviz` del proyecto para que
  el funnel se lea como un gráfico, no como una tabla de números sueltos.
- Sin exportación ni comparación automática contra Meta en esta primera
  versión — la comparación la hace la persona de pauta a ojo, mirando
  ambos paneles.

## Fuera de alcance

- Dimensión de ubicación del click (nav/hero/sticky) dentro de la
  landing.
- Comparación o importación automática de datos desde Meta Ads/Events
  Manager.
- Retención/purga de eventos viejos (se deja para una iteración futura
  si el volumen lo justifica).
- Rediseño visual de Take Away (proyecto separado,
  [[2026-07-08-meta-pixel-checkout-fix-design]] es el que ya se implementó).
