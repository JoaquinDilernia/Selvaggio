# Rediseño visual de Take Away

## Contexto y objetivo

Se usó `refe-teake-a-way.html` (en la raíz del repo) como referencia visual
para mejorar la página de Take Away (`src/TakeAway/TakeAway.jsx` /
`TakeAway.css`, vista de catálogo — no afecta checkout, verificación ni
success). La referencia trae secciones y un tratamiento visual que no
aplican 1:1 al sitio real: se adapta lo que sirve y se descarta lo que no.

## Qué se audita de la referencia

| Sección de la referencia | Decisión |
|---|---|
| Nav | Se mantiene el nav actual, sin cambios |
| Hero (imagen de fondo full-width) | **Se adopta**, adaptado a datos reales |
| Picadas (tabs por tamaño + cards) | Se adopta el **tratamiento visual de las cards**; **sin tabs** — el modelo de datos de Firestore no tiene campo de tamaño/personas y agregarlo es un cambio de modelo de datos + Admin, fuera de alcance de un rediseño visual |
| "Por qué existe" (quotes sobre el súper) | **Se descarta** — no se construye |
| "Proceso" (3 pasos) | **Se descarta** — no se construye |
| CTA final | **Se adopta**, adaptado a copy real de Take Away |

La sección "Agregá algo más" (adicionales) y el drawer del carrito existen
hoy y no están en la referencia — se mantienen sin tocar.

## Paleta y tipografía

La referencia usa colores genéricos (`--crema #ece7e0`, `--negro #0d0d0d`,
`--arena #9a8a7a`, `--bordo #7a2a2a`) y tipografía Playfair Display. El
sitio real ya usa una paleta casi idéntica en `TakeAway.css` (crema
`#faf7f4`, negro `#1a1614`, arena `#8a7e76`, terracota `#7c3f2f`) y
Cormorant Garant como serif de marca (usada en el resto del sitio,
incluido el Admin). **Se usan los tokens reales del sitio**, no los
valores de la referencia — no se introduce Playfair Display ni la paleta
hex de la referencia.

## Hero nuevo

Reemplaza el hero de texto plano actual (`.tw-hero`) por un hero de
imagen de fondo a pantalla completa:

- **Imagen**: `picadas[0].imagen` (la primera picada cargada desde
  Firestore, mismo orden que ya usa el catálogo). Si no existe (`picadas`
  vacío o sin `imagen`), fondo sólido oscuro (`#1a1614`) como fallback —
  sin depender de que exista una foto.
- **Overlay**: degradado oscuro de abajo hacia arriba (como en la
  referencia) para que el texto sea legible sobre cualquier foto.
- **Contenido**: se conserva el copy y los datos reales que ya muestra el
  hero actual — eyebrow, título (`Armá tu picada, retirala.`), bajada, las
  pills de "Retirás en..." / "Envío gratis..." (condicionadas a
  `config?.zonasEnvio`, igual que hoy), y el link "¿Tenés un pedido?
  Seguilo →". Solo cambia el tratamiento visual (imagen de fondo,
  tipografía Cormorant Garant, jerarquía tipo referencia), no el
  contenido ni la lógica.

## Cards de picadas — pulido visual

Mismo grid, mismos datos (`picadas.map(...)`), sin agregar tabs. Se
adopta el tratamiento visual de la referencia:

- Tags de sección (`picada.secciones`) como píldoras con borde, en vez
  del estilo actual.
- Footer de precio + botón "Armar →" con el espaciado/tipografía de la
  referencia.
- Sin cambios en `CustomizarModal`, `agregarAlCarrito` ni ninguna lógica
  de estado — es un cambio de CSS/markup, no de comportamiento.

## CTA final — sección nueva

Se agrega al final de la página de catálogo (después de "Agregá algo
más", antes del drawer/footer), adaptada a Take Away:

- Título + bajada con copy real (ej. horario de pedidos desde `config`).
- Botón que hace scroll suave al catálogo (`document.getElementById(...)`
  o un `ref`, igual mecanismo que el `onclick` de la referencia pero en
  React).
- Info de contacto (dirección, horario, WhatsApp) reutilizando los
  mismos datos que ya usa el hero actual (`config`), sin datos nuevos.

## Fuera de alcance

- Secciones "Por qué existe" y "Proceso".
- Tabs de picadas por tamaño/personas (requiere cambio de modelo de datos
  + Admin — posible proyecto futuro separado).
- Checkout, verificación de email, pantalla de éxito, seguimiento de
  pedido: sin cambios.
- Rediseño de cualquier otra página del sitio (Landing, Reservas, Admin).
