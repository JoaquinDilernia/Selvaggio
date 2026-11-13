# Eventos fijos (semanales) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cargar un evento una vez como "todos los <día>" y que el servidor genere solo los eventos de cada fecha.

**Architecture:** series en `selvaggio_eventos_fijos` (escritas por el panel vía API del server, no Firestore directo: no hay reglas en el repo para la colección nueva). El server materializa docs normales en `selvaggio_eventos` con id `fijo_<serieId>_<fecha>` para hoy→+56 días: al guardar una serie, al arrancar y cada 24 h. Web/bot/calendario/reservas no cambian, salvo la landing que muestra solo la próxima fecha de cada serie.

**Tech Stack:** Node/Express + firebase-admin (server), React + Vite (panel y landing), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-13-eventos-fijos-design.md`

## Global Constraints
- Fechas `YYYY-MM-DD` en hora Argentina (`ahoraAR(now).fecha` de `reservas.service.js`); `diaSemana(fecha)` 0=domingo…6=sábado.
- Horizonte: 56 días desde hoy inclusive.
- Campos copiados de la serie al generado: `titulo, horaInicio, horaFin, descripcion, infoBot, imagen, ctaTexto, ctaLink, visible`. Nunca `esPopup`/`popupImagen` (generados con `esPopup: false`).
- Generado lleva además: `fecha, serieId, generado: true, actualizadoEn`.
- Nunca pisar ni borrar un generado con `editadoManual: true`. Nunca tocar fechas pasadas.
- Textos de UI en español rioplatense.

## Review Focus
- Serie con `hasta` anterior a hoy o `activo: false` → no genera nada y borra generados futuros no editados (test en Task 1).
- Fecha en `excluidas` → no se genera aunque caiga en el día (Task 1).
- Cambiar el día de la serie (viernes→sábado) → borra los viernes futuros no editados y crea sábados (Task 1, `planSerie` con existentes de otro día).
- Generado editado a mano (`editadoManual`) → sobrevive a cambios y a borrar la serie (Task 1).
- Landing: dos series distintas el mismo día se muestran ambas; eventos sueltos sin `serieId` no se agrupan (Task 4).

---

### Task 1: Lógica pura de generación

**Files:**
- Create: `server/src/services/eventosFijos.js`
- Test: `server/src/services/eventosFijos.test.js`

**Interfaces:**
- Produces:
  - `fechasDeSerie(serie, { hoy: string, dias = 56 }) -> string[]` — fechas del `diaSemana` entre `max(hoy, serie.desde)` y `min(hoy+dias-1, serie.hasta)`, sin `serie.excluidas`; `[]` si `serie.activo === false`.
  - `docGenerado(serie, fecha) -> object` — campos de Global Constraints.
  - `idGenerado(serieId, fecha) -> string` = `` `fijo_${serieId}_${fecha}` ``.
  - `planSerie(serie, existentes: Array<{id, fecha, editadoManual?}>, { hoy, dias = 56, sueltos = [] }) -> { upserts: Array<{id, data}>, borrar: string[] }` — existentes = generados de esa serie con `fecha >= hoy`; sueltos = eventos sin `serieId` (`{fecha, titulo}`). Upsert por cada fecha de `fechasDeSerie` salvo los `editadoManual` y salvo fechas donde haya un suelto con el mismo título normalizado (minúsculas, sin acentos ni espacios extra) — evita duplicar los cargados a mano; borrar los existentes no editados cuya fecha no quedó en la lista.

- [ ] **Step 1: tests** (`hoy = '2026-11-13'`, viernes; serie `{ id:'s1', diaSemana:5, desde:'2026-11-01', titulo:'Pintura y Vino', horaInicio:'19:00', horaFin:'02:00', visible:true }`)
  - `fechasDeSerie(serie,{hoy})` → `['2026-11-13','2026-11-20','2026-11-27','2026-12-04','2026-12-11','2026-12-18','2026-12-25','2027-01-01']`
  - con `hasta:'2026-11-27'` → 3 fechas; con `excluidas:['2026-11-20']` → sin esa; con `activo:false` → `[]`; con `desde:'2026-11-20'` → arranca en 20/11.
  - `docGenerado` no tiene `esPopup:true`, tiene `serieId:'s1'`, `generado:true`, `fecha`.
  - `planSerie` con existente `{id:'fijo_s1_2026-11-13', fecha:'2026-11-13', editadoManual:true}` → no hay upsert con ese id y no está en `borrar`.
  - `planSerie` con serie `diaSemana:6` y existente viernes no editado → ese id en `borrar` y upserts de sábados.
  - `planSerie` con `activo:false` y 2 existentes (1 editado) → `borrar` solo el no editado, `upserts` vacío.
  - `planSerie` con `sueltos:[{fecha:'2026-11-20', titulo:'Pintura y vino '}]` → no hay upsert para 2026-11-20.
- [ ] **Step 2:** `cd server && node --test src/services/eventosFijos.test.js` → FAIL (módulo no existe).
- [ ] **Step 3:** implementar usando `diaSemana` de `reservas.service.js` (sumar días con `Date` UTC a mediodía, como `agenda()`).
- [ ] **Step 4:** mismo comando → PASS.
- [ ] **Step 5:** commit `feat(eventos): lógica de eventos fijos semanales`.

### Task 2: Servicio Firestore + API + job

**Files:**
- Create: `server/src/services/eventosFijos.service.js`, `server/src/routes/eventosFijos.routes.js`
- Modify: `server/src/app.js` (montar router y arrancar job)

**Interfaces:**
- Consumes: Task 1.
- Produces (API, `requireAuth, requireSector('gestion')`, montado en `/api/eventos-fijos`):
  - `GET /` → `{ series: Serie[] }`
  - `POST /` body serie (sin id) → `{ serie }` (crea + sincroniza)
  - `PUT /:id` body campos → `{ serie }` (actualiza + sincroniza)
  - `DELETE /:id` → `{ ok }` (borra serie + generados futuros no editados)
  - `POST /:id/excluir` body `{ fecha }` → agrega a `excluidas` (arrayUnion), borra `fijo_<id>_<fecha>` y responde `{ ok }`
- Service: `sincronizarSerie(id)`, `sincronizarTodas()`, `iniciarJobEventosFijos()` (corre `sincronizarTodas` al arrancar y `setInterval` 24 h; errores solo a `console.error`).
- Validación: `titulo` no vacío, `diaSemana` entero 0–6, `desde` `YYYY-MM-DD` (default hoy), `hasta` vacío o fecha ≥ desde → si no, 400 con mensaje en español.
- Existentes = `selvaggio_eventos.where('serieId','==',id)` filtrado `fecha >= hoy` en memoria (evita índice compuesto). Escrituras con `db.batch()` (≤ 500 ops).

- [ ] **Step 1:** implementar service + rutas + montaje en `app.js` (`completarNombresInstagram` está al lado: mismo patrón en `app.listen`).
- [ ] **Step 2:** `node -e "import('./src/app.js')"` no aplica (levanta server); en su lugar `node --check` de los 3 archivos y `node -e "import('./src/routes/eventosFijos.routes.js').then(()=>console.log('ok'))"` → `ok`.
- [ ] **Step 3:** suite completa `node --test $(ls src/services/*.test.js | grep -v Copia)` → 0 fail.
- [ ] **Step 4:** commit `feat(eventos): API y job de eventos fijos`.

### Task 3: Panel — formulario y lista

**Files:**
- Modify: `panel/src/web/Admin/tabs/EventosTab.jsx`

**Interfaces:**
- Consumes: API de Task 2 vía `authFetch, BASE_URL` de `../../../lib/api`.

- [ ] **Step 1:** en el form, selector "Se repite" (`no` | 0–6 con `NOMBRES_DIA` "Todos los domingos"…). Si se repite: el campo Fecha pasa a llamarse "Desde" y aparece "Hasta (opcional)"; se oculta el bloque de popup. Guardar → `POST`/`PUT /api/eventos-fijos` en vez de Firestore.
- [ ] **Step 2:** sección "🔁 Eventos fijos" arriba de "Próximos": tarjeta con "Todos los viernes · 19:00 – 02:00", Editar (abre el form en modo serie), Eliminar (confirm "Se borran también las próximas fechas generadas").
- [ ] **Step 3:** en próximos, generados (`ev.serieId`) muestran chip "🔁 Fijo". Editar o Mostrar/Ocultar un generado agrega `editadoManual: true` al `updateDoc`. Eliminar un generado → `POST /api/eventos-fijos/:serieId/excluir {fecha}` (no `deleteDoc`).
- [ ] **Step 4:** `cd panel && npx vite build` → build OK.
- [ ] **Step 5:** commit `feat(panel): eventos fijos en Contenido → Eventos`.

### Task 4: Landing — una fecha por serie

**Files:**
- Modify: `src/LandingDemo/LandingDemo.jsx:111-118`

- [ ] **Step 1:** después del filtro/orden, quedarse con el primer evento de cada `serieId` (los sin `serieId` pasan todos).
- [ ] **Step 2:** `npx vite build` en la raíz → OK.
- [ ] **Step 3:** commit `feat(landing): eventos fijos muestran solo la próxima fecha`.

### Task 5: Verificación en prod
- [ ] push; esperar deploy Railway; crear serie "Pintura y Vino" viernes desde el panel (con OK del usuario) o pedir al usuario que la cree; verificar en Firestore que existan `fijo_<id>_2026-11-20…` y que `agenda()` del bot la liste.
