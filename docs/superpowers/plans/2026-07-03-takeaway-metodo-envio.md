# Take Away: Método de envío (Retiro en local / Envío Selvaggio) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un método de envío a domicilio ("Envío Selvaggio") al Take Away, limitado a localidades configurables desde el admin, junto al "Retiro en local" existente (con dirección y horario visibles). El envío es siempre gratuito.

**Architecture:** Se extiende `selvaggio_configuracion/takeaway_config` con un array `zonasEnvio` editable desde `AdminTakeAway.jsx`. El checkout de `TakeAway.jsx` agrega un selector de método de envío; si se elige "Envío Selvaggio" pide localidad (limitada a `zonasEnvio`) y dirección. Los pedidos guardan estos campos nuevos en Firestore, se reflejan en el panel de Pedidos y en el email de notificación al local.

**Tech Stack:** React 19, Firebase Firestore, EmailJS, CSS plano (sin CSS modules)

## Global Constraints

- Siempre usar `setDoc(..., { merge: true })` al guardar en `takeaway_config`.
- No agregar librerías ni archivos nuevos.
- El envío es **siempre gratuito** — no se modifica el cálculo de `subtotal`/`descuento`/`total` en ningún punto.
- Si `zonasEnvio` no existe o está vacío en la config, la opción "Envío Selvaggio" no se muestra en el checkout (solo aparece "Retiro en local").
- Los estilos nuevos van al final del archivo CSS correspondiente (`TakeAway.css` / `AdminTakeAway.css`).
- No hay suite de tests automáticos — cada tarea incluye pasos de verificación manual en el navegador.
- La dirección del local (`Av. Fondo de la Legua 59, Las Lomas de San Isidro`) se hardcodea igual que ya está en `Landing.jsx` — no se agrega edición de dirección en el admin.

---

### Task 1: Admin — Zonas de envío configurables

**Files:**
- Modify: `src/Admin/AdminTakeAway.jsx`
- Modify: `src/Admin/AdminTakeAway.css`

**Interfaces:**
- Produce: campo `zonasEnvio: string[]` en `selvaggio_configuracion/takeaway_config` (Firestore)
- Consumen: Task 2 (`CheckoutScreen` lee `config.zonasEnvio`)

- [ ] **Step 1: Agregar constante de zonas por defecto**

En `src/Admin/AdminTakeAway.jsx`, justo antes de `function AdminTakeAway() {` (línea ~951), agregar:

```jsx
const ZONAS_ENVIO_DEFAULT = [
  'Núñez', 'Vicente López', 'Olivos', 'Acassuso', 'Martínez',
  'San Isidro', 'Beccar', 'Victoria', 'San Fernando', 'Tigre', 'Nordelta',
];

```

- [ ] **Step 2: Agregar estado y cargar `zonasEnvio` desde Firestore**

Dentro de `AdminTakeAway()`, reemplazar:

```jsx
  const [diasAbiertos, setDiasAbiertos] = useState([2, 3, 4, 5, 6]);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
```

por:

```jsx
  const [diasAbiertos, setDiasAbiertos] = useState([2, 3, 4, 5, 6]);
  const [zonasEnvio, setZonasEnvio] = useState(ZONAS_ENVIO_DEFAULT);
  const [nuevaZona, setNuevaZona] = useState('');
  const [guardandoConfig, setGuardandoConfig] = useState(false);
```

Luego, dentro del `useEffect` existente, reemplazar:

```jsx
          if (data.diasAbiertos !== undefined) setDiasAbiertos(data.diasAbiertos);
        } else {
```

por:

```jsx
          if (data.diasAbiertos !== undefined) setDiasAbiertos(data.diasAbiertos);
          if (data.zonasEnvio !== undefined) setZonasEnvio(data.zonasEnvio);
        } else {
```

- [ ] **Step 3: Incluir `zonasEnvio` al guardar y agregar funciones de alta/baja**

Reemplazar `guardarConfig`:

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
```

por:

```jsx
  const guardarConfig = async () => {
    setGuardandoConfig(true);
    try {
      await setDoc(
        doc(db, 'selvaggio_configuracion', 'takeaway_config'),
        { horarioDesde, horarioHasta, diasAbiertos, zonasEnvio },
        { merge: true }
      );
    } catch {}
    finally { setGuardandoConfig(false); }
  };

  const agregarZona = () => {
    const nueva = nuevaZona.trim();
    if (!nueva || zonasEnvio.includes(nueva)) return;
    setZonasEnvio(prev => [...prev, nueva]);
    setNuevaZona('');
  };

  const eliminarZona = (zona) => {
    setZonasEnvio(prev => prev.filter(z => z !== zona));
  };
```

- [ ] **Step 4: Agregar UI de zonas de envío en el JSX**

Localizar el segundo `<div className="atw__config-row">` (el del horario), que termina así:

```jsx
          {diasAbiertos.length === 0 && (
            <span className="atw__config-warn">Seleccioná al menos un día</span>
          )}
          <button
            className="atw__save-config-btn"
            onClick={guardarConfig}
            disabled={guardandoConfig || diasAbiertos.length === 0}
          >
            {guardandoConfig ? '…' : 'Guardar'}
          </button>
        </div>
      </div>
```

Reemplazarlo por (agrega dos filas nuevas dentro del mismo `atw__config`, antes de cerrar el `</div>` de `atw__config`):

```jsx
          {diasAbiertos.length === 0 && (
            <span className="atw__config-warn">Seleccioná al menos un día</span>
          )}
          <button
            className="atw__save-config-btn"
            onClick={guardarConfig}
            disabled={guardandoConfig || diasAbiertos.length === 0}
          >
            {guardandoConfig ? '…' : 'Guardar'}
          </button>
        </div>
        <div className="atw__config-row">
          <span className="atw__config-label">Envío:</span>
          <div className="atw__zonas">
            {zonasEnvio.map(zona => (
              <span key={zona} className="atw__zona-chip">
                {zona}
                <button type="button" className="atw__zona-chip__del" onClick={() => eliminarZona(zona)}>✕</button>
              </span>
            ))}
            {zonasEnvio.length === 0 && (
              <span className="atw__config-warn">Sin zonas — "Envío Selvaggio" no se ofrecerá a los clientes</span>
            )}
          </div>
        </div>
        <div className="atw__config-row">
          <span className="atw__config-label" />
          <input
            type="text"
            className="atw__zona-input"
            value={nuevaZona}
            onChange={e => setNuevaZona(e.target.value)}
            placeholder="Agregar localidad…"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarZona())}
          />
          <button type="button" className="atw__zona-add-btn" onClick={agregarZona} disabled={!nuevaZona.trim()}>
            + Agregar
          </button>
          <span className="atw__config-text" style={{ marginLeft: 'auto' }}>
            Recordá presionar "Guardar" arriba para aplicar los cambios de zonas.
          </span>
        </div>
      </div>
```

- [ ] **Step 5: Agregar estilos en `AdminTakeAway.css`**

Agregar al final del archivo:

```css
/* ── Zonas de envío ── */
.atw__zonas {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.atw__zona-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 12px;
  border-radius: 20px;
  background: #f0ece8;
  color: #4a3f38;
  font-size: 12px;
  font-weight: 500;
}

.atw__zona-chip__del {
  background: none;
  border: none;
  color: #8a7e76;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
  border-radius: 50%;
  transition: color 0.15s, background 0.15s;
  font-family: inherit;
}

.atw__zona-chip__del:hover { color: #8b3a2e; background: #fef0ee; }

.atw__zona-input {
  padding: 4px 10px;
  border: 1px solid #d4c8ba;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  color: #3c2f24;
  min-width: 160px;
}

.atw__zona-add-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #d4c8ba;
  background: #fff;
  color: #4a3f38;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.atw__zona-add-btn:hover:not(:disabled) { border-color: #2a2420; color: #2a2420; }
.atw__zona-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 6: Verificar en el navegador**

1. Abrir el panel admin → sección Take Away.
2. Confirmar que aparecen los 11 chips de zonas por defecto (Núñez … Nordelta).
3. Sacar una zona con el "✕" → debe desaparecer del listado (en memoria).
4. Escribir una localidad nueva (ej. "Munro") y click "+ Agregar" → debe aparecer como chip nuevo.
5. Click en "Guardar" (el mismo botón de horario/días) → sin errores.
6. Recargar la página → la lista de zonas debe reflejar los cambios guardados (persistidos en Firebase).
7. Verificar en Firebase Console que `takeaway_config` tiene el campo `zonasEnvio` como array, sin haber perdido `activo`/`horarioDesde`/`diasAbiertos`.

- [ ] **Step 7: Commit**

```bash
git add src/Admin/AdminTakeAway.jsx src/Admin/AdminTakeAway.css
git commit -m "feat: agregar config de zonas de envio en admin take away"
```

---

### Task 2: Checkout — selector de método de envío y campos de dirección

**Files:**
- Modify: `src/TakeAway/TakeAway.jsx` (función `CheckoutScreen`)
- Modify: `src/TakeAway/TakeAway.css`

**Interfaces:**
- Consumes: `config.zonasEnvio` (Firestore, escrito en Task 1); prop `config` ya llega a `CheckoutScreen` sin cambios.
- Produces: campos nuevos en el objeto que `onConfirmar` recibe: `metodoEnvio: 'retiro' | 'envio'`, `localidadEnvio`, `direccionEnvio`, `pisoDeptoEnvio`, `referenciaEnvio` (se agregan automáticamente porque forman parte del spread de `formData`). Consumidos por Task 3.

- [ ] **Step 1: Agregar campos nuevos al estado `formData`**

En `CheckoutScreen`, reemplazar:

```jsx
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', email: '', telefono: '', metodoPago: 'efectivo', comentarios: '',
    fechaRetiro: '', horaRetiro: '',
  });
```

por:

```jsx
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', email: '', telefono: '', metodoPago: 'efectivo', comentarios: '',
    fechaRetiro: '', horaRetiro: '',
    metodoEnvio: 'retiro',
    localidadEnvio: '', direccionEnvio: '', pisoDeptoEnvio: '', referenciaEnvio: '',
  });
```

- [ ] **Step 2: Agregar variables derivadas**

Inmediatamente debajo de la línea `const esEfectivo = formData.metodoPago === 'efectivo';`, agregar:

```jsx
  const zonasEnvio = config?.zonasEnvio || [];
  const hayEnvioDisponible = zonasEnvio.length > 0;
  const esEnvio = formData.metodoEnvio === 'envio';
```

- [ ] **Step 3: Agregar selector de método de envío antes de "Método de pago"**

Localizar en el JSX (dentro del `<form onSubmit={handleSubmit} className="tw-form">`) el bloque que empieza en:

```jsx
          <div className="tw-field">
            <label className="tw-label tw-label--req">Método de pago</label>
```

Insertar el siguiente bloque **justo antes** de esa línea:

```jsx
          <div className="tw-field">
            <label className="tw-label tw-label--req">Método de envío</label>
            <div className={`tw-envio-grid${hayEnvioDisponible ? '' : ' tw-envio-grid--single'}`}>
              <button type="button"
                className={`tw-pago-btn${!esEnvio ? ' tw-pago-btn--on' : ''}`}
                onClick={() => setFormData(p => ({ ...p, metodoEnvio: 'retiro' }))}>
                <span className="tw-pago-btn__label">Retiro en local</span>
                <span className="tw-pago-btn__desc">Pasás a buscarlo vos</span>
              </button>
              {hayEnvioDisponible && (
                <button type="button"
                  className={`tw-pago-btn${esEnvio ? ' tw-pago-btn--on' : ''}`}
                  onClick={() => setFormData(p => ({ ...p, metodoEnvio: 'envio' }))}>
                  <span className="tw-pago-btn__label">Envío Selvaggio</span>
                  <span className="tw-pago-btn__desc tw-pago-btn__desc--free">Envío gratis</span>
                </button>
              )}
            </div>

            {!esEnvio ? (
              <div className="tw-retiro-info">
                <p className="tw-retiro-info__row">📍 Av. Fondo de la Legua 59, Las Lomas de San Isidro</p>
                {config?.diasAbiertos?.length > 0 && (
                  <p className="tw-retiro-info__row">
                    🕐 Retirás {formatDiasAbiertos(config.diasAbiertos)}
                    {config?.horarioDesde !== undefined && config?.horarioHasta !== undefined
                      ? ` de ${config.horarioDesde} a ${config.horarioHasta} hs.`
                      : '.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="tw-envio-fields">
                <div className="tw-field">
                  <label className="tw-label tw-label--req">Localidad</label>
                  <select className="tw-input tw-select" name="localidadEnvio" value={formData.localidadEnvio}
                    onChange={handleChange} required>
                    <option value="">Elegí tu localidad…</option>
                    {zonasEnvio.map(zona => <option key={zona} value={zona}>{zona}</option>)}
                  </select>
                </div>
                <div className="tw-field">
                  <label className="tw-label tw-label--req">Dirección</label>
                  <input className="tw-input" type="text" name="direccionEnvio" value={formData.direccionEnvio}
                    onChange={handleChange} required placeholder="Calle y número" />
                </div>
                <div className="tw-row">
                  <div className="tw-field">
                    <label className="tw-label">Piso/Depto</label>
                    <input className="tw-input" type="text" name="pisoDeptoEnvio" value={formData.pisoDeptoEnvio}
                      onChange={handleChange} placeholder="Opcional" />
                  </div>
                  <div className="tw-field">
                    <label className="tw-label">Referencia</label>
                    <input className="tw-input" type="text" name="referenciaEnvio" value={formData.referenciaEnvio}
                      onChange={handleChange} placeholder="Ej: portón verde" />
                  </div>
                </div>
              </div>
            )}
          </div>

```

**Nota:** `handleChange` ya existe en `CheckoutScreen` (`e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))`) y funciona sin cambios para el `<select>` y los `<input>` nuevos porque coinciden `name` con las claves del estado. `formatDiasAbiertos` ya está definida más abajo en el archivo (fuera del componente) y es usada de la misma forma en que `generarFechasRetiro` ya se usa más arriba en este mismo componente — funciona por el orden de evaluación de JS (el módulo completo se carga antes de que se invoque el componente).

- [ ] **Step 4: Cambiar labels dinámicos de fecha/hora**

Reemplazar:

```jsx
              <label className="tw-label tw-label--req">Fecha de retiro</label>
```

por:

```jsx
              <label className="tw-label tw-label--req">{esEnvio ? 'Fecha de entrega' : 'Fecha de retiro'}</label>
```

Y reemplazar:

```jsx
                  <label className="tw-label tw-label--req">Horario de retiro</label>
```

por:

```jsx
                  <label className="tw-label tw-label--req">{esEnvio ? 'Horario estimado de entrega' : 'Horario de retiro'}</label>
```

- [ ] **Step 5: Agregar línea de envío gratis en el resumen**

Reemplazar:

```jsx
          <div className="tw-resumen__total">
            <span>Total{esEfectivo ? ' a pagar' : ''}</span>
            <span>{formatPrecio(total)}</span>
          </div>
          <p className="tw-resumen__nota">El pago se realiza al momento de retirar en el local.</p>
```

por:

```jsx
          {esEnvio && (
            <div className="tw-resumen__row tw-resumen__row--envio">
              <span className="tw-resumen__qty">🚚</span>
              <span className="tw-resumen__nombre">Envío Selvaggio</span>
              <span className="tw-resumen__precio tw-resumen__precio--gratis">Gratis</span>
            </div>
          )}
          <div className="tw-resumen__total">
            <span>Total{esEfectivo ? ' a pagar' : ''}</span>
            <span>{formatPrecio(total)}</span>
          </div>
          <p className="tw-resumen__nota">
            {esEnvio ? 'El pago se realiza al momento de la entrega.' : 'El pago se realiza al momento de retirar en el local.'}
          </p>
```

- [ ] **Step 6: Agregar estilos en `TakeAway.css`**

Agregar al final del archivo:

```css
/* ── Método de envío ── */
.tw-envio-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.tw-envio-grid--single { grid-template-columns: 1fr; }
.tw-pago-btn__desc--free { color: #1a6b3a; font-weight: 600; }

.tw-retiro-info {
  background: #f5f0ec;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tw-retiro-info__row {
  font-size: 13px;
  color: #4a3f38;
  margin: 0;
  line-height: 1.5;
}

.tw-envio-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tw-resumen__row--envio { border-bottom: 1px solid #f5f0ec; }
.tw-resumen__precio--gratis { color: #1a6b3a !important; font-weight: 700 !important; }

@media (max-width: 600px) {
  .tw-envio-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 7: Verificar en el navegador**

1. Con al menos una zona guardada en Task 1, ir a Take Away → armar un pedido → checkout.
2. Confirmar que aparece el selector "Retiro en local" / "Envío Selvaggio", con "Retiro en local" seleccionado por defecto y el cartel de dirección/horario visible.
3. Click en "Envío Selvaggio" → debe aparecer el select de Localidad (con las zonas configuradas), Dirección, Piso/Depto, Referencia. Los labels de fecha/hora deben decir "Fecha de entrega" / "Horario estimado de entrega".
4. Intentar enviar el form sin elegir localidad ni dirección → el navegador debe bloquear el submit (validación HTML `required`).
5. Completar todo y confirmar que el resumen muestra la línea "Envío Selvaggio · Gratis" y que el total no cambia respecto a "Retiro en local".
6. Vaciar `zonasEnvio` en Firebase (dejar el array vacío) y recargar → la opción "Envío Selvaggio" no debe aparecer, solo "Retiro en local".

- [ ] **Step 8: Commit**

```bash
git add src/TakeAway/TakeAway.jsx src/TakeAway/TakeAway.css
git commit -m "feat: agregar selector de metodo de envio en checkout take away"
```

---

### Task 3: Guardado del pedido — campos nuevos en Firestore y email de notificación

**Files:**
- Modify: `src/TakeAway/TakeAway.jsx` (función `TakeAway`, método `handleConfirmarFinalConData`)
- Modify: `src/utils/emailService.js` (función `enviarNotificacionPedidoTakeAway`)

**Interfaces:**
- Consumes: `formData.metodoEnvio`, `formData.localidadEnvio`, `formData.direccionEnvio`, `formData.pisoDeptoEnvio`, `formData.referenciaEnvio` (producidos en Task 2)
- Produces: campos `metodoEnvio`, `localidadEnvio`, `direccionEnvio`, `pisoDeptoEnvio`, `referenciaEnvio` en los documentos de `selvaggio_takeaway_pedidos` (Firestore). Consumidos por Task 4.

- [ ] **Step 1: Guardar los campos nuevos en el pedido de Firestore**

En `handleConfirmarFinalConData`, reemplazar:

```jsx
        metodoPago: formData.metodoPago,
        comentarios: formData.comentarios,
        fechaRetiro: formData.fechaRetiro || '',
        horaRetiro: formData.horaRetiro || '',
        estado: 'pendiente',
        createdAt: Timestamp.now(),
      });
```

por:

```jsx
        metodoPago: formData.metodoPago,
        comentarios: formData.comentarios,
        fechaRetiro: formData.fechaRetiro || '',
        horaRetiro: formData.horaRetiro || '',
        metodoEnvio: formData.metodoEnvio || 'retiro',
        localidadEnvio: formData.metodoEnvio === 'envio' ? (formData.localidadEnvio || '') : '',
        direccionEnvio: formData.metodoEnvio === 'envio' ? (formData.direccionEnvio || '') : '',
        pisoDeptoEnvio: formData.metodoEnvio === 'envio' ? (formData.pisoDeptoEnvio || '') : '',
        referenciaEnvio: formData.metodoEnvio === 'envio' ? (formData.referenciaEnvio || '') : '',
        estado: 'pendiente',
        createdAt: Timestamp.now(),
      });
```

- [ ] **Step 2: Pasar los campos nuevos a la notificación por email**

Reemplazar:

```jsx
      enviarNotificacionPedidoTakeAway({
        numeroPedido: numStr,
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        items: carrito,
        subtotal: formData.subtotal,
        descuento: formData.descuento || 0,
        total: formData.totalFinal,
        metodoPago: formData.metodoPago,
        comentarios: formData.comentarios,
        fechaRetiro: formData.fechaRetiro || '',
        horaRetiro: formData.horaRetiro || '',
      });
```

por:

```jsx
      enviarNotificacionPedidoTakeAway({
        numeroPedido: numStr,
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        items: carrito,
        subtotal: formData.subtotal,
        descuento: formData.descuento || 0,
        total: formData.totalFinal,
        metodoPago: formData.metodoPago,
        comentarios: formData.comentarios,
        fechaRetiro: formData.fechaRetiro || '',
        horaRetiro: formData.horaRetiro || '',
        metodoEnvio: formData.metodoEnvio || 'retiro',
        localidadEnvio: formData.metodoEnvio === 'envio' ? (formData.localidadEnvio || '') : '',
        direccionEnvio: formData.metodoEnvio === 'envio' ? (formData.direccionEnvio || '') : '',
        pisoDeptoEnvio: formData.metodoEnvio === 'envio' ? (formData.pisoDeptoEnvio || '') : '',
        referenciaEnvio: formData.metodoEnvio === 'envio' ? (formData.referenciaEnvio || '') : '',
      });
```

- [ ] **Step 3: Incluir método/dirección de envío en el template de EmailJS**

En `src/utils/emailService.js`, dentro de `enviarNotificacionPedidoTakeAway`, reemplazar:

```js
      metodo_pago: pedido.metodoPago.charAt(0).toUpperCase() + pedido.metodoPago.slice(1),
      comentarios: pedido.comentarios || '—',
      fecha_hora: ahora,
    }, PUBLIC_KEY);
```

por:

```js
      metodo_pago: pedido.metodoPago.charAt(0).toUpperCase() + pedido.metodoPago.slice(1),
      metodo_envio: pedido.metodoEnvio === 'envio'
        ? `Envío Selvaggio — ${pedido.localidadEnvio}`
        : 'Retiro en local',
      direccion_envio: pedido.metodoEnvio === 'envio'
        ? `${pedido.direccionEnvio}${pedido.pisoDeptoEnvio ? ', ' + pedido.pisoDeptoEnvio : ''}${pedido.referenciaEnvio ? ' (' + pedido.referenciaEnvio + ')' : ''}`
        : '—',
      comentarios: pedido.comentarios || '—',
      fecha_hora: ahora,
    }, PUBLIC_KEY);
```

**Nota:** si el template de EmailJS (`VITE_EMAILJS_TEMPLATE_TAKEAWAY_NOTIF`) no tiene las variables `{{metodo_envio}}` / `{{direccion_envio}}` agregadas en el editor de EmailJS, estos valores simplemente no se van a mostrar en el email — no rompe el envío. Agregar esas variables al template es un paso manual en la plataforma de EmailJS, fuera del alcance del código.

- [ ] **Step 4: Verificar en el navegador**

1. Hacer un pedido completo eligiendo "Envío Selvaggio", con localidad y dirección.
2. Confirmar el pedido y llegar a la pantalla de éxito.
3. Verificar en Firebase Console → `selvaggio_takeaway_pedidos` → el documento nuevo tiene `metodoEnvio: 'envio'`, `localidadEnvio`, `direccionEnvio` con los valores cargados.
4. Hacer un segundo pedido eligiendo "Retiro en local" → verificar que `metodoEnvio: 'retiro'` y los 4 campos de envío quedan como `''`.
5. Si `VITE_EMAILJS_TEMPLATE_TAKEAWAY_NOTIF` está configurado, revisar la casilla `selvaggioba@gmail.com` para confirmar que llegó el email (el contenido de método/dirección depende de que el template en EmailJS tenga esas variables agregadas).

- [ ] **Step 5: Commit**

```bash
git add src/TakeAway/TakeAway.jsx src/utils/emailService.js
git commit -m "feat: guardar metodo y direccion de envio en el pedido y el email"
```

---

### Task 4: Admin — Pedidos: mostrar método/dirección de envío y WhatsApp contextual

**Files:**
- Modify: `src/Admin/AdminTakeAway.jsx` (función `PedidosTW`)

**Interfaces:**
- Consumes: campos `metodoEnvio`, `localidadEnvio`, `direccionEnvio`, `pisoDeptoEnvio`, `referenciaEnvio` de `selvaggio_takeaway_pedidos` (escritos en Task 3). Pedidos viejos sin `metodoEnvio` se tratan como `'retiro'`.

- [ ] **Step 1: Mostrar método de entrega y dirección en la tarjeta de pedido**

Reemplazar:

```jsx
                    <div className="atw__card-info-row"><span>Pago:</span><span>{PAGO_LABEL[p.metodoPago] || p.metodoPago || '—'}</span></div>
                    {fmtFechaRetiro(p.fechaRetiro, p.horaRetiro) && (
                      <div className="atw__card-info-row atw__card-info-row--retiro"><span>Retiro:</span><span>{fmtFechaRetiro(p.fechaRetiro, p.horaRetiro)}</span></div>
                    )}
```

por:

```jsx
                    <div className="atw__card-info-row"><span>Pago:</span><span>{PAGO_LABEL[p.metodoPago] || p.metodoPago || '—'}</span></div>
                    <div className="atw__card-info-row">
                      <span>Entrega:</span>
                      <span>{p.metodoEnvio === 'envio' ? `Envío — ${p.localidadEnvio}` : 'Retiro en local'}</span>
                    </div>
                    {p.metodoEnvio === 'envio' && (
                      <div className="atw__card-info-row">
                        <span>Dirección:</span>
                        <span>
                          {p.direccionEnvio}{p.pisoDeptoEnvio ? `, ${p.pisoDeptoEnvio}` : ''}
                          {p.referenciaEnvio ? ` — ${p.referenciaEnvio}` : ''}
                        </span>
                      </div>
                    )}
                    {fmtFechaRetiro(p.fechaRetiro, p.horaRetiro) && (
                      <div className="atw__card-info-row atw__card-info-row--retiro">
                        <span>{p.metodoEnvio === 'envio' ? 'Fecha entrega:' : 'Retiro:'}</span>
                        <span>{fmtFechaRetiro(p.fechaRetiro, p.horaRetiro)}</span>
                      </div>
                    )}
```

- [ ] **Step 2: Adaptar el mensaje de WhatsApp cuando es envío**

Reemplazar la función `abrirWpp` completa:

```jsx
  const abrirWpp = (p) => {
    let tel = p.telefono?.replace(/\D/g, '') || '';
    // Normalizar número argentino: quitar 0 inicial o 54 duplicado
    if (tel.startsWith('54')) tel = tel.slice(2);
    if (tel.startsWith('0')) tel = tel.slice(1);
    let msg = p.estado === 'listo'
      ? `Hola ${p.nombre}! 🎉 Tu pedido ${p.numeroPedido} de Selvaggio está listo para retirar. Te esperamos en Av. Fondo de la Legua 59, Las Lomas de San Isidro.`
      : p.estado === 'preparando'
      ? `Hola ${p.nombre}! Tu pedido ${p.numeroPedido} de Selvaggio está siendo preparado. En breve te avisamos cuando esté listo.`
      : `Hola ${p.nombre}! Te contactamos desde Selvaggio por tu pedido ${p.numeroPedido}.`;
    window.open(`https://wa.me/54${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };
```

por:

```jsx
  const abrirWpp = (p) => {
    let tel = p.telefono?.replace(/\D/g, '') || '';
    // Normalizar número argentino: quitar 0 inicial o 54 duplicado
    if (tel.startsWith('54')) tel = tel.slice(2);
    if (tel.startsWith('0')) tel = tel.slice(1);
    const esEnvio = p.metodoEnvio === 'envio';
    let msg = p.estado === 'listo'
      ? (esEnvio
          ? `Hola ${p.nombre}! 🎉 Tu pedido ${p.numeroPedido} de Selvaggio está listo y en breve sale para ${p.localidadEnvio} - ${p.direccionEnvio}.`
          : `Hola ${p.nombre}! 🎉 Tu pedido ${p.numeroPedido} de Selvaggio está listo para retirar. Te esperamos en Av. Fondo de la Legua 59, Las Lomas de San Isidro.`)
      : p.estado === 'preparando'
      ? `Hola ${p.nombre}! Tu pedido ${p.numeroPedido} de Selvaggio está siendo preparado. En breve te avisamos cuando esté listo.`
      : `Hola ${p.nombre}! Te contactamos desde Selvaggio por tu pedido ${p.numeroPedido}.`;
    window.open(`https://wa.me/54${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };
```

- [ ] **Step 3: Verificar en el navegador**

1. Abrir el panel admin → Pedidos.
2. Ubicar el pedido de "Envío Selvaggio" creado en Task 3 → la tarjeta debe mostrar "Entrega: Envío — [localidad]" y la fila "Dirección:" con calle, piso y referencia.
3. Ubicar un pedido de "Retiro en local" → debe mostrar "Entrega: Retiro en local" y sin fila de dirección.
4. Marcar el pedido de envío como "Listo" y click en el botón de WhatsApp → el mensaje pre-armado debe mencionar la localidad y dirección de entrega, no "para retirar".
5. Hacer lo mismo con un pedido de retiro en estado "Listo" → el mensaje debe seguir diciendo "para retirar… Te esperamos en Av. Fondo de la Legua 59".

- [ ] **Step 4: Commit**

```bash
git add src/Admin/AdminTakeAway.jsx
git commit -m "feat: mostrar metodo y direccion de envio en pedidos admin y whatsapp"
```
