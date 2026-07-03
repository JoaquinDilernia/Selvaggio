# Take Away: Horario y Días — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar restricción de días de semana y horario al Take Away, configurables desde el admin, con el botón siempre visible en la landing.

**Architecture:** Se extiende el documento Firebase `selvaggio_configuracion/takeaway_config` con tres campos nuevos (`horarioDesde`, `horarioHasta`, `diasAbiertos`). El admin los edita con chips/inputs. La página Take Away los lee y evalúa en cascada antes de mostrar el catálogo. La landing deja de condicionar los botones a `activo`.

**Tech Stack:** React 18, Firebase Firestore, React Router, CSS plain (sin CSS modules)

## Global Constraints

- Siempre usar `setDoc(..., { merge: true })` al guardar en `takeaway_config` para no sobrescribir campos existentes.
- No agregar librerías nuevas.
- Los días se representan como enteros: `0` = domingo, `1` = lunes, …, `6` = sábado.
- Los estilos nuevos van al final del archivo CSS correspondiente.
- No hay suite de tests automáticos — cada tarea incluye pasos de verificación manual en el navegador.

---

### Task 1: Admin — config de horario y días

**Files:**
- Modify: `src/Admin/AdminTakeAway.jsx`
- Modify: `src/Admin/AdminTakeAway.css`

**Interfaces:**
- Produce: campos `horarioDesde: number`, `horarioHasta: number`, `diasAbiertos: number[]` en `selvaggio_configuracion/takeaway_config` (Firestore)
- Consumen: Task 2 (TakeAway.jsx lee estos campos)

- [ ] **Step 1: Agregar estado y cargar config completa**

En la función `AdminTakeAway()`, agregar cuatro estados nuevos debajo de los existentes:

```jsx
const [horarioDesde, setHorarioDesde] = useState(18);
const [horarioHasta, setHorarioHasta] = useState(23);
const [diasAbiertos, setDiasAbiertos] = useState([2, 3, 4, 5, 6]);
const [guardandoConfig, setGuardandoConfig] = useState(false);
```

Reemplazar el `useEffect` existente (que solo leía `activo`) por este que carga todos los campos:

```jsx
useEffect(() => {
  getDoc(doc(db, 'selvaggio_configuracion', 'takeaway_config'))
    .then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setActivo(data.activo !== false);
        if (data.horarioDesde !== undefined) setHorarioDesde(data.horarioDesde);
        if (data.horarioHasta !== undefined) setHorarioHasta(data.horarioHasta);
        if (data.diasAbiertos !== undefined) setDiasAbiertos(data.diasAbiertos);
      } else {
        setActivo(false);
      }
    })
    .catch(() => setActivo(false));
}, []);
```

- [ ] **Step 2: Agregar funciones guardarConfig y toggleDia**

Agregar ambas funciones dentro de `AdminTakeAway()`, antes del `return`:

```jsx
const guardarConfig = async () => {
  setGuardandoConfig(true);
  try {
    await setDoc(
      doc(db, 'selvaggio_configuracion', 'takeaway_config'),
      { horarioDesde, horarioHasta, diasAbiertos },
      { merge: true }
    );
  } catch {}
  finally { setGuardandoConfig(false); }
};

const toggleDia = (idx) => {
  setDiasAbiertos(prev =>
    prev.includes(idx)
      ? prev.filter(d => d !== idx)
      : [...prev, idx].sort((a, b) => a - b)
  );
};
```

- [ ] **Step 3: Actualizar texto del banner de inactivo**

Reemplazar el contenido del banner existente:

```jsx
// ANTES:
El Take Away está desactivado. Los botones no aparecen en la web.

// DESPUÉS:
El Take Away está desactivado. El botón sigue visible en la web pero no se pueden hacer pedidos.
```

- [ ] **Step 4: Agregar UI de configuración en el JSX**

Dentro del `return` de `AdminTakeAway`, después del bloque `{activo === false && <div className="atw__inactive-banner">…</div>}` y antes de `<div className="atw__subtabs">`, insertar:

```jsx
<div className="atw__config">
  <div className="atw__config-row">
    <span className="atw__config-label">Días:</span>
    <div className="atw__dias">
      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => (
        <button
          key={i}
          type="button"
          className={`atw__dia-chip${diasAbiertos.includes(i) ? ' atw__dia-chip--on' : ''}`}
          onClick={() => toggleDia(i)}
        >
          {d}
        </button>
      ))}
    </div>
  </div>
  <div className="atw__config-row">
    <span className="atw__config-label">Horario:</span>
    <span className="atw__config-text">desde</span>
    <input
      type="number" min={0} max={23}
      className="atw__hora-input"
      value={horarioDesde}
      onChange={e => setHorarioDesde(Number(e.target.value))}
    />
    <span className="atw__config-text">hs hasta</span>
    <input
      type="number" min={1} max={24}
      className="atw__hora-input"
      value={horarioHasta}
      onChange={e => setHorarioHasta(Number(e.target.value))}
    />
    <span className="atw__config-text">hs</span>
    <button
      className="atw__save-config-btn"
      onClick={guardarConfig}
      disabled={guardandoConfig}
    >
      {guardandoConfig ? '…' : 'Guardar'}
    </button>
  </div>
</div>
```

- [ ] **Step 5: Agregar estilos en AdminTakeAway.css**

Agregar al final del archivo:

```css
/* ── Config horario y días ── */
.atw__config {
  padding: 12px 20px;
  background: #f9f6f2;
  border-bottom: 1px solid #e8e0d6;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.atw__config-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.atw__config-label {
  font-size: 13px;
  font-weight: 600;
  color: #5c4b3c;
  min-width: 52px;
}

.atw__config-text {
  font-size: 13px;
  color: #7a6a5a;
}

.atw__dias {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.atw__dia-chip {
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid #d4c8ba;
  background: #fff;
  color: #7a6a5a;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.atw__dia-chip--on {
  background: #5c4b3c;
  border-color: #5c4b3c;
  color: #fff;
}

.atw__hora-input {
  width: 52px;
  padding: 4px 8px;
  border: 1px solid #d4c8ba;
  border-radius: 6px;
  font-size: 13px;
  text-align: center;
  background: #fff;
  color: #3c2f24;
}

.atw__save-config-btn {
  padding: 4px 14px;
  border-radius: 6px;
  border: none;
  background: #5c4b3c;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-left: 4px;
}

.atw__save-config-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

- [ ] **Step 6: Verificar en el navegador**

1. Abrir el panel admin → sección Take Away.
2. Verificar que aparecen los chips de días (Dom–Sáb) y los inputs de horario.
3. Clickear chips: deben togglear visualmente (oscuro = abierto, claro = cerrado).
4. Cambiar un valor de hora, hacer click en "Guardar".
5. Recargar la página: los valores deben persistir (vienen de Firebase).
6. Verificar en Firebase Console que `takeaway_config` tiene los nuevos campos sin haber perdido `activo`.

- [ ] **Step 7: Commit**

```bash
git add src/Admin/AdminTakeAway.jsx src/Admin/AdminTakeAway.css
git commit -m "feat: agregar config de horario y días en admin Take Away"
```

---

### Task 2: TakeAway page — pantallas "Cerrado hoy" y "Fuera de horario"

**Files:**
- Modify: `src/TakeAway/TakeAway.jsx`

**Interfaces:**
- Consumes: campos `activo`, `horarioDesde`, `horarioHasta`, `diasAbiertos` de `selvaggio_configuracion/takeaway_config` (escritos en Task 1)
- Produces: experiencia correcta para el usuario final según día/hora

- [ ] **Step 1: Reemplazar estado `takeawayActivo` por `config`**

En la función `TakeAway()`, reemplazar:

```jsx
// ANTES:
const [takeawayActivo, setTakeawayActivo] = useState(null);
```

por:

```jsx
const [config, setConfig] = useState(null);
```

- [ ] **Step 2: Actualizar el fetch de configuración**

Dentro del `useEffect` existente, reemplazar:

```jsx
// ANTES:
getDoc(doc(db, 'selvaggio_configuracion', 'takeaway_config'))
  .then(snap => setTakeawayActivo(snap.exists() ? snap.data().activo === true : false))
  .catch(() => setTakeawayActivo(false));
```

por:

```jsx
getDoc(doc(db, 'selvaggio_configuracion', 'takeaway_config'))
  .then(snap => setConfig(snap.exists() ? snap.data() : { activo: false }))
  .catch(() => setConfig({ activo: false }));
```

- [ ] **Step 3: Agregar funciones helper antes del componente TakeAway**

Agregar estas tres funciones fuera del componente (antes de `function TakeAway()`), junto a `formatPrecio`:

```jsx
const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const formatDiasAbiertos = (dias) => {
  if (!dias || dias.length === 0) return '';
  const nombres = dias.map(d => NOMBRES_DIA[d]);
  if (nombres.length === 1) return nombres[0];
  return nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1];
};

const esDiaAbierto = (diasAbiertos) => {
  if (!diasAbiertos || diasAbiertos.length === 0) return true;
  return diasAbiertos.includes(new Date().getDay());
};

const esDentroDeHorario = (desde, hasta) => {
  const hora = new Date().getHours();
  if (desde !== undefined && hora < desde) return false;
  if (hasta !== undefined && hora >= hasta) return false;
  return true;
};
```

- [ ] **Step 4: Actualizar los early returns**

Localizar el bloque de early returns (sección `// ── Early returns ──`) en `TakeAway()`. Reemplazarlo completamente:

```jsx
// ── Early returns ──
if (config === null) return (
  <div className="tw-page">
    <nav className="tw-nav">
      <Link to="/" className="tw-nav__logo">
        <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
      </Link>
      <span className="tw-nav__title">Take Away</span><span />
    </nav>
  </div>
);

if (config.activo === false) return (
  <div className="tw-page">
    <nav className="tw-nav">
      <Link to="/" className="tw-nav__logo">
        <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
      </Link>
      <span className="tw-nav__title">Take Away</span>
      <Link to="/" className="tw-nav__back">← Inicio</Link>
    </nav>
    <div className="tw-unavailable">
      <div className="tw-unavailable__icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h1 className="tw-unavailable__title">Take Away no disponible</h1>
      <p className="tw-unavailable__sub">Por el momento no estamos recibiendo pedidos online.<br />Podés contactarnos directamente o volver a intentarlo más tarde.</p>
      <Link to="/" className="tw-success__btn">← Volver al inicio</Link>
    </div>
  </div>
);

if (!esDiaAbierto(config.diasAbiertos)) return (
  <div className="tw-page">
    <nav className="tw-nav">
      <Link to="/" className="tw-nav__logo">
        <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
      </Link>
      <span className="tw-nav__title">Take Away</span>
      <Link to="/" className="tw-nav__back">← Inicio</Link>
    </nav>
    <div className="tw-unavailable">
      <div className="tw-unavailable__icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <h1 className="tw-unavailable__title">Cerrado hoy</h1>
      <p className="tw-unavailable__sub">
        Hoy no abrimos para Take Away.
        {config.diasAbiertos?.length > 0 && (
          <><br />Abrimos {formatDiasAbiertos(config.diasAbiertos)}.</>
        )}
      </p>
      <Link to="/" className="tw-success__btn">← Volver al inicio</Link>
    </div>
  </div>
);

if (!esDentroDeHorario(config.horarioDesde, config.horarioHasta)) return (
  <div className="tw-page">
    <nav className="tw-nav">
      <Link to="/" className="tw-nav__logo">
        <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
      </Link>
      <span className="tw-nav__title">Take Away</span>
      <Link to="/" className="tw-nav__back">← Inicio</Link>
    </nav>
    <div className="tw-unavailable">
      <div className="tw-unavailable__icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <h1 className="tw-unavailable__title">Fuera de horario</h1>
      <p className="tw-unavailable__sub">
        {config.horarioDesde !== undefined && config.horarioHasta !== undefined
          ? `Los pedidos están disponibles de ${config.horarioDesde} a ${config.horarioHasta} hs.`
          : config.horarioDesde !== undefined
          ? `Los pedidos están disponibles a partir de las ${config.horarioDesde} hs.`
          : 'Volvé más tarde.'}
      </p>
      <Link to="/" className="tw-success__btn">← Volver al inicio</Link>
    </div>
  </div>
);
```

- [ ] **Step 5: Verificar en el navegador**

Pruebas manuales a realizar (modificar temporalmente `config` hardcodeado o la hora del sistema para simular):

1. Con `activo: false` en Firebase → debe mostrar "Take Away no disponible".
2. Con `diasAbiertos: []` (sin el día actual) → debe mostrar "Cerrado hoy" con lista de días.
3. Con `horarioDesde: 23` (hora futura) → debe mostrar "Fuera de horario" con el rango.
4. Con todo OK → debe mostrar el catálogo normal.

Para testear rápido sin cambiar Firebase: modificar temporalmente `esDiaAbierto` para que retorne `false`, verificar pantalla, revertir.

- [ ] **Step 6: Commit**

```bash
git add src/TakeAway/TakeAway.jsx
git commit -m "feat: agregar pantallas cerrado/fuera de horario en Take Away"
```

---

### Task 3: Landing — botón Take Away siempre visible

**Files:**
- Modify: `src/LandingDemo/LandingDemo.jsx`

**Interfaces:**
- No consume ni produce interfaces de código — es un cambio de presentación puro.

- [ ] **Step 1: Eliminar estado takeawayActivo**

En `LandingDemo()`, eliminar esta línea:

```jsx
const [takeawayActivo, setTakeawayActivo] = useState(false);
```

- [ ] **Step 2: Eliminar el fetch de takeaway_config**

En el `useEffect` principal, eliminar este bloque completo (aprox. líneas 125–128):

```jsx
// Fetch takeaway config
getDoc(doc(db, 'selvaggio_configuracion', 'takeaway_config')).then((snap) => {
  setTakeawayActivo(snap.exists() ? snap.data().activo === true : false);
}).catch(() => {});
```

**Nota:** No eliminar el import de `getDoc` ni `doc` — siguen siendo usados en el fetch de `carta` (aprox. línea 118).

- [ ] **Step 3: Quitar condicionado del botón en la nav**

Localizar el botón de la nav (dentro de `<div className="ap-nav__right">`):

```jsx
// ANTES:
{takeawayActivo && (
  <Link to="/take-away" className="ap-btn ap-btn--pill ap-btn--dark" style={{ marginRight: 8 }}>
    Take Away
  </Link>
)}

// DESPUÉS:
<Link to="/take-away" className="ap-btn ap-btn--pill ap-btn--dark" style={{ marginRight: 8 }}>
  Take Away
</Link>
```

- [ ] **Step 4: Quitar condicionado del botón en el hero**

Localizar el botón del hero (dentro de `<div className="ap-hero__actions">`):

```jsx
// ANTES:
{takeawayActivo && (
  <Link to="/take-away" className="ap-btn ap-btn--pill ap-btn--ghost-white">Pedir para llevar</Link>
)}

// DESPUÉS:
<Link to="/take-away" className="ap-btn ap-btn--pill ap-btn--ghost-white">Pedir para llevar</Link>
```

- [ ] **Step 5: Verificar en el navegador**

1. Abrir la landing (`/`).
2. Verificar que el botón "Take Away" aparece en la nav y el botón "Pedir para llevar" aparece en el hero, independientemente del estado de `activo` en Firebase.
3. Click en "Take Away" → debe llevar a `/take-away` y mostrar la pantalla correcta según día/hora.

- [ ] **Step 6: Commit**

```bash
git add src/LandingDemo/LandingDemo.jsx
git commit -m "feat: mostrar botón Take Away siempre en la landing"
```
