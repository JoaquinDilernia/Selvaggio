# Rediseño visual Take Away — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar a la vista de catálogo de Take Away el hero de imagen y el pulido visual de `refe-teake-a-way.html`, descartando las secciones que no aplican, usando la paleta y tipografía reales del sitio.

**Architecture:** Cambios acotados a `src/TakeAway/TakeAway.jsx` (solo la vista `catalogo`, función `TakeAway()`) y `src/TakeAway/TakeAway.css`. Cero cambios de estado, lógica de negocio, o de las otras vistas (`checkout`, `verificación`, `éxito`).

**Tech Stack:** React 19 + CSS plano (sin CSS-in-JS ni Tailwind). Sin framework de testing en el repo — verificación manual con `npm run dev` + revisión visual en el navegador (ideal: comparar contra `refe-teake-a-way.html` abierto en otra pestaña).

## Global Constraints

- No se toca ninguna lógica de estado, Firestore, ni el flujo de checkout/carrito — es un cambio de presentación.
- Tipografía: **Cormorant Garant** (serif de marca) + Inter — nunca Playfair Display.
- Colores: los tokens reales de `TakeAway.css` (crema `#faf7f4`, negro `#1a1614`, texto `#2a2420`, arena `#8a7e76`, terracota `#7c3f2f`) — nunca los hex de la referencia.
- No se agregan las secciones "Por qué existe" ni "Proceso".
- No se agregan tabs de picadas por tamaño (el modelo de datos no tiene ese campo).

Spec de referencia: `docs/superpowers/specs/2026-07-08-takeaway-redesign-design.md`

---

### Task 1: Hero de imagen de fondo

**Files:**
- Modify: `src/TakeAway/TakeAway.jsx:877-888`
- Modify: `src/TakeAway/TakeAway.css:48-53` (regla `.tw-hero`) y agregar reglas nuevas al final del archivo

**Interfaces:** ninguna — cambio de presentación local a la función `TakeAway()`, usa `picadas` y `config`, ya disponibles en ese scope.

- [ ] **Step 1: Actualizar el JSX del hero**

Reemplazar (líneas 877-888):

```jsx
      <div className="tw-hero">
        <span className="tw-hero__eyebrow">Selvaggio · Wine Bar & Delicatessen</span>
        <h1 className="tw-hero__title">Armá tu picada, <em>retirala.</em></h1>
        <p className="tw-hero__sub">Elegí tu picada, personalizá el contenido y pasá a buscarla cuando esté lista.</p>
        <div className="tw-hero__info">
          <span className="tw-hero__info-pill">📍 Retirás en Av. Fondo de la Legua 59, Las Lomas de San Isidro</span>
          {config?.zonasEnvio?.length > 0 && (
            <span className="tw-hero__info-pill tw-hero__info-pill--free">🚚 Envío gratis a zonas seleccionadas</span>
          )}
        </div>
        <Link to="/take-away/seguimiento" className="tw-hero__seguimiento">¿Tenés un pedido? Seguilo →</Link>
      </div>
```

por:

```jsx
      <div
        className="tw-hero tw-hero--img"
        style={picadas[0]?.imagen ? { backgroundImage: `url(${picadas[0].imagen})` } : undefined}
      >
        <div className="tw-hero__overlay" />
        <div className="tw-hero__content">
          <span className="tw-hero__eyebrow">Selvaggio · Wine Bar & Delicatessen</span>
          <h1 className="tw-hero__title">Armá tu picada, <em>retirala.</em></h1>
          <p className="tw-hero__sub">Elegí tu picada, personalizá el contenido y pasá a buscarla cuando esté lista.</p>
          <div className="tw-hero__info">
            <span className="tw-hero__info-pill">📍 Retirás en Av. Fondo de la Legua 59, Las Lomas de San Isidro</span>
            {config?.zonasEnvio?.length > 0 && (
              <span className="tw-hero__info-pill tw-hero__info-pill--free">🚚 Envío gratis a zonas seleccionadas</span>
            )}
          </div>
          <Link to="/take-away/seguimiento" className="tw-hero__seguimiento">¿Tenés un pedido? Seguilo →</Link>
        </div>
      </div>
```

Nota: `picadas[0]` puede no tener `imagen` (o `picadas` estar vacío mientras `cargando` es `true`) — el `style` queda `undefined` en ese caso y el fondo cae al `background: #1a1614` sólido que ya define `.tw-hero`.

- [ ] **Step 2: Agregar `position: relative` y `overflow: hidden` a `.tw-hero`**

Reemplazar (líneas 49-53):

```css
.tw-hero {
  background: #1a1614;
  padding: 52px 24px 44px;
  text-align: center;
}
```

por:

```css
.tw-hero {
  position: relative;
  background: #1a1614;
  padding: 52px 24px 44px;
  text-align: center;
  overflow: hidden;
}
```

- [ ] **Step 3: Agregar las reglas nuevas al final de `TakeAway.css`**

Agregar al final del archivo (después de la línea 1090, `.tw-hero__info-pill--free { ... }`):

```css

/* ── Hero con imagen de fondo ── */
.tw-hero--img {
  min-height: 420px;
  display: flex;
  align-items: flex-end;
  padding: 0;
  background-size: cover;
  background-position: center;
}
.tw-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(13,13,13,0.88) 0%, rgba(13,13,13,0.35) 55%, transparent 100%);
}
.tw-hero__content {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 52px 24px 44px;
}
@media (max-width: 600px) {
  .tw-hero--img { min-height: 340px; }
  .tw-hero__content { padding: 32px 20px 24px; }
}
```

- [ ] **Step 4: Verificar visualmente**

Run: `npm run dev`

En el navegador, ir a `/#/take-away`:
- Si hay picadas cargadas con foto, el hero debe mostrar esa foto de fondo con degradado oscuro abajo y el texto legible encima.
- Si no hay foto (o mientras carga), el hero debe verse como antes (fondo `#1a1614` sólido), sin espacio en blanco ni imagen rota.
- Achicar la ventana a ancho mobile (~375px) y confirmar que el hero no rompe el layout ni corta texto.

- [ ] **Step 5: Commit**

```bash
git add src/TakeAway/TakeAway.jsx src/TakeAway/TakeAway.css
git commit -m "feat: hero de imagen de fondo en Take Away"
```

---

### Task 2: Pulido visual de las cards de picadas

**Files:**
- Modify: `src/TakeAway/TakeAway.jsx:898-903` (bloque de imagen de la card)
- Modify: `src/TakeAway/TakeAway.css:809-812` (`.tw-card__sec-tag`)

**Interfaces:** ninguna — mismo `picadas.map(...)`, sin cambios de datos.

- [ ] **Step 1: Placeholder cuando la picada no tiene foto**

Reemplazar (líneas 898-903):

```jsx
                {picada.imagen && (
                  <div className="tw-card__img-wrap">
                    <img src={picada.imagen} alt={picada.nombre} className="tw-card__img" loading="lazy" />
                  </div>
                )}
```

por:

```jsx
                {picada.imagen ? (
                  <div className="tw-card__img-wrap">
                    <img src={picada.imagen} alt={picada.nombre} className="tw-card__img" loading="lazy" />
                  </div>
                ) : (
                  <div className="tw-card__img-wrap tw-card__img-wrap--placeholder">
                    <span className="tw-card__img-placeholder-label">Foto próximamente</span>
                  </div>
                )}
```

- [ ] **Step 2: CSS del placeholder**

Agregar al final de `TakeAway.css` (mismo bloque que Task 1 Step 3, a continuación):

```css

/* ── Placeholder de foto en cards sin imagen ── */
.tw-card__img-wrap--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}
.tw-card__img-placeholder-label {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #b5aa9e;
}
```

- [ ] **Step 3: Tags de sección — de píldora rellena a contorno**

Reemplazar (líneas 809-812):

```css
.tw-card__sec-tag {
  font-size: 11px; padding: 3px 9px; border-radius: 100px;
  background: #f0ece8; color: #6b5e54; font-weight: 500;
}
```

por:

```css
.tw-card__sec-tag {
  font-size: 11px; padding: 3px 10px; border-radius: 100px;
  background: transparent; border: 1px solid #e0d8d0; color: #7c6f64; font-weight: 500;
}
```

- [ ] **Step 4: Verificar visualmente**

Run: `npm run dev`

En `/#/take-away`: confirmar que las cards con foto se ven igual que antes, que una card sin foto (si existe alguna en los datos de prueba) muestra el placeholder "Foto próximamente" en vez de quedar sin bloque de imagen, y que los tags de sección ahora tienen borde en vez de fondo relleno.

- [ ] **Step 5: Commit**

```bash
git add src/TakeAway/TakeAway.jsx src/TakeAway/TakeAway.css
git commit -m "feat: pulir visual de las cards de picadas en Take Away"
```

---

### Task 3: Sección CTA final

**Files:**
- Modify: `src/TakeAway/TakeAway.jsx:890` (agregar `id` al contenedor del catálogo)
- Modify: `src/TakeAway/TakeAway.jsx:962` (insertar la sección nueva después de "Adicionales")
- Modify: `src/TakeAway/TakeAway.css` (agregar reglas nuevas al final)

**Interfaces:** consume `config` (ya disponible en `TakeAway()`) y `formatDiasAbiertos` (función ya definida en el archivo, línea 535).

- [ ] **Step 1: Agregar `id` al contenedor del catálogo (target del scroll)**

Reemplazar:

```jsx
      <div className="tw-catalog">
```

por:

```jsx
      <div className="tw-catalog" id="tw-catalogo">
```

- [ ] **Step 2: Insertar la sección CTA final después de "Adicionales"**

Ubicar el cierre del bloque de adicionales:

```jsx
        </div>
      )}
      {/* Cart drawer */}
```

Reemplazar por (agrega la sección nueva entre el cierre de adicionales y el comentario del drawer):

```jsx
        </div>
      )}

      {/* CTA final */}
      <div className="tw-cta-final">
        <h2 className="tw-cta-final__title">¿Cuándo es tu <em>próximo momento?</em></h2>
        <p className="tw-cta-final__sub">
          Pedidos {config?.diasAbiertos?.length > 0 ? formatDiasAbiertos(config.diasAbiertos) : 'todos los días'}
          {config?.horarioDesde !== undefined && config?.horarioHasta !== undefined
            ? `, de ${config.horarioDesde} a ${config.horarioHasta} hs.`
            : '.'}
        </p>
        <button
          className="tw-cta-final__btn"
          onClick={() => document.getElementById('tw-catalogo')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Pedir para llevar
        </button>
        <div className="tw-cta-final__info">
          <span>📍 Av. Fondo de la Legua 59, Las Lomas de San Isidro</span>
          <span>📞 +54 9 11 6686-4692</span>
        </div>
      </div>

      {/* Cart drawer */}
```

- [ ] **Step 3: CSS de la sección nueva**

Agregar al final de `TakeAway.css` (mismo bloque que las Tasks anteriores):

```css

/* ── CTA final ── */
.tw-cta-final {
  background: #1a1614;
  padding: 64px 24px;
  text-align: center;
}
.tw-cta-final__title {
  font-family: 'Cormorant Garant', Georgia, serif;
  font-size: clamp(30px, 5vw, 40px);
  font-weight: 500;
  color: #fff;
  line-height: 1.2;
  margin: 0 0 12px;
}
.tw-cta-final__title em { font-style: italic; }
.tw-cta-final__sub {
  color: rgba(255,255,255,0.45);
  font-size: 14px;
  font-weight: 300;
  margin: 0 0 28px;
}
.tw-cta-final__btn {
  background: #faf7f4;
  color: #1a1614;
  border: none;
  border-radius: 100px;
  padding: 13px 32px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s, transform 0.18s;
  margin-bottom: 28px;
}
.tw-cta-final__btn:hover { background: #fff; transform: translateY(-1px); }
.tw-cta-final__info {
  display: flex;
  gap: 22px;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 12px;
  color: rgba(255,255,255,0.3);
}
@media (max-width: 600px) {
  .tw-cta-final { padding: 48px 20px; }
  .tw-cta-final__info { flex-direction: column; gap: 8px; }
}
```

- [ ] **Step 4: Verificar visualmente**

Run: `npm run dev`

En `/#/take-away`: hacer scroll hasta el final de la página, confirmar que aparece la sección CTA (fondo oscuro, título, botón, info de contacto), y que el botón "Pedir para llevar" hace scroll suave de vuelta al catálogo de picadas.

- [ ] **Step 5: Commit**

```bash
git add src/TakeAway/TakeAway.jsx src/TakeAway/TakeAway.css
git commit -m "feat: agregar seccion CTA final a Take Away"
```

---

### Task 4: Verificación end-to-end

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Recorrido visual completo**

Run: `npm run dev`. En el navegador, `/#/take-away`:
1. Hero con imagen de fondo, texto legible, pills de retiro/envío visibles.
2. Grid de picadas con cards prolijas (con foto o placeholder), tags con contorno.
3. Sección "Agregá algo más" sin cambios.
4. Sección CTA final al fondo, botón que scrollea al catálogo.
5. Abrir el carrito, agregar un producto, entrar a checkout: confirmar que **nada** de esto cambió visualmente (fuera de alcance de este plan).

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: sin errores nuevos respecto al estado previo (168 módulos transformando correctamente; cualquier warning de `index.html`/`dist` preexistente es ajeno a este cambio).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: cero errores/warnings nuevos en `src/TakeAway/TakeAway.jsx` o `TakeAway.css` respecto al estado previo al plan (el repo ya tiene errores preexistentes en otros archivos, ajenos a este trabajo).

- [ ] **Step 4: Commit final (si quedó algo sin commitear)**

```bash
git status
```

Si no hay cambios pendientes, no hay nada que commitear — todas las tareas anteriores ya commitearon su propio trabajo.
