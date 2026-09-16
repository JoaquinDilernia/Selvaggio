# Cupones de descuento para Take Away

**Fecha:** 2026-09-16
**Estado:** Aprobado

## Contexto

Hoy el checkout de Take Away solo tiene un descuento fijo del 10% cuando el método de pago es efectivo (`esEfectivo`, calculado en `TakeAway.jsx`). El negocio quiere poder crear y administrar **cupones de descuento** desde el Admin, que el cliente pueda cargar en el checkout de Take Away.

Objetivos:
- Admin puede crear/editar/activar/desactivar cupones con descuento por **% o monto fijo**.
- Cada cupón puede tener **límite de usos totales** y **límite de usos por cliente** (identificado por email, que ya es obligatorio en el checkout).
- Cada cupón puede tener **vigencia** (fecha desde/hasta, opcionales) y **monto mínimo de compra** (opcional).
- El cliente aplica el cupón en el checkout de Take Away con un campo de código.
- El descuento del cupón y el descuento del 10% efectivo **se encadenan** (no se suman sobre el mismo subtotal): primero cupón, después efectivo sobre lo que queda.
- Admin puede ver **estadísticas por cupón**: usos totales, monto descontado acumulado, ingresos generados por pedidos que lo usaron, e historial de últimos usos (pedido, cliente, fecha, descuento aplicado).
- Todo corre client-side contra Firestore, sin backend propio (mismo patrón que el resto del sitio) — la validación final de límites se hace en una transacción de Firestore para evitar que se pase del límite de usos por condiciones de carrera.

Fuera de alcance: cupones restringidos a productos/categorías específicas, cupones para Reservas (solo Take Away), generación automática de códigos, notificaciones de cupón por email/WhatsApp, integración con Caja/Cocina, exportar estadísticas a Excel.

---

## Modelo de datos

### `selvaggio_cupones/{codigo}`

El **ID del documento es el código en mayúsculas** (ej. `PROMO10`), así Firestore garantiza unicidad sin queries extra.

```js
{
  codigo: 'PROMO10',
  tipoDescuento: 'porcentaje' | 'monto_fijo',
  valor: 10,                    // % (1-100) o monto ARS según tipoDescuento
  activo: true,
  fechaDesde: '2026-09-16',     // '' si no aplica
  fechaHasta: '2026-09-30',     // '' si no aplica
  montoMinimo: 5000,            // 0 si no aplica
  limiteUsosTotal: 100,         // null = sin límite
  limiteUsosPorCliente: 1,      // null = sin límite
  usosTotales: 0,                    // contador, se actualiza en la transacción de canje
  montoDescontadoTotal: 0,           // ARS acumulados, contador
  ingresosGenerados: 0,              // suma de totalFinal de pedidos que lo usaron
  descripcion: '',              // nota interna para el admin, no se muestra al cliente
  creado: Timestamp,
}
```

### `selvaggio_cupones/{codigo}/usosPorCliente/{emailSanitizado}`

Un doc por cliente que usó el cupón, usado para chequear `limiteUsosPorCliente` de forma atómica (point-read dentro de la transacción). `emailSanitizado` = email en minúsculas/trim (mismo criterio que `selvaggio_clientes`).

```js
{ cantidad: 1 }
```

### `selvaggio_cupones/{codigo}/usos/{autoId}`

Historial de canjes, para la tabla de estadísticas en el Admin. Se escribe dentro de la misma transacción de canje.

```js
{
  email: 'cliente@mail.com',
  nombre: 'Juan Pérez',
  pedidoId: 'abc123',
  numeroPedido: 'TW-ABC123',
  descuentoAplicado: 850,
  totalPedido: 8500,
  fecha: Timestamp,
}
```

### `selvaggio_takeaway_pedidos` (documento de pedido)

Se agregan campos nuevos al `addDoc` existente:

```js
{
  // ...campos existentes...
  cuponCodigo: 'PROMO10',       // '' si no se usó cupón
  cuponId: 'PROMO10',           // '' si no se usó cupón (mismo valor que el código, es el doc id)
  descuentoCupon: 850,          // 0 si no se usó cupón
  descuentoEfectivo: 765,       // 0 si no paga en efectivo (antes era parte de 'descuento')
  descuento: 1615,              // se mantiene: suma de descuentoCupon + descuentoEfectivo (compat con lo existente)
}
```

---

## Fórmula de descuento combinado

Confirmado con el negocio: se encadenan como subtotales sucesivos, cupón primero.

```
subtotal           = suma de items del carrito
descuentoCupon     = tipoDescuento === 'porcentaje'
                        ? round(subtotal * valor / 100)
                        : min(valor, subtotal)
subtotalPostCupon  = subtotal - descuentoCupon
descuentoEfectivo  = esEfectivo ? round(subtotalPostCupon * 0.10) : 0
total              = subtotalPostCupon - descuentoEfectivo
```

En el resumen del checkout se muestran ambas líneas apiladas cuando corresponden (cupón, luego efectivo), igual formato visual que la línea de efectivo actual.

---

## Validación y canje (atomicidad)

Dos etapas, igual que se acordó con el negocio:

**1. Preview (al tocar "Aplicar" en el checkout):**
- Se busca `selvaggio_cupones/{codigo.toUpperCase().trim()}` con un `getDoc`.
- Se valida: existe, `activo === true`, hoy está entre `fechaDesde`/`fechaHasta` (si están definidas), `subtotal >= montoMinimo`.
- Si hay email cargado en el form, se hace un chequeo best-effort de `limiteUsosPorCliente` leyendo `usosPorCliente/{email}`. Si no hay email todavía, se omite este chequeo en el preview (se valida igual al confirmar).
- Si es válido: se guarda el cupón en el estado del checkout y se muestra el descuento en el resumen, con opción de "Quitar".
- Si no es válido: se muestra el motivo puntual (cupón no encontrado, vencido, inactivo, no alcanza el monto mínimo, ya alcanzaste el límite de usos).

**2. Canje definitivo (al confirmar el pedido):**

Todo ocurre en **una única transacción de Firestore** (`runTransaction`) dentro de `handleConfirmarFinalConData`:

1. `tx.get` del doc del cupón (si hay uno aplicado) y de `usosPorCliente/{email}`.
2. Re-validar con los datos frescos: activo, vigencia, monto mínimo, `usosTotales < limiteUsosTotal` (si aplica), `cantidad < limiteUsosPorCliente` (si aplica).
3. Si sigue siendo válido:
   - `tx.set` del doc del pedido (usando una ref pre-generada con `doc(collection(db, 'selvaggio_takeaway_pedidos'))`, igual que hoy pero dentro de la transacción).
   - `tx.update` del cupón: `usosTotales: increment(1)`, `montoDescontadoTotal: increment(descuentoCupon)`, `ingresosGenerados: increment(total)`.
   - `tx.set` de `usosPorCliente/{email}`: `cantidad: increment(1)` (con `{merge: true}` si es la primera vez).
   - `tx.set` de un nuevo doc en `usos/` con el detalle del canje.
4. Si el cupón **ya no es válido** en este punto (por ejemplo se agotó entre el preview y la confirmación): la transacción aborta el pedido completo, se muestra un toast ("Este cupón ya no está disponible, revisá tu pedido") y el cliente queda en el checkout para reintentar (sin el cupón, o con otro).

El resto de las escrituras que ya existen fuera de la transacción (upsert de `selvaggio_clientes`, notificación al local, tracking de analytics) se mantienen como están, después de que la transacción confirma.

`canjearCupon(...)` se usa siempre para crear el pedido, tenga o no cupón aplicado (si no hay cupón, simplemente omite los pasos 2 y 3 de la lista anterior). Así el checkout no bifurca entre "pedido con cupón" y "pedido sin cupón": siempre hay una sola transacción que crea el pedido, y `handleConfirmarFinalConData` no duplica la lógica de `addDoc` que ya existe hoy.

---

## Lógica compartida: `src/utils/cupones.js`

Módulo nuevo con las funciones puras/de acceso a datos, separado de `TakeAway.jsx` y de `CuponesTab.jsx`:

- `buscarCupon(codigo)` — `getDoc` por código, devuelve el cupón o `null`.
- `validarCupon(cupon, { subtotal, email, usosPorCliente })` — devuelve `{ valido: bool, motivo?: string }`, sin tocar Firestore (recibe los datos ya leídos).
- `calcularDescuentoCupon(cupon, subtotal)` — aplica la fórmula del tipo de descuento.
- `canjearCupon({ cuponId, email, pedidoData, carrito })` — arma y ejecuta la `runTransaction` descripta arriba, devuelve el pedido creado o lanza un error tipado (`CuponInvalidoError`) que el checkout captura para mostrar el toast.

---

## Admin — tab "Cupones"

Archivo nuevo `src/Admin/tabs/CuponesTab.jsx`, registrado en `AdminNew.jsx` junto a los tabs existentes (mismo patrón que `PedidosTab`, `ClientesTab`, etc.), reusando `TabsShared.css`.

**Tabla principal**, una fila por cupón:

| Código | Tipo | Valor | Activo | Vigencia | Usos (X/límite) | Monto descontado | Ingresos generados | Acciones |

- El switch de "Activo" hace un `updateDoc` directo (igual patrón que toggles existentes en otros tabs).
- "Usos" muestra `usosTotales` y, si hay `limiteUsosTotal`, `X / límite`; si no hay límite, solo `X`.
- Botón **"+ Nuevo cupón"** abre un formulario (modal, mismo patrón visual que otros formularios del Admin) con: código, tipo de descuento (radio % / monto fijo), valor, activo (checkbox, default true), fecha desde/hasta (opcionales), monto mínimo (opcional), límite de usos totales (opcional), límite de usos por cliente (opcional), descripción interna (opcional). Valida que el código no tenga espacios y lo normaliza a mayúsculas antes de guardar.
- Botón **"Editar"** por fila reabre el mismo formulario con los datos cargados. El código no es editable una vez creado (es el ID del doc).
- Botón **"Eliminar"** con confirmación, borra el doc del cupón (no borra el historial de pedidos que ya lo usaron, esos quedan con los campos `cuponCodigo`/`descuentoCupon` igual).
- Botón **"Ver uso"** por fila, expande o abre un modal con la lista de `usos/` (fecha, cliente, pedido, descuento aplicado), ordenada por fecha descendente, sin paginación (volumen bajo esperado).

**Extra menor:** `PedidosTab.jsx` lee de `selvaggio_pedidos` (pedidos de mesa/salón), una colección distinta a la de Take Away, así que no aplica ahí. El lugar correcto es `src/Admin/AdminTakeAway.jsx`, que ya lista los pedidos de `selvaggio_takeaway_pedidos` en tarjetas y ya muestra la línea `Desc. efectivo 10%` cuando `p.descuento > 0` (línea ~170). Ahí se agrega, antes de esa línea, una línea `Cupón {cuponCodigo}` cuando `p.descuentoCupon > 0`, reusando los campos nuevos del pedido (sin lógica nueva).

---

## Checkout de Take Away (`TakeAway.jsx`)

En `CheckoutScreen`, arriba del subtotal en el bloque `tw-resumen`, se agrega un campo colapsable "¿Tenés un cupón?" con:
- Input de texto (mayúsculas automáticas) + botón "Aplicar".
- Estado de carga mientras valida.
- Si es válido: chip con el código aplicado, el descuento correspondiente, y botón "Quitar".
- Si no es válido: mensaje de error puntual debajo del input (mismo estilo que otros errores del form).

El resumen (`tw-resumen`) pasa a mostrar, cuando corresponde: Subtotal → línea de descuento por cupón → (subtotal intermedio implícito) → línea de descuento por efectivo → Total. Reutiliza las clases CSS ya existentes para las líneas de descuento (`tw-resumen__row--descuento`), agregando una variante para distinguir visualmente cupón de efectivo si hace falta.

`handleSubmit` pasa el cupón aplicado (si hay) junto con `formData` a `onConfirmar`, y `handleConfirmarFinalConData` usa `canjearCupon(...)` de `src/utils/cupones.js` en vez de armar el `addDoc` directo cuando hay un cupón aplicado.

---

## Testing

- Sin test runner en el proyecto (no hay Jest/Vitest configurado) — verificación manual en dev (`npm run dev`) cubriendo: cupón válido % y monto fijo, cupón vencido, cupón bajo monto mínimo, cupón inactivo, límite total alcanzado, límite por cliente alcanzado, combinación cupón + efectivo, y que las estadísticas del Admin reflejen los canjes hechos.
