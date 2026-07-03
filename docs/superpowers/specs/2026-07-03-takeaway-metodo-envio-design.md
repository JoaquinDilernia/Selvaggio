# Take Away: método de envío (Retiro en local / Envío Selvaggio)

**Fecha:** 2026-07-03
**Estado:** Aprobado

## Contexto

Hoy el Take Away es exclusivamente retiro en el local: el checkout pide fecha y hora de retiro, sin noción de método de envío. El negocio quiere sumar una segunda modalidad, **envío a domicilio**, limitada a un conjunto de localidades de la zona norte del GBA (desde San Isidro hasta Núñez inclusive, y desde San Isidro hasta Nordelta inclusive, incluyendo las localidades intermedias). El envío es **gratuito** en todas las zonas habilitadas (confirmado por el negocio).

Objetivos:
- Agregar un selector de método de envío en el checkout: **Retiro en local** vs **Envío Selvaggio**.
- "Retiro en local" muestra la dirección y el horario de atención (reutilizando la info ya existente).
- "Envío Selvaggio" solo permite elegir localidades dentro de una lista configurable desde el Admin, y pide dirección de entrega.
- El envío no tiene costo; no se modifica el cálculo de `total`.
- El panel de Pedidos y el mensaje de WhatsApp reflejan el método elegido y, si es envío, la dirección.

Fuera de alcance: costo de envío, envío fuera de las zonas habilitadas, integración con logística/mapas, edición de la dirección del local desde el Admin (se reutiliza el texto ya usado en la Landing).

---

## Modelo de datos

### `selvaggio_configuracion/takeaway_config`

Se agrega un campo nuevo:

```json
{
  "activo": true,
  "horarioDesde": 18,
  "horarioHasta": 23,
  "diasAbiertos": [2, 3, 4, 5, 6],
  "zonasEnvio": [
    "Núñez", "Vicente López", "Olivos", "Acassuso", "Martínez",
    "San Isidro", "Beccar", "Victoria", "San Fernando", "Tigre", "Nordelta"
  ]
}
```

- `zonasEnvio`: array de strings, orden libre (el orden de la lista es el orden en que se muestran en el select). Editable desde el Admin (agregar/sacar), sin tocar código.
- Si `zonasEnvio` no existe o está vacío, la opción "Envío Selvaggio" no se muestra en el checkout (no hay zonas habilitadas).
- Se guarda con `setDoc(..., { merge: true })`, igual que el resto de la config.

### `selvaggio_takeaway_pedidos` (documento de pedido)

Se agregan campos nuevos al `addDoc` existente:

```js
{
  // ...campos existentes...
  metodoEnvio: 'retiro' | 'envio',
  localidadEnvio: '',      // solo si metodoEnvio === 'envio'
  direccionEnvio: '',      // calle y número — solo si envio
  pisoDeptoEnvio: '',      // opcional — solo si envio
  referenciaEnvio: '',     // opcional — solo si envio
}
```

Si `metodoEnvio === 'retiro'`, los 4 campos de envío se guardan como `''`.

---

## Cambios en `TakeAway.jsx`

### `CheckoutScreen`

**Nuevo estado en `formData`:**
```js
metodoEnvio: 'retiro', // default
localidadEnvio: '', direccionEnvio: '', pisoDeptoEnvio: '', referenciaEnvio: '',
```

**Nuevo selector "Método de envío"**, ubicado antes del bloque "Método de pago":

Dos tarjetas tipo `tw-pago-btn` (mismo patrón visual que los botones de pago):
- **Retiro en local**
- **Envío Selvaggio** — con badge "Envío gratis". Esta tarjeta solo se muestra si `config.zonasEnvio` tiene al menos una zona; si no hay zonas configuradas, el selector ni aparece y el flujo queda igual que hoy (solo retiro).

**Si `metodoEnvio === 'retiro'`:**
Debajo del selector se muestra un cartel informativo fijo:
```
📍 Av. Fondo de la Legua 59, Las Lomas de San Isidro
🕐 [horario armado con formatDiasAbiertos(config.diasAbiertos) + config.horarioDesde/horarioHasta]
```
Ej: "Retirás martes, miércoles, jueves, viernes y sábado de 18 a 23 hs." Reutiliza el helper `formatDiasAbiertos` ya existente en el archivo. La dirección es un texto fijo en el componente (mismo valor que ya está hardcodeado en `Landing.jsx`), no viene de Firebase.

Los campos "Fecha de retiro" / "Horario de retiro" (selects ya existentes) se mantienen sin cambios.

**Si `metodoEnvio === 'envio'`:**
Se reemplaza el cartel de retiro por 4 campos nuevos:
- **Localidad** — `<select>` poblado con `config.zonasEnvio`, requerido.
- **Dirección** — input texto libre ("Calle y número"), requerido.
- **Piso/Depto** — input texto libre, opcional.
- **Referencia** — input texto libre ("Ej: portón verde, entre calles…"), opcional.

Los selects de fecha/hora se mantienen (misma lógica `generarFechasRetiro`/`generarHorasRetiro`), pero los labels cambian dinámicamente:
- "Fecha de retiro" → "Fecha de entrega"
- "Horario de retiro" → "Horario estimado de entrega"

**Validación:** el botón de submit exige `localidadEnvio` y `direccionEnvio` no vacíos cuando `metodoEnvio === 'envio'` (validación HTML `required` en los inputs, igual que el resto del form).

**Resumen del pedido:** se agrega una línea informativa "Envío gratis a tu zona" cuando `metodoEnvio === 'envio'` (no afecta el cálculo de `subtotal`/`descuento`/`total`).

### `TakeAway` (componente principal) — `handleConfirmarFinalConData`

El `addDoc` a `selvaggio_takeaway_pedidos` incorpora los 5 campos nuevos (`metodoEnvio`, `localidadEnvio`, `direccionEnvio`, `pisoDeptoEnvio`, `referenciaEnvio`) leídos de `formData`. Se pasan también a `enviarNotificacionPedidoTakeAway`.

### `SuccessScreen`

Sin cambios funcionales. El mensaje de "retiro agendado" ya usa `retiroLabel`, que sigue armándose igual (aplica tanto a retiro como a fecha/hora de entrega).

---

## Cambios en `AdminTakeAway.jsx`

### Componente principal (`AdminTakeAway`)

Se agrega una sección "Zonas de envío" debajo de la config de horario/días existente:

**Estado nuevo:**
```js
const [zonasEnvio, setZonasEnvio] = useState([]);
const [nuevaZona, setNuevaZona] = useState('');
```

Se inicializa desde el mismo `getDoc` que ya trae `takeawayConfig` (agregar lectura de `data.zonasEnvio`).

**UI:**
- Lista de chips/tags con las zonas actuales, cada una con una "✕" para sacarla (mismo patrón que el modal de categorías de ingredientes en `IngredientesTW`, pero inline, sin modal).
- Input de texto + botón "Agregar" para sumar una zona nueva (evita duplicados, trim).
- Estas zonas se guardan junto con el resto de la config al presionar el botón "Guardar" ya existente (se agrega `zonasEnvio` al `setDoc` de `guardarConfig`).
- Valor por defecto si el documento no trae `zonasEnvio` (primera vez): la lista lógica mencionada arriba, precargada en el estado para que el admin la vea, ajuste y guarde.
- Nota: hasta que el admin no presione "Guardar" al menos una vez tras el deploy, `zonasEnvio` no existe todavía en Firestore y el checkout no ofrece "Envío Selvaggio" (ver comportamiento por defecto en `TakeAway.jsx` arriba). Es un paso único post-deploy.

### `PedidosTW`

**Tarjeta de pedido (`atw__card`):** se agrega una fila `atw__card-info-row` mostrando el método:
```
Entrega: Retiro en local
```
o
```
Entrega: Envío — Vicente López
Dirección: [direccionEnvio], [pisoDeptoEnvio]
Ref: [referenciaEnvio]
```
Se muestra solo si el pedido tiene el campo (compatibilidad con pedidos viejos sin `metodoEnvio`: se trata como `'retiro'` por defecto).

**Mensaje de WhatsApp (`abrirWpp`):** si `p.metodoEnvio === 'envio'`, el mensaje de "pedido listo" cambia de "para retirar" a algo como:
```
Hola [nombre]! 🎉 Tu pedido [num] de Selvaggio está listo y en breve sale para [localidadEnvio] - [direccionEnvio].
```
Si es retiro, se mantiene el mensaje actual sin cambios.

---

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/TakeAway/TakeAway.jsx` | Selector de método de envío en checkout, campos de dirección, labels dinámicos, guardado de campos nuevos |
| `src/TakeAway/TakeAway.css` | Estilos para el selector de método de envío y los campos de dirección (reutilizando clases `tw-pago-*`/`tw-field` donde aplique) |
| `src/Admin/AdminTakeAway.jsx` | Sección "Zonas de envío" en config, visualización de método/dirección en tarjetas de pedido, mensaje de WhatsApp contextual |
| `src/Admin/AdminTakeAway.css` | Estilos de los chips de zona (si no alcanzan las clases existentes) |
| `src/utils/emailService.js` | Incluir método de envío y dirección en el email de notificación al local (`enviarNotificacionPedidoTakeAway`) |

No se agregan archivos ni dependencias nuevas. No se toca `LandingDemo.jsx` ni `Landing.jsx`.
