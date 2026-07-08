# Tracking Nativo + Dashboard de Funnel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrumentar clicks, vistas, agregados al carrito, inicios de checkout y conversiones con un tracker nativo propio (Firestore), independiente del Meta Pixel, y mostrarlo en un dashboard de funnel dentro del panel de Admin existente.

**Architecture:** Un helper único (`src/utils/nativeAnalytics.js`) escribe documentos "fire and forget" a una colección nueva de Firestore (`selvaggio_analytics_eventos`), llamado desde los mismos puntos donde ya se llama al Meta Pixel. Un `sessionId` anónimo en `localStorage` enlaza los eventos de una misma visita. Una pestaña nueva del Admin (`AnalyticsTab.jsx`) lee esa colección y renderiza un funnel por categoría (Cava / Mesa / Take Away).

**Tech Stack:** React 19, Firebase/Firestore (`firebase/firestore` v9+ modular SDK), React Router v7 (`HashRouter`), Vite. Sin framework de testing en el repo (no hay Jest/Vitest) — la verificación de cada tarea es manual: `npm run dev` + revisión en el navegador (Network tab / console / Firestore).

## Global Constraints

- No se agrega ninguna librería nueva — todo se resuelve con `firebase/firestore` y React, que ya están instalados.
- Los `addDoc` del tracker nunca deben interrumpir la UX: siempre con `.catch(() => {})`, nunca `await` bloqueando una interacción del usuario (excepto donde el código ya usa `await` para los trackers de Meta, en cuyo caso el evento nativo va **antes o después sin bloquear**, ver detalle en cada tarea).
- `sessionId` es un UUID técnico sin ningún dato personal — nunca debe derivarse de nombre/email/teléfono.
- Los nombres de colección/campos son exactamente los definidos en el spec: colección `selvaggio_analytics_eventos`, campos `tipo`, `categoria`, `sessionId`, `pagina`, `valor`, `timestamp`.
- Seguir el estilo del archivo que se edita (comillas simples, sin punto y coma final donde el archivo no los usa, nombres de función en español como el resto del código).

Spec de referencia: `docs/superpowers/specs/2026-07-08-native-analytics-dashboard-design.md`

---

### Task 1: Helper de tracking nativo

**Files:**
- Create: `src/utils/nativeAnalytics.js`

**Interfaces:**
- Produces: `getSessionId(): string`, `trackEvento(tipo: string, categoria: string, valor?: number|null): void` — usados por todas las tareas siguientes.

- [ ] **Step 1: Crear el archivo**

```js
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const SESSION_KEY = 'selvaggio_session_id';

const generarUUID = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// UUID anónimo por navegador — no contiene datos personales
export const getSessionId = () => {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generarUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

// Escritura "fire and forget": nunca interrumpe la UX si falla
export const trackEvento = (tipo, categoria, valor = null) => {
  addDoc(collection(db, 'selvaggio_analytics_eventos'), {
    tipo,
    categoria,
    sessionId: getSessionId(),
    pagina: window.location.pathname,
    valor,
    timestamp: serverTimestamp(),
  }).catch(() => {});
};
```

- [ ] **Step 2: Verificar que no rompe el build**

Run: `npm run lint -- src/utils/nativeAnalytics.js`
Expected: sin errores nuevos (el archivo es nuevo, no debería reportar nada).

- [ ] **Step 3: Commit**

```bash
git add src/utils/nativeAnalytics.js
git commit -m "feat: agregar helper de tracking nativo (Firestore)"
```

---

### Task 2: page_view nativo en cada cambio de ruta

**Files:**
- Modify: `src/App.jsx:1-19`

**Interfaces:**
- Consumes: `trackEvento(tipo, categoria)` de `./utils/nativeAnalytics`.

- [ ] **Step 1: Importar el helper y agregar el mapa de rutas**

En `src/App.jsx`, reemplazar:

```jsx
import { trackPageView } from './utils/metaPixel'
import './theme.css'
import './App.css'

// Dispara PageView en cada navegación (el primero ya lo dispara index.html)
function RouteTracker() {
  const location = useLocation();
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    trackPageView();
  }, [location.pathname]);
  return null;
}
```

por:

```jsx
import { trackPageView } from './utils/metaPixel'
import { trackEvento } from './utils/nativeAnalytics'
import './theme.css'
import './App.css'

const ROUTE_CATEGORIA = {
  '/': 'home',
  '/reserva-cava': 'cava',
  '/reserva-mesas': 'mesa',
  '/take-away': 'takeaway',
};

// Dispara PageView (Meta, el primero ya lo dispara index.html) y page_view
// nativo (propio, sin el sesgo del pixel) en cada navegación
function RouteTracker() {
  const location = useLocation();
  const isFirst = useRef(true);
  useEffect(() => {
    const categoria = ROUTE_CATEGORIA[location.pathname];
    if (categoria) trackEvento('page_view', categoria);
    if (isFirst.current) { isFirst.current = false; return; }
    trackPageView();
  }, [location.pathname]);
  return null;
}
```

- [ ] **Step 2: Verificar manualmente**

Run: `npm run dev`

En el navegador: abrir `/#/`, luego navegar a `/#/reserva-cava`. Abrir DevTools → Network, filtrar por `firestore`, y confirmar que aparece un request de escritura (`Write`/`Commit`) por cada navegación (home al cargar, y de nuevo al entrar a `/reserva-cava`).

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: agregar page_view nativo por cada cambio de ruta"
```

---

### Task 3: Clicks en los CTA de la landing

**Files:**
- Modify: `src/LandingDemo/LandingDemo.jsx` (import + 10 botones/links)

**Interfaces:**
- Consumes: `trackEvento(tipo, categoria)` de `../utils/nativeAnalytics`.

- [ ] **Step 1: Importar el helper y agregar el handler**

Reemplazar el import inicial:

```jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import EventoPopup from '../components/EventoPopup';
import './LandingDemo.css';
```

por:

```jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { trackEvento } from '../utils/nativeAnalytics';
import EventoPopup from '../components/EventoPopup';
import './LandingDemo.css';
```

Dentro de `function LandingDemo() {`, después de la declaración de estados (antes del primer `useEffect`), agregar:

```jsx
  const CTA_EVENTOS = { cava: 'click_reservar_cava', mesa: 'click_reservar_mesa', takeaway: 'click_take_away' };
  const handleCtaClick = (categoria) => trackEvento(CTA_EVENTOS[categoria], categoria);
```

- [ ] **Step 2: Instrumentar los 10 links/botones que llevan a reserva/take away**

Nav (arriba del todo):

```jsx
            <Link to="/take-away" className="ap-btn ap-btn--pill ap-btn--dark" style={{ marginRight: 8 }} onClick={() => handleCtaClick('takeaway')}>
              Take Away
            </Link>
            <Link to="/reserva-mesas" className="ap-btn ap-btn--pill ap-btn--dark" onClick={() => handleCtaClick('mesa')}>
              Reservar
            </Link>
```

Hero:

```jsx
            <Link to="/reserva-mesas" className="ap-btn ap-btn--pill ap-btn--white" onClick={() => handleCtaClick('mesa')}>Reservar mesa</Link>
            <Link to="/reserva-cava" className="ap-btn ap-btn--pill ap-btn--ghost-white" onClick={() => handleCtaClick('cava')}>Reservar La Cava</Link>
            <Link to="/take-away" className="ap-btn ap-btn--pill ap-btn--ghost-white" onClick={() => handleCtaClick('takeaway')}>Pedir para llevar</Link>
```

Sección Cava ("Consultar disponibilidad"):

```jsx
            <Link to="/reserva-cava" className="ap-btn ap-btn--pill ap-btn--white" style={{ marginTop: '2rem', display: 'inline-block' }} onClick={() => handleCtaClick('cava')}>
              Consultar disponibilidad
            </Link>
```

CTA fullwidth:

```jsx
            <Link to="/reserva-mesas" className="ap-btn ap-btn--pill ap-btn--white ap-btn--large" onClick={() => handleCtaClick('mesa')}>Reservar mesa</Link>
            <Link to="/reserva-cava" className="ap-btn ap-btn--pill ap-btn--outline ap-btn--large" onClick={() => handleCtaClick('cava')}>Reservar La Cava</Link>
```

Footer:

```jsx
            <Link to="/reserva-mesas" onClick={() => handleCtaClick('mesa')}>Reservas</Link>
```

Botón sticky:

```jsx
      <Link
        to="/reserva-mesas"
        className={`ap-sticky-reservar${showStickyBtn ? ' ap-sticky-reservar--visible' : ''}`}
        onClick={() => handleCtaClick('mesa')}
      >
        Reservar mesa
      </Link>
```

- [ ] **Step 2: Verificar manualmente**

Run: `npm run dev`

En el navegador, en `/#/`: hacer click en "Reservar mesa" del hero. Confirmar en DevTools → Network (filtro `firestore`) que se disparó una escritura antes de navegar a `/reserva-mesas`. Repetir con "Reservar La Cava" y "Take Away"/"Pedir para llevar".

- [ ] **Step 3: Commit**

```bash
git add src/LandingDemo/LandingDemo.jsx
git commit -m "feat: trackear clicks nativos en los CTA de la landing"
```

---

### Task 4: Eventos nativos en Reserva Cava

**Files:**
- Modify: `src/Reservas/ReservaCava.jsx:8,31,34-40,163`

**Interfaces:**
- Consumes: `trackEvento(tipo, categoria)` de `../utils/nativeAnalytics`.

- [ ] **Step 1: Importar el helper**

```jsx
import { trackSchedule, trackViewContent, trackInitiateCheckout } from '../utils/metaPixel';
import { trackEvento } from '../utils/nativeAnalytics';
```

- [ ] **Step 2: `view_content` junto al `trackViewContent` existente**

Reemplazar:

```jsx
  useEffect(() => { fetchReservedDates(); trackViewContent('Reserva La Cava', 'Reservas'); }, []);
```

por:

```jsx
  useEffect(() => {
    fetchReservedDates();
    trackViewContent('Reserva La Cava', 'Reservas');
    trackEvento('view_content', 'cava');
  }, []);
```

- [ ] **Step 3: `checkout_iniciado` junto al `handleFirstFocus` existente**

Reemplazar:

```jsx
  const checkoutTracked = useRef(false);
  const handleFirstFocus = () => {
    if (!checkoutTracked.current) {
      checkoutTracked.current = true;
      trackInitiateCheckout('cava');
    }
  };
```

por:

```jsx
  const checkoutTracked = useRef(false);
  const handleFirstFocus = () => {
    if (!checkoutTracked.current) {
      checkoutTracked.current = true;
      trackInitiateCheckout('cava');
      trackEvento('checkout_iniciado', 'cava');
    }
  };
```

- [ ] **Step 4: `conversion` junto al `trackSchedule` existente**

Reemplazar:

```jsx
      trackSchedule('cava', formData);
```

por:

```jsx
      trackSchedule('cava', formData);
      trackEvento('conversion', 'cava');
```

- [ ] **Step 5: Verificar manualmente**

Run: `npm run dev`

En `/#/reserva-cava`: confirmar en Network (`firestore`) un write al cargar la página (`view_content`) y otro al hacer foco en el campo "Nombre completo" (`checkout_iniciado`). No hace falta completar una reserva real para validar `conversion` — alcanza con leer el código y confirmar que la llamada está en el mismo bloque que ya guarda la reserva.

- [ ] **Step 6: Commit**

```bash
git add src/Reservas/ReservaCava.jsx
git commit -m "feat: agregar eventos nativos al funnel de Reserva Cava"
```

---

### Task 5: Eventos nativos en Reserva Mesas

**Files:**
- Modify: `src/Reservas/ReservaMesas.jsx:7,34,37-42,149`

**Interfaces:**
- Consumes: `trackEvento(tipo, categoria)` de `../utils/nativeAnalytics`.

- [ ] **Step 1: Importar el helper**

```jsx
import { trackSchedule, trackViewContent, trackInitiateCheckout } from '../utils/metaPixel';
import { trackEvento } from '../utils/nativeAnalytics';
```

- [ ] **Step 2: `view_content`**

Reemplazar:

```jsx
  useEffect(() => { trackViewContent('Reserva Mesa', 'Reservas'); }, []);
```

por:

```jsx
  useEffect(() => {
    trackViewContent('Reserva Mesa', 'Reservas');
    trackEvento('view_content', 'mesa');
  }, []);
```

- [ ] **Step 3: `checkout_iniciado`**

Reemplazar:

```jsx
  const checkoutTracked = useRef(false);
  const handleFirstFocus = () => {
    if (!checkoutTracked.current) {
      checkoutTracked.current = true;
      trackInitiateCheckout('mesa');
    }
  };
```

por:

```jsx
  const checkoutTracked = useRef(false);
  const handleFirstFocus = () => {
    if (!checkoutTracked.current) {
      checkoutTracked.current = true;
      trackInitiateCheckout('mesa');
      trackEvento('checkout_iniciado', 'mesa');
    }
  };
```

- [ ] **Step 4: `conversion`**

Reemplazar:

```jsx
      await trackSchedule('mesa', formData);
```

por:

```jsx
      await trackSchedule('mesa', formData);
      trackEvento('conversion', 'mesa');
```

- [ ] **Step 5: Verificar manualmente**

Run: `npm run dev`

En `/#/reserva-mesas`: confirmar en Network un write al cargar (`view_content`) y otro al hacer foco en "Nombre" (`checkout_iniciado`).

- [ ] **Step 6: Commit**

```bash
git add src/Reservas/ReservaMesas.jsx
git commit -m "feat: agregar eventos nativos al funnel de Reserva Mesa"
```

---

### Task 6: Eventos nativos en Take Away

**Files:**
- Modify: `src/TakeAway/TakeAway.jsx:8,185-190,638,662,777`

**Interfaces:**
- Consumes: `trackEvento(tipo, categoria, valor?)` de `../utils/nativeAnalytics`.

- [ ] **Step 1: Importar el helper**

```jsx
import { trackAddToCart, trackInitiateCheckout, trackTakeAwayPedido, trackViewContent } from '../utils/metaPixel';
import { trackEvento } from '../utils/nativeAnalytics';
```

- [ ] **Step 2: `view_content`**

Reemplazar (línea 638):

```jsx
    trackViewContent('Take Away', 'Take Away');
```

por:

```jsx
    trackViewContent('Take Away', 'Take Away');
    trackEvento('view_content', 'takeaway');
```

- [ ] **Step 3: `add_to_cart`**

Reemplazar (línea 662, dentro de `agregarAlCarrito`):

```jsx
    trackAddToCart(item);
```

por:

```jsx
    trackAddToCart(item);
    trackEvento('add_to_cart', 'takeaway', item.precio);
```

- [ ] **Step 4: `checkout_iniciado`**

Reemplazar (líneas 185-190, dentro de `CheckoutScreen`):

```jsx
  const checkoutTracked = useRef(false);
  const handleFirstFocus = () => {
    if (!checkoutTracked.current) {
      checkoutTracked.current = true;
      trackInitiateCheckout('takeaway');
    }
  };
```

por:

```jsx
  const checkoutTracked = useRef(false);
  const handleFirstFocus = () => {
    if (!checkoutTracked.current) {
      checkoutTracked.current = true;
      trackInitiateCheckout('takeaway');
      trackEvento('checkout_iniciado', 'takeaway');
    }
  };
```

- [ ] **Step 5: `conversion` con el total del pedido**

Reemplazar (línea 777):

```jsx
      await trackTakeAwayPedido(formData.totalFinal, formData);
```

por:

```jsx
      await trackTakeAwayPedido(formData.totalFinal, formData);
      trackEvento('conversion', 'takeaway', formData.totalFinal);
```

- [ ] **Step 6: Verificar manualmente**

Run: `npm run dev`

En `/#/take-away`: confirmar write al cargar (`view_content`), y otro al agregar un producto al carrito (`add_to_cart`). Entrar al checkout y hacer foco en "Nombre": confirmar `checkout_iniciado`.

- [ ] **Step 7: Commit**

```bash
git add src/TakeAway/TakeAway.jsx
git commit -m "feat: agregar eventos nativos al funnel de Take Away"
```

---

### Task 7: Dashboard — pestaña Analytics en el Admin

**Files:**
- Create: `src/Admin/tabs/AnalyticsTab.jsx`
- Create: `src/Admin/tabs/AnalyticsTab.css`
- Modify: `src/Admin/AdminNew.jsx:1-29`

**Interfaces:**
- Consumes: colección Firestore `selvaggio_analytics_eventos` (campos `tipo`, `categoria`, `timestamp`) escrita por las Tasks 2–6.
- Produces: `AnalyticsTab` (componente sin props), registrado como tab `'analytics'` en `AdminNew.jsx`.

- [ ] **Step 1: Crear `AnalyticsTab.css`**

Paleta tomada del resto del Admin (`TabsShared.css`): tinta oscura `#1c1a17`, acento vino `#7a1c1c` (ya usado para links y bordes de acento en el panel), fondo crema `#f7f4ef`. Barra única de un solo color (magnitud de un único paso a la vez, sin comparar series entre sí — no hace falta paleta categórica).

```css
.an-funnels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
.an-funnel {
  background: #fff;
  border: 1px solid rgba(28,26,23,0.1);
  border-radius: 4px;
  padding: 22px 24px;
}
.an-funnel__titulo {
  font-family: 'Cormorant Garant', Georgia, serif;
  font-size: 20px;
  font-weight: 500;
  color: #1c1a17;
  margin: 0 0 18px;
}
.an-funnel__paso { margin-bottom: 16px; }
.an-funnel__paso:last-child { margin-bottom: 0; }
.an-funnel__paso-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.an-funnel__paso-label {
  font-size: 13px;
  color: #6b635a;
}
.an-funnel__paso-valor {
  font-family: 'Cormorant Garant', Georgia, serif;
  font-size: 20px;
  color: #1c1a17;
  font-weight: 500;
}
.an-funnel__barra-track {
  height: 10px;
  background: rgba(28,26,23,0.06);
  border-radius: 0 4px 4px 0;
  overflow: hidden;
}
.an-funnel__barra-fill {
  height: 100%;
  background: #7a1c1c;
  border-radius: 0 4px 4px 0;
  transition: width 0.3s ease;
}
.an-funnel__caida {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #a09890;
}
```

- [ ] **Step 2: Crear `AnalyticsTab.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TabsShared.css';
import './AnalyticsTab.css';

const RANGOS = [
  { id: 'hoy', label: 'Hoy', dias: 0 },
  { id: '7d', label: 'Últimos 7 días', dias: 7 },
  { id: '30d', label: 'Últimos 30 días', dias: 30 },
];

const FUNNELS = {
  cava: {
    titulo: 'La Cava',
    pasos: [
      { tipo: 'click_reservar_cava', label: "Click en 'Reservar La Cava'" },
      { tipo: 'view_content', label: 'Vio la página' },
      { tipo: 'checkout_iniciado', label: 'Inició el formulario' },
      { tipo: 'conversion', label: 'Reserva confirmada' },
    ],
  },
  mesa: {
    titulo: 'Mesa',
    pasos: [
      { tipo: 'click_reservar_mesa', label: "Click en 'Reservar Mesa'" },
      { tipo: 'view_content', label: 'Vio la página' },
      { tipo: 'checkout_iniciado', label: 'Inició el formulario' },
      { tipo: 'conversion', label: 'Reserva confirmada' },
    ],
  },
  takeaway: {
    titulo: 'Take Away',
    pasos: [
      { tipo: 'click_take_away', label: "Click en 'Take Away'" },
      { tipo: 'view_content', label: 'Vio el catálogo' },
      { tipo: 'add_to_cart', label: 'Agregó al carrito' },
      { tipo: 'checkout_iniciado', label: 'Inició el checkout' },
      { tipo: 'conversion', label: 'Pedido confirmado' },
    ],
  },
};

function AnalyticsTab() {
  const [rango, setRango] = useState('7d');
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, [rango]);

  const cargar = async () => {
    setCargando(true);
    try {
      const dias = RANGOS.find(r => r.id === rango).dias;
      const desde = new Date();
      desde.setHours(0, 0, 0, 0);
      desde.setDate(desde.getDate() - dias);
      const q = query(
        collection(db, 'selvaggio_analytics_eventos'),
        where('timestamp', '>=', Timestamp.fromDate(desde))
      );
      const snap = await getDocs(q);
      setEventos(snap.docs.map(d => d.data()));
    } catch (err) {
      console.error('Error cargando analytics:', err);
      setEventos([]);
    } finally {
      setCargando(false);
    }
  };

  const contar = (categoria, tipo) =>
    eventos.filter(e => e.categoria === categoria && e.tipo === tipo).length;

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>Analytics</h2>
        <p>Tráfico y funnel de conversión, medidos de forma nativa e independiente del pixel de Meta.</p>
      </div>

      <div className="filters-bar">
        {RANGOS.map(r => (
          <button
            key={r.id}
            className={`filter-btn${rango === r.id ? ' active' : ''}`}
            onClick={() => setRango(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="loading-state">Cargando…</div>
      ) : (
        <div className="an-funnels">
          {Object.entries(FUNNELS).map(([categoria, { titulo, pasos }]) => {
            const conteos = pasos.map(p => contar(categoria, p.tipo));
            const max = Math.max(1, ...conteos);
            return (
              <div key={categoria} className="an-funnel">
                <h3 className="an-funnel__titulo">{titulo}</h3>
                {pasos.map((paso, i) => {
                  const valor = conteos[i];
                  const anterior = i > 0 ? conteos[i - 1] : null;
                  const caida = anterior ? Math.round(100 - (valor / Math.max(anterior, 1)) * 100) : null;
                  const pct = Math.round((valor / max) * 100);
                  return (
                    <div key={paso.tipo} className="an-funnel__paso">
                      <div className="an-funnel__paso-header">
                        <span className="an-funnel__paso-label">{paso.label}</span>
                        <span className="an-funnel__paso-valor">{valor}</span>
                      </div>
                      <div className="an-funnel__barra-track">
                        <div className="an-funnel__barra-fill" style={{ width: `${pct}%` }} />
                      </div>
                      {caida !== null && (
                        <span className="an-funnel__caida">
                          {caida > 0 ? `−${caida}% vs. paso anterior` : 'sin caída'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AnalyticsTab;
```

- [ ] **Step 3: Registrar el tab en `AdminNew.jsx`**

Reemplazar:

```jsx
import EventosTab from './tabs/EventosTab';
import AdminReservas from './AdminReservas';
import AdminTakeAway from './AdminTakeAway';
```

por:

```jsx
import EventosTab from './tabs/EventosTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import AdminReservas from './AdminReservas';
import AdminTakeAway from './AdminTakeAway';
```

Y reemplazar:

```jsx
  const tabs = [
    { id: 'reservas',      nombre: 'Reservas',      componente: AdminReservas },
    { id: 'takeaway',      nombre: 'Take Away',     componente: AdminTakeAway },
    { id: 'calendario',    nombre: 'Calendario',    componente: CalendarioTab },
    { id: 'eventos',       nombre: 'Eventos',       componente: EventosTab },
```

por:

```jsx
  const tabs = [
    { id: 'reservas',      nombre: 'Reservas',      componente: AdminReservas },
    { id: 'takeaway',      nombre: 'Take Away',     componente: AdminTakeAway },
    { id: 'analytics',     nombre: 'Analytics',     componente: AnalyticsTab },
    { id: 'calendario',    nombre: 'Calendario',    componente: CalendarioTab },
    { id: 'eventos',       nombre: 'Eventos',       componente: EventosTab },
```

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`

Ir a `/#/admin`, loguearse, click en la pestaña "Analytics". Confirmar:
- Se ve un panel por cada categoría (La Cava, Mesa, Take Away) con sus pasos.
- Los botones de rango (Hoy / 7 días / 30 días) cambian los números al hacer click.
- Si ya se generaron eventos navegando el sitio en las tareas anteriores, los conteos reflejan esa actividad.

- [ ] **Step 5: Commit**

```bash
git add src/Admin/tabs/AnalyticsTab.jsx src/Admin/tabs/AnalyticsTab.css src/Admin/AdminNew.jsx
git commit -m "feat: agregar dashboard de funnel nativo al panel de Admin"
```

---

### Task 8: Verificación end-to-end y nota de reglas de Firestore

**Files:** ninguno (solo verificación manual + una acción fuera del repo)

- [ ] **Step 1: Recorrido completo en local**

Run: `npm run dev`. En el navegador:
1. Entrar a `/#/`, click en "Reservar mesa" (hero).
2. En `/#/reserva-mesas`, hacer foco en "Nombre" y completar+enviar el formulario con datos de prueba hasta ver la confirmación.
3. Volver a `/#/`, click en "Take Away", agregar un producto al carrito, entrar al checkout y hacer foco en "Nombre".
4. Ir a `/#/admin` → pestaña "Analytics" → rango "Hoy". Confirmar que "Mesa" muestra al menos 1 en `click_reservar_mesa`, `view_content`, `checkout_iniciado` y `conversion`, y que "Take Away" muestra al menos 1 en `click_take_away`, `view_content`, `add_to_cart` y `checkout_iniciado`.

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: sin errores nuevos respecto al estado previo (los módulos deben transformar correctamente; cualquier warning de `index.html`/`dist` preexistente es ajeno a este cambio).

- [ ] **Step 3: Nota manual — reglas de Firestore**

Este repo no versiona `firestore.rules` (se gestionan en la consola de Firebase). Antes de que el tracking funcione en producción, hay que confirmar en la consola de Firebase que la colección `selvaggio_analytics_eventos` permite **escritura pública** (`create`), igual que las colecciones públicas existentes (`selvaggio_reservas_cava`, `selvaggio_reservas_mesas`, `selvaggio_takeaway_pedidos`). No requiere lectura pública — solo el panel de Admin lee, y ya usa el mismo acceso que el resto de las colecciones de Admin. **Esto no se puede hacer desde el repo — es un paso manual en la consola de Firebase.**

- [ ] **Step 4: Commit final (si quedó algo sin commitear)**

```bash
git status
```

Si no hay cambios pendientes, no hay nada que commitear — todas las tareas anteriores ya commitearon su propio trabajo.
