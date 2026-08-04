# Analytics: filtros de fecha, comparación de períodos y desglose por día

## Contexto y objetivo

El dashboard nativo de analytics ([[2026-07-08-native-analytics-dashboard-design]])
ya trackea eventos por categoría (Cava, Mesa, Take Away) y muestra un funnel
con 3 presets de rango (Hoy / 7 días / 30 días). El diseño original ya preveía
un "rango personalizado" que nunca se implementó, y hoy no hay forma de:

- Elegir un rango de fechas arbitrario.
- Comparar el período elegido contra el período anterior equivalente.
- Ver qué días de la semana traen más tráfico/conversión.
- Ver la evolución día a día dentro del rango.
- Mirar el funnel de una sola categoría sin los otros dos al lado.

Además, el cálculo de "hoy" y de los cortes de día depende de la hora local
del navegador que abre el panel, sin forzar la zona horaria del negocio
(Argentina). Este proyecto arregla eso de raíz, no como respuesta a un bug
reportado sino para que quede robusto independientemente de dónde se abra
el panel.

## Alcance

Todo el trabajo es dentro de `src/Admin/tabs/AnalyticsTab.jsx` y sus nuevos
subcomponentes. No se toca el modelo de datos de
`selvaggio_analytics_eventos` ni el helper de tracking
(`src/utils/nativeAnalytics.js`) — solo se agregan lecturas nuevas sobre los
eventos existentes.

## Zona horaria

Todo el bucketing por día (para "Hoy", para el desglose semanal y para la
evolución diaria) se calcula explícitamente en `America/Argentina/Buenos_Aires`,
usando `Intl.DateTimeFormat` con `timeZone` fijo — nunca la hora local del
navegador. Se agrega un helper nuevo, `src/utils/analyticsDate.js`:

- `claveDiaAR(timestamp)`: devuelve `'YYYY-MM-DD'` del timestamp en TZ
  Argentina (vía `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', ... })`,
  que ya da el formato ISO directamente).
- `diaSemanaAR(timestamp)`: devuelve `0-6` (Lunes=0 … Domingo=6) del
  timestamp en TZ Argentina.
- `inicioDiaAR(date)` / `finDiaAR(date)`: dado un `Date` (o string
  `YYYY-MM-DD`), devuelve el `Date` correspondiente a las 00:00:00.000 /
  23:59:59.999 de ese día en TZ Argentina, para armar los límites de la
  query de Firestore.

## Filtros

Nueva barra de filtros (`FiltersBar`, dentro de
`src/Admin/tabs/analytics/FiltersBar.jsx`), con tres controles:

1. **Presets de rango**: los mismos botones Hoy / 7 días / 30 días que ya
   existen, ahora seteando explícitamente `fechaDesde`/`fechaHasta` (en vez
   de solo "días atrás desde ahora").
2. **Rango personalizado**: dos `<input type="date">` (Desde / Hasta). Al
   tocar cualquiera de los dos, se desmarca el preset activo. `Hasta` no
   puede ser posterior a hoy ni anterior a `Desde` (se corrige
   automáticamente si el usuario cruza las fechas).
3. **Selector de categoría**: `Todas | La Cava | Mesa | Take Away`. Afecta
   qué funnels se muestran y qué eventos alimentan los gráficos de día de
   semana / evolución diaria.

El estado de filtros vive en `AnalyticsTab.jsx` (`fechaDesde`, `fechaHasta`,
`categoria`) y se pasa hacia abajo. Cambiar cualquier filtro dispara un
nuevo fetch.

## Fetch de datos

Una sola query cubre desde el **inicio del período anterior** hasta el
**fin del período actual**:

```js
const duracionMs = finDiaAR(fechaHasta) - inicioDiaAR(fechaDesde);
const inicioAnterior = new Date(inicioDiaAR(fechaDesde) - duracionMs);

const q = query(
  collection(db, 'selvaggio_analytics_eventos'),
  where('timestamp', '>=', Timestamp.fromDate(inicioAnterior)),
  where('timestamp', '<=', Timestamp.fromDate(finDiaAR(fechaHasta)))
);
```

Los documentos resultantes se separan client-side en `eventosActuales`
(timestamp ≥ inicio del período actual) y `eventosAnteriores` (el resto).
Esto reemplaza el `useEffect` + `cargar()` actual; misma forma general
(`cargando`, `try/catch`, `setEventos([])` en error), pero ahora guarda
ambos arrays.

## Comparación vs. período anterior

En cada paso de cada funnel, junto al valor actual, se agrega un badge de
variación porcentual contra el mismo paso en `eventosAnteriores`:

- `+18% vs. anterior` (verde/positivo), `−9% vs. anterior` (rojo/negativo).
  El color de este badge es un par de estado (bueno/malo), independiente
  de la paleta categórica que usan los gráficos de Clicks/Conversiones —
  no se reutiliza esa paleta acá.
- Casos borde para evitar división por cero: si anterior = 0 y actual = 0,
  no se muestra badge (no hubo cambio real). Si anterior = 0 y actual > 0,
  se muestra `nuevo` en vez de un porcentaje (evita `+Infinity%`).
- Convive con el indicador de caída entre pasos que ya existe (`−X% vs.
  paso anterior`) — son dos badges distintos, uno compara pasos dentro del
  mismo funnel, el otro compara el mismo paso entre períodos.

## Filtro de categoría sobre los funnels

Cuando `categoria !== 'todas'`, `FunnelsSection` renderiza un solo
`an-funnel` a ancho completo (en vez del grid de 3), reutilizando el mismo
componente de card. Cuando es `'todas'`, comportamiento actual sin cambios.

## Gráfico "Por día de la semana"

Nuevo componente `src/Admin/tabs/analytics/DayOfWeekChart.jsx`. Barras
agrupadas Lunes→Domingo, 2 series por día:

- **Clicks**: suma de `click_reservar_cava` + `click_reservar_mesa` +
  `click_take_away` (o solo el evento de click correspondiente si hay un
  filtro de categoría activo).
- **Conversiones**: eventos `tipo === 'conversion'` (mismo filtro de
  categoría aplicado).

Construido a mano en HTML/CSS/SVG (sin librería nueva), siguiendo el mismo
lenguaje visual que las barras del funnel ya existentes. Con solo 7 días ×
2 series, los valores se muestran siempre como etiqueta directa (sin
tooltip/hover) — a esa cardinalidad la etiqueta fija se lee mejor que una
interacción. Lleva leyenda (2 series = identidad no puede depender solo del
color). Paleta: 2 colores categóricos fijos (Clicks / Conversiones),
tomados de la paleta de referencia de la skill `dataviz` y validados con
`validate_palette.js` contra el fondo de la card (`#fff`) antes de
implementar.

Los eventos se agrupan con `diaSemanaAR(e.timestamp)` sobre
`eventosActuales` (el período de comparación anterior no participa de este
gráfico).

## Gráfico "Evolución diaria"

Nuevo componente `src/Admin/tabs/analytics/DailyEvolutionChart.jsx`.
Gráfico de líneas (2px, extremos redondeados) con las mismas 2 series
(Clicks / Conversiones), un punto por cada día dentro de `[fechaDesde,
fechaHasta]` (agrupado con `claveDiaAR`), incluyendo días en cero. A
diferencia del gráfico semanal, acá el rango puede tener muchos días
(hasta 30 en los presets, o más en un rango custom), así que en vez de
etiquetas fijas lleva **crosshair + tooltip** al pasar el mouse, mostrando
fecha + valores de ambas series. Grid/ejes recesivos, leyenda igual que el
gráfico anterior. Reutiliza la misma paleta de 2 colores.

## Componentes — estructura final

```
src/Admin/tabs/AnalyticsTab.jsx          — orquesta estado, fetch, layout
src/Admin/tabs/analytics/FiltersBar.jsx        — presets + rango custom + categoría
src/Admin/tabs/analytics/FunnelsSection.jsx    — cards de funnel (existente + badge comparación + filtro categoría)
src/Admin/tabs/analytics/DayOfWeekChart.jsx    — barras agrupadas Lun-Dom
src/Admin/tabs/analytics/DailyEvolutionChart.jsx — línea temporal con tooltip
src/utils/analyticsDate.js                     — helpers de fecha/TZ
```

CSS: se extiende `AnalyticsTab.css` con las clases nuevas (`an-filters`,
`an-badge`, `an-dow`, `an-evol`), siguiendo la paleta y tipografía que ya
usa el archivo (Cormorant Garant para números destacados, `#7a1c1c` como
color de marca).

## Manejo de errores

Mismo patrón que hoy: si el fetch falla, se loguea a consola y se muestra
un estado vacío (sin eventos) — no se interrumpe el resto del panel ni se
le muestra un error crudo al usuario administrador.

## Fuera de alcance

- Exportar datos o comparar automáticamente contra Meta Ads (ya estaba
  fuera de alcance en el diseño original y sigue sin pedirse).
- Dimensión de ubicación del click dentro de la landing.
- Retención/purga de eventos viejos.
- Filtros combinados adicionales (por sessionId, por página, etc.) — no
  fueron pedidos.
