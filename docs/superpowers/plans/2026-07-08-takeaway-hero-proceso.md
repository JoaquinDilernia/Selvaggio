# Take Away — hero sólido + sección Proceso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el hero de imagen de fondo de Take Away por un fondo sólido con textura y layout asimétrico (dirección, días/horario y WhatsApp incluidos), y agregar la sección "Proceso" (3 pasos) arriba del CTA final.

**Architecture:** Cambios acotados a `src/TakeAway/TakeAway.jsx` (vista `catalogo`, función `TakeAway()`) y `src/TakeAway/TakeAway.css`. Cero cambios de estado, lógica de negocio, Firestore, o de las otras vistas (`checkout`, `verificación`, `éxito`).

**Tech Stack:** React 19 + CSS plano (sin CSS-in-JS ni Tailwind). Sin framework de testing en el repo — verificación manual con `npm run dev` + revisión visual en el navegador.

## Global Constraints

- No se toca ninguna lógica de estado, Firestore, ni el flujo de checkout/carrito — es un cambio de presentación.
- Tipografía: **Cormorant Garant** (serif de marca) + Inter — nunca Playfair Display.
- Colores: los tokens reales de `TakeAway.css` (crema `#faf7f4`, negro `#1a1614`, texto `#2a2420`, arena `#8a7e76`, terracota `#7c3f2f`) — nunca los hex de la referencia (`refe-teake-a-way.html`).
- El hero no depende de que existan picadas ni fotos cargadas — el fondo es sólido, no una imagen de producto.
- No se agrega la sección "Por qué existe" (sigue descartada). Solo se agrega "Proceso".
- No se agregan tabs de picadas por tamaño (el modelo de datos no tiene ese campo).
- No se agregan datos nuevos a `config` ni a Firestore — el texto de dirección y WhatsApp del hero reutiliza los mismos valores ya hardcodeados en `.tw-cta-final__info`; los días/horario salen de `config.diasAbiertos` / `config.horarioDesde` / `config.horarioHasta`, ya usados en el CTA final.

Spec de referencia: `docs/superpowers/specs/2026-07-08-takeaway-hero-proceso-design.md`

---

### Task 1: Hero — fondo sólido con textura, layout asimétrico

**Files:**
- Modify: `src/TakeAway/TakeAway.jsx:882-899` (bloque del hero)
- Modify: `src/TakeAway/TakeAway.css:49-55` (`.tw-hero`)
- Modify: `src/TakeAway/TakeAway.css:1014` (bloque responsive que pisa el padding de `.tw-hero`)
- Modify: `src/TakeAway/TakeAway.css:1069-1074` (`.tw-hero__info`, `justify-content`)
- Modify: `src/TakeAway/TakeAway.css:1094-1117` (bloque `.tw-hero--img` → `.tw-hero--solid`)

**Interfaces:** ninguna nueva — usa `config` y `formatDiasAbiertos` (función ya definida en `TakeAway.jsx:537`), ambos ya disponibles en el scope de `TakeAway()`. Ya no usa `picadas[0]?.imagen`.

- [ ] **Step 1: Reemplazar el JSX del hero**

Reemplazar el bloque completo:

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

por:

```jsx
      <div className="tw-hero tw-hero--solid">
        <div className="tw-hero__texture" />
        <div className="tw-hero__content">
          <div className="tw-hero__main">
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
          <div className="tw-hero__meta">
            <span className="tw-hero__meta-item">📍 Av. Fondo de la Legua 59, Las Lomas de San Isidro</span>
            {config?.diasAbiertos?.length > 0 && config?.horarioDesde !== undefined && config?.horarioHasta !== undefined && (
              <span className="tw-hero__meta-item">🕐 {formatDiasAbiertos(config.diasAbiertos)} · {config.horarioDesde} a {config.horarioHasta} hs.</span>
            )}
            <span className="tw-hero__meta-item">📞 +54 9 11 6686-4692</span>
          </div>
        </div>
      </div>
```

Nota: `picadas` deja de usarse en el hero — sigue usándose más abajo en el grid de picadas, no se toca esa parte.

- [ ] **Step 2: Simplificar `.tw-hero` base (ya no lleva padding/alineación propios)**

Reemplazar (líneas 49-55):

```css
.tw-hero {
  position: relative;
  background: #1a1614;
  padding: 52px 24px 44px;
  text-align: center;
  overflow: hidden;
}
```

por:

```css
.tw-hero {
  position: relative;
  background: #1a1614;
  overflow: hidden;
}
```

- [ ] **Step 3: Quitar el padding mobile obsoleto de `.tw-hero`**

En el bloque `@media (max-width: 600px)` que empieza en la línea 1013, quitar esta línea (el padding del hero en mobile ahora lo controla `.tw-hero__content`, ver Step 5):

```css
  .tw-hero { padding: 36px 20px 28px; }
```

- [ ] **Step 4: Alinear `.tw-hero__info` a la izquierda**

Reemplazar (líneas 1069-1074):

```css
.tw-hero__info {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 0 0 18px;
}
```

por:

```css
.tw-hero__info {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
  margin: 0 0 18px;
}
```

- [ ] **Step 5: Reemplazar el bloque `.tw-hero--img` por `.tw-hero--solid` + layout de dos columnas**

Reemplazar (líneas 1094-1117):

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

por:

```css
/* ── Hero con fondo sólido y textura ── */
.tw-hero--solid {
  min-height: 420px;
  display: flex;
  align-items: flex-end;
}
.tw-hero__texture {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 14px);
  pointer-events: none;
}
.tw-hero__content {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
  padding: 52px 24px 44px;
}
.tw-hero__main {
  text-align: left;
  max-width: 560px;
}
.tw-hero__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.tw-hero__meta-item {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  white-space: nowrap;
}
@media (max-width: 600px) {
  .tw-hero--solid { min-height: 340px; }
  .tw-hero__content {
    flex-direction: column;
    align-items: flex-start;
    padding: 32px 20px 24px;
  }
  .tw-hero__meta {
    align-items: flex-start;
    margin-top: 20px;
  }
  .tw-hero__meta-item { white-space: normal; }
}
```

- [ ] **Step 6: Verificar visualmente**

Run: `npm run dev`

En el navegador, ir a `/#/take-away`:
- El hero debe mostrar fondo negro sólido con una textura de líneas diagonales muy sutil (no debe leerse como ruido fuerte ni competir con el texto — apenas perceptible).
- Título/bajada/pills/link de seguimiento alineados a la izquierda (ya no centrados).
- Abajo a la derecha, apilados: dirección, días+horario (si `config` los tiene cargados) y WhatsApp.
- Si `config.diasAbiertos` o el horario no están cargados, la línea de días+horario no debe aparecer (no debe quedar un renglón vacío).
- Achicar la ventana a ancho mobile (~375px): el bloque de la derecha debe pasar a apilarse debajo del contenido principal, ambos alineados a la izquierda, sin overflow horizontal.

- [ ] **Step 7: Commit**

```bash
git add src/TakeAway/TakeAway.jsx src/TakeAway/TakeAway.css
git commit -m "feat: hero de fondo solido con textura en Take Away"
```

---

### Task 2: Sección "Proceso" arriba del CTA final

**Files:**
- Modify: `src/TakeAway/TakeAway.jsx:977-980` (entre el cierre de "Adicionales" y el comentario `{/* CTA final */}`)
- Modify: `src/TakeAway/TakeAway.css` (agregar reglas nuevas al final del archivo, después de la línea 1178)

**Interfaces:** ninguna — sección estática, sin datos de `config` ni de Firestore.

- [ ] **Step 1: Insertar la sección "Proceso" entre "Adicionales" y el CTA final**

Ubicar (cierre del bloque condicional de adicionales, seguido del comentario del CTA):

```jsx
        </div>
      )}

      {/* CTA final */}
```

Reemplazar por (agrega la sección nueva, sin tocar nada de "Adicionales" ni del CTA):

```jsx
        </div>
      )}

      {/* Proceso */}
      <div className="tw-proceso">
        <span className="tw-proceso__eyebrow">El proceso</span>
        <h2 className="tw-proceso__title">Así de simple.</h2>
        <div className="tw-proceso__grid">
          <div className="tw-proceso__paso">
            <span className="tw-proceso__num">01</span>
            <h3 className="tw-proceso__paso-title">Elegís tu picada</h3>
            <p className="tw-proceso__paso-desc">Elegís la picada y personalizás cada sección con los ingredientes que más te gusten.</p>
          </div>
          <div className="tw-proceso__paso">
            <span className="tw-proceso__num">02</span>
            <h3 className="tw-proceso__paso-title">Lo armamos</h3>
            <p className="tw-proceso__paso-desc">Preparamos todo en el local: quesos, fiambres y acompañamientos, tal cual la pediste.</p>
          </div>
          <div className="tw-proceso__paso">
            <span className="tw-proceso__num">03</span>
            <h3 className="tw-proceso__paso-title">Retirás y disfrutás</h3>
            <p className="tw-proceso__paso-desc">Pasás por Av. Fondo de la Legua 59, Las Lomas de San Isidro, y lo llevás donde quieras.</p>
          </div>
        </div>
      </div>

      {/* CTA final */}
```

Nota: al ser un `<div>` hermano fuera del `{adicionales.length > 0 && (...)}`, se renderiza siempre — si no hay adicionales, "Proceso" queda directamente después del catálogo de picadas, tal como pide la spec.

- [ ] **Step 2: Agregar el CSS de "Proceso" al final de `TakeAway.css`**

Agregar al final del archivo (después de la última línea, `.tw-cta-final__info { flex-direction: column; gap: 8px; }` dentro del último media query):

```css

/* ── Proceso ── */
.tw-proceso {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 32px 8px;
  border-top: 1.5px solid #ebe5dd;
}
.tw-proceso__eyebrow {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8a7e76;
  margin: 0 0 10px;
  display: block;
}
.tw-proceso__title {
  font-family: 'Cormorant Garant', Georgia, serif;
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 500;
  color: #1a1614;
  line-height: 1.15;
  margin: 0 0 36px;
}
.tw-proceso__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
}
.tw-proceso__paso {
  padding: 0 28px 0 0;
  border-right: 1px solid #ebe5dd;
  margin-right: 28px;
}
.tw-proceso__paso:last-child {
  border-right: none;
  margin-right: 0;
  padding-right: 0;
}
.tw-proceso__num {
  display: block;
  font-family: 'Cormorant Garant', Georgia, serif;
  font-size: 38px;
  color: #1a1614;
  opacity: 0.08;
  line-height: 1;
  margin-bottom: 12px;
}
.tw-proceso__paso-title {
  font-family: 'Cormorant Garant', Georgia, serif;
  font-size: 19px;
  font-weight: 500;
  color: #1a1614;
  margin: 0 0 6px;
}
.tw-proceso__paso-desc {
  font-size: 13px;
  color: #6b5e54;
  line-height: 1.65;
  font-weight: 400;
  margin: 0;
}
@media (max-width: 600px) {
  .tw-proceso { padding: 40px 20px 4px; }
  .tw-proceso__grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .tw-proceso__paso {
    padding: 0;
    border-right: none;
    margin-right: 0;
  }
}
```

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`

En `/#/take-away`, hacer scroll hasta el final:
- Con adicionales cargados: "Proceso" aparece entre "Agregá algo más" y el CTA final oscuro, con fondo crema y una línea divisoria arriba.
- Los 3 pasos se ven en una fila con líneas verticales separándolos (desktop).
- En mobile (~375px): los 3 pasos se apilan en una columna, sin líneas verticales, con espacio entre cada uno.
- Confirmar que no quedó ningún hueco ni superposición entre "Proceso" y el CTA final.

- [ ] **Step 4: Commit**

```bash
git add src/TakeAway/TakeAway.jsx src/TakeAway/TakeAway.css
git commit -m "feat: agregar seccion Proceso arriba del CTA final en Take Away"
```

---

### Task 3: Verificación end-to-end

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Recorrido visual completo**

Run: `npm run dev`. En el navegador, `/#/take-away`:
1. Hero con fondo sólido y textura, layout asimétrico (contenido a la izquierda, meta a la derecha), sin ninguna imagen de fondo.
2. Grid de picadas sin cambios respecto al estado previo.
3. Sección "Agregá algo más" sin cambios.
4. Sección "Proceso" (3 pasos) entre adicionales y el CTA final.
5. Sección CTA final sin cambios.
6. Abrir el carrito, agregar un producto, entrar a checkout: confirmar que **nada** de esto cambió visualmente (fuera de alcance de este plan).
7. Comparar contra `refe-teake-a-way.html` (abrir el archivo directo en el navegador) para chequear que la jerarquía y el tono general del hero y de "Proceso" están alineados con la referencia.

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: sin errores nuevos respecto al estado previo.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: cero errores/warnings nuevos en `src/TakeAway/TakeAway.jsx` o `TakeAway.css` respecto al estado previo al plan.

- [ ] **Step 4: Commit final (si quedó algo sin commitear)**

```bash
git status
```

Si no hay cambios pendientes, no hay nada que commitear — todas las tareas anteriores ya commitearon su propio trabajo.
