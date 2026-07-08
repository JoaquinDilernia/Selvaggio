# Fix Meta Pixel: InitiateCheckout y AddToCart

## Problema

El equipo de pauta reporta que el evento `InitiateCheckout` de Meta Pixel solo
funciona para Reserva de Mesa. Auditoría del código confirma:

- **Reserva Mesa**: `trackInitiateCheckout('mesa')` se dispara en `onFocus`
  del primer campo del formulario ("nombre"). Funciona correctamente.
- **Reserva Cava**: no existe ningún llamado a `trackInitiateCheckout`.
  El evento nunca se dispara.
- **Take Away**: `trackTakeAwayInicio()` (mapeado a `InitiateCheckout`) se
  dispara al agregar el primer producto al carrito, no al iniciar el
  checkout — semántica incorrecta. Además tiene un bug: la condición
  `carrito.length === 0` nunca se cumple para usuarios que ya tienen algo
  guardado en `localStorage` de una visita anterior, así que el evento deja
  de dispararse para siempre en ese navegador. No existe ningún evento
  `AddToCart` real.

## Solución

1. **`src/utils/metaPixel.js`**
   - Agregar `trackAddToCart(item)`: dispara el evento estándar `AddToCart`
     con `content_name`, `value` (precio del item) y `currency: 'ARS'`.
   - Extender `trackInitiateCheckout(tipo)` para aceptar `'takeaway'` además
     de `'cava'`/`'mesa'`, con `content_name: 'Checkout Take Away'` y
     `content_category: 'Take Away'`.
   - Eliminar `trackTakeAwayInicio` (queda reemplazada).

2. **`src/Reservas/ReservaCava.jsx`**
   - Agregar el mismo patrón que `ReservaMesas.jsx`: un `ref` `checkoutTracked`
     y un handler `handleFirstFocus` que llama a `trackInitiateCheckout('cava')`,
     enganchado al `onFocus` del primer campo del formulario ("nombre").

3. **`src/TakeAway/TakeAway.jsx`**
   - En `agregarAlCarrito`: reemplazar el disparo único y buggeado de
     `trackTakeAwayInicio` por `trackAddToCart(item)`, llamado en **cada**
     producto agregado al carrito (sin gating por `carrito.length` ni
     `localStorage`), para tener conteo real de "quiénes agregan al carrito".
   - En `CheckoutScreen`: agregar `checkoutTracked` ref + `handleFirstFocus`
     que llama a `trackInitiateCheckout('takeaway')`, enganchado al `onFocus`
     del primer campo del formulario de checkout ("nombre"), igual que en
     Reserva Mesa/Cava.

## Resultado esperado

Los tres flujos (Cava, Mesa, Take Away) van a disparar `InitiateCheckout` de
forma consistente al tocar el primer campo del formulario correspondiente.
Take Away además va a sumar un evento `AddToCart` real y confiable por cada
producto agregado, sin el bug de persistencia de `localStorage`.

## Fuera de alcance

- Tracking nativo propio / dashboard de funnel (proyecto separado).
- Rediseño visual de Take Away (proyecto separado).
- Conversions API server-side (no existe hoy; el pixel es 100% client-side
  con Advanced Matching vía `em`/`ph` hasheados).
