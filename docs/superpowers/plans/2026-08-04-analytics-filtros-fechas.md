# Analytics: filtros de fecha, comparación de períodos y desglose por día — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar a `AnalyticsTab.jsx` (panel de Admin) un rango de fechas personalizado, comparación contra el período anterior, filtro por categoría y dos gráficos nuevos (por día de semana y evolución diaria), todo calculado en la zona horaria de Argentina en vez de la hora local del navegador.

**Architecture:** `AnalyticsTab.jsx` sigue siendo el orquestador: dueño del estado de filtros (`fechaDesde`, `fechaHasta`, `categoria`) y de una única query a Firestore que trae de una sola vez el período actual + el período anterior equivalente, separando los resultados client-side en `eventosActuales`/`eventosAnteriores`. Un helper nuevo (`src/utils/analyticsDate.js`) centraliza todo el cálculo de fechas en `America/Argentina/Buenos_Aires`. Cuatro componentes nuevos bajo `src/Admin/tabs/analytics/` reciben esos arrays ya cargados y solo renderizan — no hacen fetch propio.

**Tech Stack:** React 19, Firebase/Firestore (`firebase/firestore` v9+ modular SDK), Vite. Sin framework de testing en el repo (no hay Jest/Vitest) — igual que el resto del panel de Admin, la verificación de cada tarea es manual (`npm run dev` + navegador), salvo el helper de fechas puro que se puede verificar con `node` directo.

## Global Constraints

- Alcance: todo el trabajo es dentro de `src/Admin/tabs/AnalyticsTab.jsx` y sus subcomponentes nuevos. **No se toca** `src/utils/nativeAnalytics.js` ni el modelo de datos de `selvaggio_analytics_eventos` — solo lecturas nuevas sobre los eventos existentes.
- Todo el bucketing por día (para "Hoy", el desglose semanal y la evolución diaria) se calcula en `America/Argentina/Buenos_Aires`, nunca con la hora local del navegador.
- Sin librerías nuevas — todo con `firebase/firestore`, React y SVG/CSS a mano (`ResizeObserver` incluido, es una API nativa del navegador).
- Seguir el estilo del archivo que se edita: comillas simples, sin punto y coma final, nombres de función/variable en español, mismo patrón de manejo de errores que ya existe (`try/catch` + `console.error` + estado vacío, nunca se interrumpe el resto del panel).
- Fuera de alcance (no implementar): exportar datos, comparación contra Meta Ads, dimensión de ubicación del click, retención/purga de eventos viejos, filtros combinados adicionales (sessionId, página).
- Colección Firestore existente `selvaggio_analytics_eventos`, campos `tipo`, `categoria`, `sessionId`, `pagina`, `valor`, `timestamp` (Firestore `Timestamp`, con `.toDate()`/`.toMillis()`) — sin cambios de esquema.

Spec de referencia: `docs/superpowers/specs/2026-08-04-analytics-filtros-fechas-design.md`
Spec del feature base (contexto): `docs/superpowers/specs/2026-07-08-native-analytics-dashboard-design.md`

## File Structure

```
src/utils/analyticsDate.js                       — NUEVO — helpers de fecha/TZ Argentina
src/Admin/tabs/AnalyticsTab.jsx                   — MODIFICADO — orquesta estado, fetch, layout
src/Admin/tabs/AnalyticsTab.css                   — MODIFICADO — se extiende con clases nuevas
src/Admin/tabs/analytics/FiltersBar.jsx           — NUEVO — presets + rango custom + categoría
src/Admin/tabs/analytics/FunnelsSection.jsx       — NUEVO — cards de funnel + badge de comparación + filtro categoría
src/Admin/tabs/analytics/DayOfWeekChart.jsx       — NUEVO — barras agrupadas Lun-Dom
src/Admin/tabs/analytics/DailyEvolutionChart.jsx  — NUEVO — línea temporal con crosshair/tooltip
```

`AnalyticsTab.css` es el único stylesheet — es CSS plano (no CSS modules), así que las clases de los 4 componentes nuevos viven todas ahí, igual que lo hace hoy con `.an-funnel*`. Ningún subcomponente importa su propio `.css`.

---

### Task 1: Helpers de fecha en zona horaria Argentina

**Files:**
- Create: `src/utils/analyticsDate.js`

**Interfaces:**
- Produces: `claveDiaAR(timestamp): string` ('YYYY-MM-DD'), `diaSemanaAR(timestamp): number` (0=Lunes…6=Domingo), `inicioDiaAR(date: Date|string): Date`, `finDiaAR(date: Date|string): Date` — usados por todas las tareas siguientes. `timestamp`/`date` aceptan `Date`, Firestore `Timestamp` (objeto con `.toDate()`), o un string `'YYYY-MM-DD'` (solo para `inicioDiaAR`/`finDiaAR`).

- [ ] **Step 1: Crear el archivo**

```js
// Helpers de fecha/hora en la zona horaria del negocio (Argentina), para que
// el corte de "día" nunca dependa de la hora local del navegador que abre
// el panel de Admin.
const TZ = 'America/Argentina/Buenos_Aires';
const DIAS_SEMANA = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // Lunes=0 … Domingo=6

const toDate = (timestamp) => {
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp?.toDate === 'function') return timestamp.toDate();
  return new Date(timestamp);
};

// 'YYYY-MM-DD' del timestamp en TZ Argentina
export const claveDiaAR = (timestamp) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(toDate(timestamp));

// 0-6 (Lunes=0 … Domingo=6) del timestamp en TZ Argentina
export const diaSemanaAR = (timestamp) => {
  const nombre = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(toDate(timestamp));
  return DIAS_SEMANA.indexOf(nombre);
};

// Argentina no tiene horario de verano desde 2009: el offset -03:00 es fijo
// todo el año, así que se puede anclar directo en el string ISO en vez de
// derivarlo dinámicamente.
export const inicioDiaAR = (date) => {
  const clave = typeof date === 'string' ? date : claveDiaAR(date);
  return new Date(`${clave}T00:00:00.000-03:00`);
};

export const finDiaAR = (date) => {
  const clave = typeof date === 'string' ? date : claveDiaAR(date);
  return new Date(`${clave}T23:59:59.999-03:00`);
};
```

- [ ] **Step 2: Verificar con node**

Run:
```bash
node --input-type=module -e "
import { claveDiaAR, diaSemanaAR, inicioDiaAR, finDiaAR } from './src/utils/analyticsDate.js';
console.log(claveDiaAR(new Date('2026-08-04T02:30:00Z')));
console.log(diaSemanaAR(new Date('2026-08-04T12:00:00Z')));
console.log(inicioDiaAR('2026-08-04').toISOString());
console.log(finDiaAR('2026-08-04').toISOString());
"
```

Expected (en ese orden):
```
2026-08-03
1
2026-08-04T03:00:00.000Z
2026-08-05T02:59:59.999Z
```

(02:30 UTC del 4/8 son las 23:30 AR del día 3 → `claveDiaAR` da `2026-08-03`. El 4/8/2026 es martes → `diaSemanaAR` da `1`. La medianoche AR del 4/8 es las 03:00 UTC, y el fin de ese día son las 02:59:59.999 UTC del 5/8.)

- [ ] **Step 3: Lint**

Run: `npm run lint -- src/utils/analyticsDate.js`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/utils/analyticsDate.js
git commit -m "feat: agregar helpers de fecha en zona horaria Argentina para Analytics"
```

---

### Task 2: `AnalyticsTab.jsx` — rango de fechas explícito y comparación vs. período anterior

**Files:**
- Modify: `src/Admin/tabs/AnalyticsTab.jsx` (archivo completo)

**Interfaces:**
- Consumes: `claveDiaAR`, `inicioDiaAR`, `finDiaAR` de `../../utils/analyticsDate`.
- Produces: estado `fechaDesde`/`fechaHasta` (string `'YYYY-MM-DD'`) y dos arrays `eventosActuales`/`eventosAnteriores`, que las Tasks 3-6 van a consumir.

Este paso reemplaza el fetch por días-atrás por un fetch por rango explícito (mismo rango que antes: preset "7 días" = últimos 7 días calendario incluyendo hoy), sin tocar todavía la UI de filtros (siguen los mismos 3 botones) ni el filtro de categoría (llega en la Task 3).

- [ ] **Step 1: Reemplazar el archivo completo**

```jsx
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { claveDiaAR, inicioDiaAR, finDiaAR } from '../../utils/analyticsDate';
import './TabsShared.css';
import './AnalyticsTab.css';

const RANGOS = [
  { id: 'hoy', label: 'Hoy', dias: 1 },
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

const hoyAR = () => claveDiaAR(new Date());

const restarDias = (claveDia, dias) => {
  const d = inicioDiaAR(claveDia);
  d.setUTCDate(d.getUTCDate() - dias);
  return claveDiaAR(d);
};

const RANGO_DEFAULT = RANGOS.find(r => r.id === '7d');

function AnalyticsTab() {
  const [preset, setPreset] = useState('7d');
  const [fechaDesde, setFechaDesde] = useState(() => restarDias(hoyAR(), RANGO_DEFAULT.dias - 1));
  const [fechaHasta, setFechaHasta] = useState(hoyAR);
  const [eventosActuales, setEventosActuales] = useState([]);
  const [eventosAnteriores, setEventosAnteriores] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, [fechaDesde, fechaHasta]);

  const cargar = async () => {
    setCargando(true);
    try {
      const inicioActual = inicioDiaAR(fechaDesde);
      const finActual = finDiaAR(fechaHasta);
      const duracionMs = finActual.getTime() - inicioActual.getTime();
      const inicioAnterior = new Date(inicioActual.getTime() - duracionMs);

      const q = query(
        collection(db, 'selvaggio_analytics_eventos'),
        where('timestamp', '>=', Timestamp.fromDate(inicioAnterior)),
        where('timestamp', '<=', Timestamp.fromDate(finActual))
      );
      const snap = await getDocs(q);
      const todos = snap.docs.map(d => d.data());
      setEventosActuales(todos.filter(e => e.timestamp.toMillis() >= inicioActual.getTime()));
      setEventosAnteriores(todos.filter(e => e.timestamp.toMillis() < inicioActual.getTime()));
    } catch (err) {
      console.error('Error cargando analytics:', err);
      setEventosActuales([]);
      setEventosAnteriores([]);
    } finally {
      setCargando(false);
    }
  };

  const handlePreset = (id) => {
    const r = RANGOS.find(x => x.id === id);
    setPreset(id);
    setFechaHasta(hoyAR());
    setFechaDesde(restarDias(hoyAR(), r.dias - 1));
  };

  const contar = (eventos, categoria, tipo) =>
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
            className={`filter-btn${preset === r.id ? ' active' : ''}`}
            onClick={() => handlePreset(r.id)}
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
            const conteos = pasos.map(p => contar(eventosActuales, categoria, p.tipo));
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

- [ ] **Step 2: Verificar manualmente**

Run: `npm run dev`. Ir a `/#/admin` → pestaña "Analytics". Confirmar que los 3 botones de rango siguen funcionando y los conteos por funnel se ven igual que antes de este cambio. Abrir DevTools → Network → filtro `firestore` y confirmar que la escritura de la query ahora tiene dos condiciones sobre `timestamp` (antes había una sola).

- [ ] **Step 3: Commit**

```bash
git add src/Admin/tabs/AnalyticsTab.jsx
git commit -m "feat: analytics - fetch por rango explicito con periodo anterior para comparacion"
```

---

### Task 3: `FiltersBar` — rango personalizado y selector de categoría

**Files:**
- Create: `src/Admin/tabs/analytics/FiltersBar.jsx`
- Modify: `src/Admin/tabs/AnalyticsTab.jsx` (archivo completo)
- Modify: `src/Admin/tabs/AnalyticsTab.css` (agregar al final)

**Interfaces:**
- Consumes: `claveDiaAR` de `../../../utils/analyticsDate`.
- Produces: `FiltersBar` (props abajo) y `RANGOS` (named export, reusado por `AnalyticsTab.jsx`).
  - Props: `preset: string|null`, `fechaDesde: string`, `fechaHasta: string`, `categoria: string`, `onPreset(id: string)`, `onFechaDesde(valor: string)`, `onFechaHasta(valor: string)`, `onCategoria(id: string)`.

- [ ] **Step 1: Crear `FiltersBar.jsx`**

```jsx
import { claveDiaAR } from '../../../utils/analyticsDate';

export const RANGOS = [
  { id: 'hoy', label: 'Hoy', dias: 1 },
  { id: '7d', label: 'Últimos 7 días', dias: 7 },
  { id: '30d', label: 'Últimos 30 días', dias: 30 },
];

const CATEGORIAS = [
  { id: 'todas', label: 'Todas' },
  { id: 'cava', label: 'La Cava' },
  { id: 'mesa', label: 'Mesa' },
  { id: 'takeaway', label: 'Take Away' },
];

function FiltersBar({ preset, fechaDesde, fechaHasta, categoria, onPreset, onFechaDesde, onFechaHasta, onCategoria }) {
  const hoy = claveDiaAR(new Date());

  return (
    <div className="an-filters">
      <div className="an-filters__presets">
        {RANGOS.map(r => (
          <button
            key={r.id}
            type="button"
            className={`filter-btn${preset === r.id ? ' active' : ''}`}
            onClick={() => onPreset(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="an-filters__custom">
        <label className="an-filters__label">
          Desde
          <input
            type="date"
            className="an-filters__date"
            value={fechaDesde}
            max={fechaHasta}
            onChange={e => onFechaDesde(e.target.value)}
          />
        </label>
        <label className="an-filters__label">
          Hasta
          <input
            type="date"
            className="an-filters__date"
            value={fechaHasta}
            min={fechaDesde}
            max={hoy}
            onChange={e => onFechaHasta(e.target.value)}
          />
        </label>
      </div>

      <div className="an-filters__categoria">
        {CATEGORIAS.map(c => (
          <button
            key={c.id}
            type="button"
            className={`filter-btn${categoria === c.id ? ' active' : ''}`}
            onClick={() => onCategoria(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FiltersBar;
```

- [ ] **Step 2: Agregar CSS de `an-filters` al final de `AnalyticsTab.css`**

```css

.an-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 22px;
}
.an-filters__presets,
.an-filters__categoria {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.an-filters__custom {
  display: flex;
  align-items: center;
  gap: 12px;
}
.an-filters__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #6b635a;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.an-filters__date {
  font-family: inherit;
  font-size: 13px;
  color: #1c1a17;
  padding: 6px 10px;
  border: 1px solid rgba(28,26,23,0.2);
  border-radius: 4px;
  background: #fff;
}
```

- [ ] **Step 3: Reemplazar el archivo completo de `AnalyticsTab.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { claveDiaAR, inicioDiaAR, finDiaAR } from '../../utils/analyticsDate';
import FiltersBar, { RANGOS } from './analytics/FiltersBar';
import './TabsShared.css';
import './AnalyticsTab.css';

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

const hoyAR = () => claveDiaAR(new Date());

const restarDias = (claveDia, dias) => {
  const d = inicioDiaAR(claveDia);
  d.setUTCDate(d.getUTCDate() - dias);
  return claveDiaAR(d);
};

const RANGO_DEFAULT = RANGOS.find(r => r.id === '7d');

function AnalyticsTab() {
  const [preset, setPreset] = useState('7d');
  const [fechaDesde, setFechaDesde] = useState(() => restarDias(hoyAR(), RANGO_DEFAULT.dias - 1));
  const [fechaHasta, setFechaHasta] = useState(hoyAR);
  const [categoria, setCategoria] = useState('todas');
  const [eventosActuales, setEventosActuales] = useState([]);
  const [eventosAnteriores, setEventosAnteriores] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, [fechaDesde, fechaHasta]);

  const cargar = async () => {
    setCargando(true);
    try {
      const inicioActual = inicioDiaAR(fechaDesde);
      const finActual = finDiaAR(fechaHasta);
      const duracionMs = finActual.getTime() - inicioActual.getTime();
      const inicioAnterior = new Date(inicioActual.getTime() - duracionMs);

      const q = query(
        collection(db, 'selvaggio_analytics_eventos'),
        where('timestamp', '>=', Timestamp.fromDate(inicioAnterior)),
        where('timestamp', '<=', Timestamp.fromDate(finActual))
      );
      const snap = await getDocs(q);
      const todos = snap.docs.map(d => d.data());
      setEventosActuales(todos.filter(e => e.timestamp.toMillis() >= inicioActual.getTime()));
      setEventosAnteriores(todos.filter(e => e.timestamp.toMillis() < inicioActual.getTime()));
    } catch (err) {
      console.error('Error cargando analytics:', err);
      setEventosActuales([]);
      setEventosAnteriores([]);
    } finally {
      setCargando(false);
    }
  };

  const handlePreset = (id) => {
    const r = RANGOS.find(x => x.id === id);
    setPreset(id);
    setFechaHasta(hoyAR());
    setFechaDesde(restarDias(hoyAR(), r.dias - 1));
  };

  const handleFechaDesde = (valor) => {
    setPreset(null);
    setFechaDesde(valor);
    if (valor > fechaHasta) setFechaHasta(valor);
  };

  const handleFechaHasta = (valor) => {
    setPreset(null);
    const hoy = hoyAR();
    const clamped = valor > hoy ? hoy : valor;
    setFechaHasta(clamped);
    if (clamped < fechaDesde) setFechaDesde(clamped);
  };

  const contar = (eventos, categoriaFunnel, tipo) =>
    eventos.filter(e => e.categoria === categoriaFunnel && e.tipo === tipo).length;

  const entradasFunnels = categoria === 'todas'
    ? Object.entries(FUNNELS)
    : Object.entries(FUNNELS).filter(([id]) => id === categoria);

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>Analytics</h2>
        <p>Tráfico y funnel de conversión, medidos de forma nativa e independiente del pixel de Meta.</p>
      </div>

      <FiltersBar
        preset={preset}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        categoria={categoria}
        onPreset={handlePreset}
        onFechaDesde={handleFechaDesde}
        onFechaHasta={handleFechaHasta}
        onCategoria={setCategoria}
      />

      {cargando ? (
        <div className="loading-state">Cargando…</div>
      ) : (
        <div className={`an-funnels${categoria !== 'todas' ? ' an-funnels--single' : ''}`}>
          {entradasFunnels.map(([categoriaFunnel, { titulo, pasos }]) => {
            const conteos = pasos.map(p => contar(eventosActuales, categoriaFunnel, p.tipo));
            const max = Math.max(1, ...conteos);
            return (
              <div key={categoriaFunnel} className="an-funnel">
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

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`. En "Analytics": confirmar que aparecen los inputs "Desde"/"Hasta" y los botones de categoría. Tocar "Desde" o "Hasta" desmarca el preset activo. Poner "Hasta" antes que "Desde" y confirmar que se auto-corrige (no queda un rango invertido). Elegir categoría "Mesa" y confirmar que solo se ve el funnel de Mesa, a ancho completo.

- [ ] **Step 5: Commit**

```bash
git add src/Admin/tabs/analytics/FiltersBar.jsx src/Admin/tabs/AnalyticsTab.jsx src/Admin/tabs/AnalyticsTab.css
git commit -m "feat: analytics - filtro de rango personalizado y selector de categoria"
```

---

### Task 4: `FunnelsSection` — extraer funnels y agregar badge de comparación

**Files:**
- Create: `src/Admin/tabs/analytics/FunnelsSection.jsx`
- Modify: `src/Admin/tabs/AnalyticsTab.jsx` (archivo completo)
- Modify: `src/Admin/tabs/AnalyticsTab.css` (agregar al final)

**Interfaces:**
- Produces: `FunnelsSection` (props: `eventosActuales`, `eventosAnteriores`, `categoria`) — componente default. `CLICK_TIPOS` (named export: `{ cava: 'click_reservar_cava', mesa: 'click_reservar_mesa', takeaway: 'click_take_away' }`) — lo consumen las Tasks 5 y 6.

- [ ] **Step 1: Crear `FunnelsSection.jsx`**

```jsx
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

export const CLICK_TIPOS = Object.fromEntries(
  Object.entries(FUNNELS).map(([id, { pasos }]) => [id, pasos[0].tipo])
);

const contar = (eventos, categoria, tipo) =>
  eventos.filter(e => e.categoria === categoria && e.tipo === tipo).length;

// Badge de variación vs. el mismo paso en el período anterior. `null` cuando
// no hay cambio real que mostrar (0 → 0).
const badgeComparacion = (actual, anterior) => {
  if (anterior === 0 && actual === 0) return null;
  if (anterior === 0) return { texto: 'nuevo', positivo: true };
  const variacion = Math.round(((actual - anterior) / anterior) * 100);
  if (variacion === 0) return null;
  const signo = variacion > 0 ? '+' : '−';
  return { texto: `${signo}${Math.abs(variacion)}% vs. anterior`, positivo: variacion > 0 };
};

function FunnelCard({ categoria, titulo, pasos, eventosActuales, eventosAnteriores }) {
  const conteos = pasos.map(p => contar(eventosActuales, categoria, p.tipo));
  const conteosAnteriores = pasos.map(p => contar(eventosAnteriores, categoria, p.tipo));
  const max = Math.max(1, ...conteos);

  return (
    <div className="an-funnel">
      <h3 className="an-funnel__titulo">{titulo}</h3>
      {pasos.map((paso, i) => {
        const valor = conteos[i];
        const anteriorPaso = i > 0 ? conteos[i - 1] : null;
        const caida = anteriorPaso ? Math.round(100 - (valor / Math.max(anteriorPaso, 1)) * 100) : null;
        const pct = Math.round((valor / max) * 100);
        const badge = badgeComparacion(valor, conteosAnteriores[i]);
        return (
          <div key={paso.tipo} className="an-funnel__paso">
            <div className="an-funnel__paso-header">
              <span className="an-funnel__paso-label">{paso.label}</span>
              <span className="an-funnel__paso-valores">
                <span className="an-funnel__paso-valor">{valor}</span>
                {badge && (
                  <span className={`an-badge${badge.positivo ? ' an-badge--pos' : ' an-badge--neg'}`}>
                    {badge.texto}
                  </span>
                )}
              </span>
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
}

function FunnelsSection({ eventosActuales, eventosAnteriores, categoria }) {
  const entradas = categoria === 'todas'
    ? Object.entries(FUNNELS)
    : Object.entries(FUNNELS).filter(([id]) => id === categoria);

  return (
    <div className={`an-funnels${categoria !== 'todas' ? ' an-funnels--single' : ''}`}>
      {entradas.map(([id, { titulo, pasos }]) => (
        <FunnelCard
          key={id}
          categoria={id}
          titulo={titulo}
          pasos={pasos}
          eventosActuales={eventosActuales}
          eventosAnteriores={eventosAnteriores}
        />
      ))}
    </div>
  );
}

export default FunnelsSection;
```

- [ ] **Step 2: Agregar CSS de `an-badge`/`an-funnels--single` al final de `AnalyticsTab.css`**

```css

.an-funnel__paso-valores {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.an-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 10px;
  white-space: nowrap;
}
.an-badge--pos { color: #1a6635; background: rgba(26,102,53,0.1); }
.an-badge--neg { color: #7a1c1c; background: rgba(122,28,28,0.1); }
.an-funnels--single { grid-template-columns: 1fr; }
```

(`#1a6635`/`#7a1c1c` son los mismos colores que ya usa `TabsShared.css` para estados positivos/negativos en otras tabs — `.badge.completado` y `.estado-badge.descartada` — para que el badge de comparación se sienta parte del mismo sistema, no una paleta nueva.)

- [ ] **Step 3: Reemplazar el archivo completo de `AnalyticsTab.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { claveDiaAR, inicioDiaAR, finDiaAR } from '../../utils/analyticsDate';
import FiltersBar, { RANGOS } from './analytics/FiltersBar';
import FunnelsSection from './analytics/FunnelsSection';
import './TabsShared.css';
import './AnalyticsTab.css';

const hoyAR = () => claveDiaAR(new Date());

const restarDias = (claveDia, dias) => {
  const d = inicioDiaAR(claveDia);
  d.setUTCDate(d.getUTCDate() - dias);
  return claveDiaAR(d);
};

const RANGO_DEFAULT = RANGOS.find(r => r.id === '7d');

function AnalyticsTab() {
  const [preset, setPreset] = useState('7d');
  const [fechaDesde, setFechaDesde] = useState(() => restarDias(hoyAR(), RANGO_DEFAULT.dias - 1));
  const [fechaHasta, setFechaHasta] = useState(hoyAR);
  const [categoria, setCategoria] = useState('todas');
  const [eventosActuales, setEventosActuales] = useState([]);
  const [eventosAnteriores, setEventosAnteriores] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, [fechaDesde, fechaHasta]);

  const cargar = async () => {
    setCargando(true);
    try {
      const inicioActual = inicioDiaAR(fechaDesde);
      const finActual = finDiaAR(fechaHasta);
      const duracionMs = finActual.getTime() - inicioActual.getTime();
      const inicioAnterior = new Date(inicioActual.getTime() - duracionMs);

      const q = query(
        collection(db, 'selvaggio_analytics_eventos'),
        where('timestamp', '>=', Timestamp.fromDate(inicioAnterior)),
        where('timestamp', '<=', Timestamp.fromDate(finActual))
      );
      const snap = await getDocs(q);
      const todos = snap.docs.map(d => d.data());
      setEventosActuales(todos.filter(e => e.timestamp.toMillis() >= inicioActual.getTime()));
      setEventosAnteriores(todos.filter(e => e.timestamp.toMillis() < inicioActual.getTime()));
    } catch (err) {
      console.error('Error cargando analytics:', err);
      setEventosActuales([]);
      setEventosAnteriores([]);
    } finally {
      setCargando(false);
    }
  };

  const handlePreset = (id) => {
    const r = RANGOS.find(x => x.id === id);
    setPreset(id);
    setFechaHasta(hoyAR());
    setFechaDesde(restarDias(hoyAR(), r.dias - 1));
  };

  const handleFechaDesde = (valor) => {
    setPreset(null);
    setFechaDesde(valor);
    if (valor > fechaHasta) setFechaHasta(valor);
  };

  const handleFechaHasta = (valor) => {
    setPreset(null);
    const hoy = hoyAR();
    const clamped = valor > hoy ? hoy : valor;
    setFechaHasta(clamped);
    if (clamped < fechaDesde) setFechaDesde(clamped);
  };

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>Analytics</h2>
        <p>Tráfico y funnel de conversión, medidos de forma nativa e independiente del pixel de Meta.</p>
      </div>

      <FiltersBar
        preset={preset}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        categoria={categoria}
        onPreset={handlePreset}
        onFechaDesde={handleFechaDesde}
        onFechaHasta={handleFechaHasta}
        onCategoria={setCategoria}
      />

      {cargando ? (
        <div className="loading-state">Cargando…</div>
      ) : (
        <FunnelsSection
          eventosActuales={eventosActuales}
          eventosAnteriores={eventosAnteriores}
          categoria={categoria}
        />
      )}
    </div>
  );
}

export default AnalyticsTab;
```

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`. En "Analytics": confirmar que los funnels se ven igual que antes, y que ahora cada paso muestra (cuando corresponde) un badge chico `+N%`/`−N%`/`nuevo` junto al valor. Cambiar a un rango donde el período anterior tenga 0 eventos en algún paso y confirmar que ese paso muestra `nuevo` en verde, no un porcentaje.

- [ ] **Step 5: Commit**

```bash
git add src/Admin/tabs/analytics/FunnelsSection.jsx src/Admin/tabs/AnalyticsTab.jsx src/Admin/tabs/AnalyticsTab.css
git commit -m "feat: analytics - extraer FunnelsSection y agregar badge de comparacion vs. periodo anterior"
```

---

### Task 5: `DayOfWeekChart` — barras agrupadas por día de la semana

**Files:**
- Create: `src/Admin/tabs/analytics/DayOfWeekChart.jsx`
- Modify: `src/Admin/tabs/AnalyticsTab.jsx:1-9,68-75` (import + render)
- Modify: `src/Admin/tabs/AnalyticsTab.css` (agregar al final)

**Interfaces:**
- Consumes: `diaSemanaAR` de `../../../utils/analyticsDate`; `CLICK_TIPOS` de `./FunnelsSection`.
- Produces: `DayOfWeekChart` (props: `eventosActuales`, `categoria`) — componente default.

- [ ] **Step 1: Elegir y validar la paleta de 2 colores (Clicks / Conversiones)**

Invocar la skill `dataviz` (herramienta `Skill`, `skill: "dataviz"`) y seguir su fórmula de color + validador de contraste para elegir 2 colores categóricos que se lean bien uno junto al otro sobre fondo blanco (`#fff`, el fondo de `.an-funnel`/las cards nuevas). Fijar **Conversiones = `#7a1c1c`** (el mismo vino que ya usa `.an-funnel__barra-fill` como acento de marca) y usar la skill para elegir/validar el segundo color, **Clicks**, de forma que contraste bien tanto contra el fondo blanco como junto al vino. Si por algún motivo la skill no está disponible en este entorno de ejecución, usar como fallback `#8a6000` (el mismo dorado que ya usa `.estado-badge.pendiente` en `TabsShared.css`), que ya está validado visualmente en el resto del panel.

Con el color final elegido, agregar al **inicio** de `AnalyticsTab.css` (antes de `.an-funnels`):

```css
:root {
  --an-color-clicks: #8a6000;
  --an-color-conversiones: #7a1c1c;
}

```

(Reemplazar `#8a6000` por el color que haya salido de la validación de la skill, si es distinto del fallback.)

- [ ] **Step 2: Crear `DayOfWeekChart.jsx`**

```jsx
import { diaSemanaAR } from '../../../utils/analyticsDate';
import { CLICK_TIPOS } from './FunnelsSection';

const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const esClick = (e, categoria) =>
  categoria === 'todas' ? Object.values(CLICK_TIPOS).includes(e.tipo) : e.tipo === CLICK_TIPOS[categoria];

const esConversion = (e, categoria) =>
  e.tipo === 'conversion' && (categoria === 'todas' || e.categoria === categoria);

function DayOfWeekChart({ eventosActuales, categoria }) {
  const clicks = [0, 0, 0, 0, 0, 0, 0];
  const conversiones = [0, 0, 0, 0, 0, 0, 0];
  eventosActuales.forEach(e => {
    const dia = diaSemanaAR(e.timestamp);
    if (esClick(e, categoria)) clicks[dia]++;
    if (esConversion(e, categoria)) conversiones[dia]++;
  });

  const max = Math.max(1, ...clicks, ...conversiones);

  return (
    <div className="an-dow">
      <h3 className="an-dow__titulo">Por día de la semana</h3>
      <div className="an-dow__leyenda">
        <span className="an-dow__leyenda-item"><i className="an-dow__swatch an-dow__swatch--clicks" /> Clicks</span>
        <span className="an-dow__leyenda-item"><i className="an-dow__swatch an-dow__swatch--conversiones" /> Conversiones</span>
      </div>
      <div className="an-dow__grafico">
        {DIAS_LABEL.map((label, i) => (
          <div key={label} className="an-dow__columna">
            <div className="an-dow__barras">
              <div className="an-dow__barra-wrap">
                <span className="an-dow__valor">{clicks[i]}</span>
                <div className="an-dow__barra an-dow__barra--clicks" style={{ height: `${(clicks[i] / max) * 100}%` }} />
              </div>
              <div className="an-dow__barra-wrap">
                <span className="an-dow__valor">{conversiones[i]}</span>
                <div className="an-dow__barra an-dow__barra--conversiones" style={{ height: `${(conversiones[i] / max) * 100}%` }} />
              </div>
            </div>
            <span className="an-dow__dia">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DayOfWeekChart;
```

- [ ] **Step 3: Agregar CSS de `an-dow` al final de `AnalyticsTab.css`**

```css

.an-dow {
  background: #fff;
  border: 1px solid rgba(28,26,23,0.1);
  border-radius: 4px;
  padding: 22px 24px;
  margin-top: 24px;
}
.an-dow__titulo {
  font-family: 'Cormorant Garant', Georgia, serif;
  font-size: 20px;
  font-weight: 500;
  color: #1c1a17;
  margin: 0 0 12px;
}
.an-dow__leyenda { display: flex; gap: 16px; margin-bottom: 18px; }
.an-dow__leyenda-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b635a; }
.an-dow__swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.an-dow__swatch--clicks { background: var(--an-color-clicks); }
.an-dow__swatch--conversiones { background: var(--an-color-conversiones); }
.an-dow__grafico {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  height: 180px;
}
.an-dow__columna { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; }
.an-dow__barras { display: flex; align-items: flex-end; gap: 4px; flex: 1; width: 100%; justify-content: center; }
.an-dow__barra-wrap { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; width: 18px; }
.an-dow__valor { font-size: 10px; color: #6b635a; margin-bottom: 3px; }
.an-dow__barra { width: 100%; border-radius: 2px 2px 0 0; min-height: 2px; }
.an-dow__barra--clicks { background: var(--an-color-clicks); }
.an-dow__barra--conversiones { background: var(--an-color-conversiones); }
.an-dow__dia { margin-top: 8px; font-size: 12px; color: #6b635a; }
```

- [ ] **Step 4: Importar y renderizar en `AnalyticsTab.jsx`**

Reemplazar:

```jsx
import FunnelsSection from './analytics/FunnelsSection';
```

por:

```jsx
import FunnelsSection from './analytics/FunnelsSection';
import DayOfWeekChart from './analytics/DayOfWeekChart';
```

Y reemplazar:

```jsx
      {cargando ? (
        <div className="loading-state">Cargando…</div>
      ) : (
        <FunnelsSection
          eventosActuales={eventosActuales}
          eventosAnteriores={eventosAnteriores}
          categoria={categoria}
        />
      )}
```

por:

```jsx
      {cargando ? (
        <div className="loading-state">Cargando…</div>
      ) : (
        <>
          <FunnelsSection
            eventosActuales={eventosActuales}
            eventosAnteriores={eventosAnteriores}
            categoria={categoria}
          />
          <DayOfWeekChart eventosActuales={eventosActuales} categoria={categoria} />
        </>
      )}
```

- [ ] **Step 5: Verificar manualmente**

Run: `npm run dev`. En "Analytics": confirmar que debajo de los funnels aparece "Por día de la semana" con 7 columnas (Lun→Dom), 2 barras por día con su valor arriba, y la leyenda Clicks/Conversiones con los colores elegidos en el Step 1. Cambiar la categoría a "Take Away" y confirmar que las barras cambian a reflejar solo esa categoría.

- [ ] **Step 6: Commit**

```bash
git add src/Admin/tabs/analytics/DayOfWeekChart.jsx src/Admin/tabs/AnalyticsTab.jsx src/Admin/tabs/AnalyticsTab.css
git commit -m "feat: analytics - agregar grafico de clicks/conversiones por dia de la semana"
```

---

### Task 6: `DailyEvolutionChart` — línea temporal con crosshair y tooltip

**Files:**
- Create: `src/Admin/tabs/analytics/DailyEvolutionChart.jsx`
- Modify: `src/Admin/tabs/AnalyticsTab.jsx` (import + render)
- Modify: `src/Admin/tabs/AnalyticsTab.css` (agregar al final)

**Interfaces:**
- Consumes: `claveDiaAR`, `inicioDiaAR` de `../../../utils/analyticsDate`; `CLICK_TIPOS` de `./FunnelsSection`.
- Produces: `DailyEvolutionChart` (props: `eventosActuales`, `categoria`, `fechaDesde`, `fechaHasta`) — componente default.

- [ ] **Step 1: Crear `DailyEvolutionChart.jsx`**

El SVG se dibuja con `width`/`height` en píxeles reales (sin `viewBox`), midiendo el ancho del contenedor con `ResizeObserver` — así 1 unidad SVG = 1px de pantalla y las coordenadas del mouse (`clientX - rect.left`) se usan directo, sin conversiones de escala.

```jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { claveDiaAR, inicioDiaAR } from '../../../utils/analyticsDate';
import { CLICK_TIPOS } from './FunnelsSection';

const esClick = (e, categoria) =>
  categoria === 'todas' ? Object.values(CLICK_TIPOS).includes(e.tipo) : e.tipo === CLICK_TIPOS[categoria];

const esConversion = (e, categoria) =>
  e.tipo === 'conversion' && (categoria === 'todas' || e.categoria === categoria);

const ALTO = 200;
const PADDING = { top: 16, right: 16, bottom: 24, left: 16 };
const UN_DIA_MS = 24 * 60 * 60 * 1000;

const construirDias = (fechaDesde, fechaHasta) => {
  const dias = [];
  let cursor = inicioDiaAR(fechaDesde);
  const fin = inicioDiaAR(fechaHasta);
  while (cursor <= fin) {
    dias.push(claveDiaAR(cursor));
    cursor = new Date(cursor.getTime() + UN_DIA_MS);
  }
  return dias;
};

function DailyEvolutionChart({ eventosActuales, categoria, fechaDesde, fechaHasta }) {
  const contenedorRef = useRef(null);
  const [ancho, setAncho] = useState(600);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setAncho(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const dias = useMemo(() => construirDias(fechaDesde, fechaHasta), [fechaDesde, fechaHasta]);

  const { clicks, conversiones } = useMemo(() => {
    const clicksPorDia = Object.fromEntries(dias.map(d => [d, 0]));
    const conversionesPorDia = Object.fromEntries(dias.map(d => [d, 0]));
    eventosActuales.forEach(e => {
      const clave = claveDiaAR(e.timestamp);
      if (!(clave in clicksPorDia)) return;
      if (esClick(e, categoria)) clicksPorDia[clave]++;
      if (esConversion(e, categoria)) conversionesPorDia[clave]++;
    });
    return {
      clicks: dias.map(d => clicksPorDia[d]),
      conversiones: dias.map(d => conversionesPorDia[d]),
    };
  }, [eventosActuales, categoria, dias]);

  const max = Math.max(1, ...clicks, ...conversiones);
  const anchoUtil = Math.max(1, ancho - PADDING.left - PADDING.right);
  const altoUtil = ALTO - PADDING.top - PADDING.bottom;
  const pasoX = dias.length > 1 ? anchoUtil / (dias.length - 1) : 0;

  const x = i => PADDING.left + i * pasoX;
  const y = valor => PADDING.top + altoUtil - (valor / max) * altoUtil;
  const puntos = serie => serie.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const handleMove = e => {
    if (dias.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const posX = e.clientX - rect.left;
    const indice = Math.round((posX - PADDING.left) / (pasoX || 1));
    setHover(Math.min(dias.length - 1, Math.max(0, indice)));
  };

  const gridY = [0, 0.25, 0.5, 0.75, 1].map(f => PADDING.top + altoUtil * f);
  const formatearFecha = clave => clave.split('-').reverse().join('/');

  return (
    <div className="an-evol">
      <h3 className="an-evol__titulo">Evolución diaria</h3>
      <div className="an-evol__leyenda">
        <span className="an-evol__leyenda-item"><i className="an-evol__swatch an-evol__swatch--clicks" /> Clicks</span>
        <span className="an-evol__leyenda-item"><i className="an-evol__swatch an-evol__swatch--conversiones" /> Conversiones</span>
      </div>
      <div
        className="an-evol__contenedor"
        ref={contenedorRef}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg width={ancho} height={ALTO} className="an-evol__svg">
          {gridY.map(gy => (
            <line key={gy} x1={PADDING.left} x2={ancho - PADDING.right} y1={gy} y2={gy} className="an-evol__grid" />
          ))}
          <polyline points={puntos(clicks)} className="an-evol__linea an-evol__linea--clicks" />
          <polyline points={puntos(conversiones)} className="an-evol__linea an-evol__linea--conversiones" />
          {hover !== null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={PADDING.top} y2={ALTO - PADDING.bottom} className="an-evol__crosshair" />
              <circle cx={x(hover)} cy={y(clicks[hover])} r={3.5} className="an-evol__punto an-evol__punto--clicks" />
              <circle cx={x(hover)} cy={y(conversiones[hover])} r={3.5} className="an-evol__punto an-evol__punto--conversiones" />
            </>
          )}
        </svg>
        {hover !== null && (
          <div className="an-evol__tooltip" style={{ left: Math.min(x(hover) + 10, ancho - 130), top: 8 }}>
            <strong>{formatearFecha(dias[hover])}</strong>
            <span>Clicks: {clicks[hover]}</span>
            <span>Conversiones: {conversiones[hover]}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyEvolutionChart;
```

- [ ] **Step 2: Agregar CSS de `an-evol` al final de `AnalyticsTab.css`**

```css

.an-evol {
  background: #fff;
  border: 1px solid rgba(28,26,23,0.1);
  border-radius: 4px;
  padding: 22px 24px;
  margin-top: 24px;
}
.an-evol__titulo {
  font-family: 'Cormorant Garant', Georgia, serif;
  font-size: 20px;
  font-weight: 500;
  color: #1c1a17;
  margin: 0 0 12px;
}
.an-evol__leyenda { display: flex; gap: 16px; margin-bottom: 14px; }
.an-evol__leyenda-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b635a; }
.an-evol__swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.an-evol__swatch--clicks { background: var(--an-color-clicks); }
.an-evol__swatch--conversiones { background: var(--an-color-conversiones); }
.an-evol__contenedor { position: relative; width: 100%; }
.an-evol__svg { display: block; }
.an-evol__grid { stroke: rgba(28,26,23,0.06); stroke-width: 1; }
.an-evol__linea { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.an-evol__linea--clicks { stroke: var(--an-color-clicks); }
.an-evol__linea--conversiones { stroke: var(--an-color-conversiones); }
.an-evol__crosshair { stroke: rgba(28,26,23,0.2); stroke-width: 1; }
.an-evol__punto { stroke: #fff; stroke-width: 1.5; }
.an-evol__punto--clicks { fill: var(--an-color-clicks); }
.an-evol__punto--conversiones { fill: var(--an-color-conversiones); }
.an-evol__tooltip {
  position: absolute;
  background: #1c1a17;
  color: #fff;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.7;
  display: flex;
  flex-direction: column;
  gap: 2px;
  pointer-events: none;
  white-space: nowrap;
}
.an-evol__tooltip strong { font-size: 11px; margin-bottom: 2px; }
```

- [ ] **Step 3: Importar y renderizar en `AnalyticsTab.jsx`**

Reemplazar:

```jsx
import DayOfWeekChart from './analytics/DayOfWeekChart';
```

por:

```jsx
import DayOfWeekChart from './analytics/DayOfWeekChart';
import DailyEvolutionChart from './analytics/DailyEvolutionChart';
```

Y reemplazar:

```jsx
          <DayOfWeekChart eventosActuales={eventosActuales} categoria={categoria} />
        </>
```

por:

```jsx
          <DayOfWeekChart eventosActuales={eventosActuales} categoria={categoria} />
          <DailyEvolutionChart
            eventosActuales={eventosActuales}
            categoria={categoria}
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
          />
        </>
```

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev`. En "Analytics": confirmar que debajo del gráfico semanal aparece "Evolución diaria" con dos líneas. Mover el mouse sobre el gráfico: debe aparecer una línea vertical (crosshair), un punto en cada serie, y un tooltip con la fecha en formato `DD/MM/YYYY` y los valores de Clicks/Conversiones de ese día. Probar en el borde derecho del gráfico y confirmar que el tooltip no se corta fuera de la card. Cambiar a rango "30 días" y confirmar que se ven ~30 puntos por línea sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/Admin/tabs/analytics/DailyEvolutionChart.jsx src/Admin/tabs/AnalyticsTab.jsx src/Admin/tabs/AnalyticsTab.css
git commit -m "feat: analytics - agregar grafico de evolucion diaria con crosshair y tooltip"
```

---

### Task 7: Verificación end-to-end

**Files:** ninguno (solo verificación manual)

- [ ] **Step 1: Recorrido completo en local**

Run: `npm run dev`. En `/#/admin` → "Analytics":

1. Con el preset "Hoy": confirmar que no rompe nada aunque haya pocos o cero eventos (barras en 0%, sin `NaN`, sin división por cero visible en consola).
2. Con "Últimos 30 días": confirmar que el gráfico de evolución diaria muestra ~30 puntos y el tooltip sigue funcionando bien con esa densidad.
3. Poner un rango personalizado (por ejemplo, los últimos 3 días) tocando "Desde"/"Hasta": confirmar que ningún preset queda marcado como activo y que funnels + ambos gráficos recalculan.
4. Cambiar la categoría entre "Todas", "La Cava", "Mesa" y "Take Away": confirmar que el funnel, el gráfico semanal y el de evolución diaria cambian consistentemente entre sí (mismos números totales cuando se filtra a una sola categoría).
5. Confirmar que los badges de comparación (`+N%`, `−N%`, `nuevo`, o ausentes) tienen sentido comparando manualmente un par de valores contra el rango anterior equivalente.

- [ ] **Step 2: Consola sin errores**

Durante el recorrido del Step 1, mantener abierta la consola del navegador. Expected: cero errores o warnings de React (keys, hooks, etc.) o de Firestore.

- [ ] **Step 3: Lint y build**

Run: `npm run lint`
Expected: sin errores nuevos respecto al estado previo al Task 1.

Run: `npm run build`
Expected: build exitoso, sin errores nuevos.

- [ ] **Step 4: Commit final (si quedó algo sin commitear)**

```bash
git status
```

Si no hay cambios pendientes, no hay nada que commitear — todas las tareas anteriores ya commitearon su propio trabajo.

---

## Self-Review

**Cobertura del spec:**
- Zona horaria (`analyticsDate.js`) → Task 1.
- Filtros (presets explícitos, rango personalizado, categoría) → Tasks 2-3.
- Fetch de una sola query cubriendo actual + anterior, split client-side → Task 2.
- Comparación vs. período anterior (badge, casos borde 0/0 y 0/N) → Task 4.
- Filtro de categoría sobre los funnels (single vs. grid) → Tasks 3-4.
- Gráfico "Por día de la semana" → Task 5.
- Gráfico "Evolución diaria" con crosshair/tooltip → Task 6.
- Estructura de componentes final → File Structure + Tasks 1-6.
- Manejo de errores (mismo patrón `try/catch`/`console.error`/estado vacío) → preservado en Task 2, sin cambios en tasks posteriores.
- Fuera de alcance → Global Constraints, explícitamente no implementado.
