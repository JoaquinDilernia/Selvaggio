# Take Away — hero sin imagen + sección "Proceso"

## Contexto y objetivo

Revisión del rediseño visual de Take Away (ver
[`2026-07-08-takeaway-redesign-design.md`](2026-07-08-takeaway-redesign-design.md)
y el commit `8d2ac64` que lo implementó). Después de ver el resultado
contra `refe-teake-a-way.html`, se ajustan dos cosas:

1. El hero adoptó imagen de fondo (`picadas[0].imagen`) en la iteración
   anterior. Se descarta ese enfoque: pasa a un **fondo sólido con
   textura**, sin depender de que haya una foto cargada, con un layout
   más parecido a la referencia (asimétrico) y más información (días y
   horario, WhatsApp).
2. La sección "Proceso" de la referencia, que la spec original había
   descartado, se agrega arriba del CTA final.

No afecta checkout, verificación ni success — solo la vista de catálogo
(`src/TakeAway/TakeAway.jsx` / `TakeAway.css`).

## Hero — fondo sólido con textura, layout asimétrico

Reemplaza `.tw-hero--img` (imagen de fondo de `picadas[0].imagen`) por un
fondo sólido `#1a1614` (mismo negro que ya usa el sitio) con una textura
sutil superpuesta (grano o patrón de líneas finas diagonales, opacity muy
baja — no debe competir con el texto ni leerse como una foto rota). No
depende de que existan picadas ni imágenes.

**Layout**, dos columnas en desktop (una sola columna apilada en mobile):

- **Izquierda** (arriba, alineado a la izquierda — no centrado como
  hoy):
  - Eyebrow: "Selvaggio · Wine Bar & Delicatessen" (contenido actual,
    sin cambios).
  - Título: "Armá tu picada, *retirala.*" (contenido actual, sin
    cambios), tipografía Cormorant Garant.
  - Bajada actual, sin cambios de copy.
  - Pills de "Retirás en Av. Fondo de la Legua 59..." / "Envío gratis a
    zonas seleccionadas" — mismo componente y misma condición
    (`config?.zonasEnvio?.length > 0`) que hoy, solo se mueven debajo de
    la bajada en vez de quedar centradas.
  - Link "¿Tenés un pedido? Seguilo →" — mismo componente, debajo de las
    pills.
- **Abajo a la derecha** (apilado, alineado a la derecha, estilo
  `hero-meta` de la referencia — texto chico, low-contrast):
  - 📍 dirección: "Av. Fondo de la Legua 59, Las Lomas de San Isidro"
    (mismo texto que ya está hardcodeado en `.tw-cta-final__info`).
  - 🕐 días + horario: `formatDiasAbiertos(config.diasAbiertos)` +
    `de {horarioDesde} a {horarioHasta} hs.` (misma función y misma
    fuente de datos que ya usa `.tw-cta-final__sub`). Si `config` no
    trae `diasAbiertos`/horario, esta línea no se renderiza (incluir
    solo si hay data, igual criterio que el resto del hero).
  - 📞 WhatsApp: "+54 9 11 6686-4692" (mismo número hardcodeado que ya
    está en `.tw-cta-final__info`).

**Responsive:** en mobile (`max-width: 600px`) el bloque de meta
abajo-derecha pasa a apilarse debajo del bloque izquierdo (columna
única, ambos bloques alineados a la izquierda) — no hay espacio para dos
columnas separadas.

**Fuera de esto:** la altura del hero se mantiene similar a la actual
(~420px desktop / ~340px mobile, los mismos breakpoints que ya existen
en `.tw-hero--img`). No se reintroduce ningún dato nuevo — todo sale de
`config` o de textos ya hardcodeados en el propio archivo.

## Sección "Proceso" — nueva, arriba del CTA final

Se agrega entre "Agregá algo más" (adicionales, si existen) y el CTA
final. Si no hay adicionales, queda directamente después del catálogo de
picadas.

**Fondo:** el mismo crema de la página (`#faf7f4`), sin sección propia
con color de fondo distinto — separada con un borde superior sutil,
mismo tratamiento que ya usa `.tw-adicionales__title`
(`border-top: 1.5px solid #ebe5dd`).

**Contenido**, copy adaptado (sin mencionar tabs de tamaño, que no
existen en el modelo de datos real):

- Eyebrow: "El proceso"
- Título: "Así de simple." (Cormorant Garant, mismo tratamiento
  tipográfico que otros títulos de sección de la página)
- Grid de 3 pasos en desktop, separados por líneas verticales finas
  (como `.proceso-grid` / `.paso` de la referencia), cada uno con:
  número grande semitransparente (`01`/`02`/`03`), título del paso,
  descripción corta.
  1. **Elegís tu picada** — "Elegís la picada y personalizás cada
     sección con los ingredientes que más te gusten."
  2. **Lo armamos** — "Preparamos todo en el local: quesos, fiambres y
     acompañamientos, tal cual la pediste."
  3. **Retirás y disfrutás** — "Pasás por Av. Fondo de la Legua 59, Las
     Lomas de San Isidro, y lo llevás donde quieras."

**Responsive:** en mobile el grid pasa a una sola columna apilada, sin
las líneas divisorias verticales — se reemplazan por espaciado vertical
entre pasos.

## Fuera de alcance

- La sección "Por qué existe" (quotes sobre el súper) sigue descartada
  — no se construye. Solo "Proceso" se agrega.
- Tabs de picadas por tamaño/personas: sigue fuera de alcance (requiere
  cambio de modelo de datos + Admin).
- Checkout, verificación de email, pantalla de éxito, seguimiento de
  pedido: sin cambios.
- Cards de picadas y adicionales: sin cambios respecto a como quedaron
  en el commit `8d2ac64`.
- No se agregan datos nuevos a `config` ni a Firestore — todo lo que
  aparece en el hero y en "Proceso" ya existe hoy en el código
  (hardcodeado) o en `config` (días, horario, zonas de envío).
