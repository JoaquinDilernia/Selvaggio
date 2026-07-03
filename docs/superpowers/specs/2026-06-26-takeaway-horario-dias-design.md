# Take Away: restricciones de horario y días

**Fecha:** 2026-06-26  
**Estado:** Aprobado

## Contexto

El Take Away tiene un toggle manual `activo` en Firebase que hoy controla si el botón aparece en la landing y si se pueden hacer pedidos. El negocio necesita también:

- Que el botón **siempre sea visible** en la landing.
- Restricción automática por **horario de atención** (ej: a partir de las 18hs).
- Restricción automática por **días de la semana** (ej: cerrado domingos y lunes).
- Que ambas restricciones sean **configurables desde el admin** sin tocar código.
- Conservar el toggle manual `activo` para cierres de emergencia.

---

## Modelo de datos

Documento Firebase: `selvaggio_configuracion/takeaway_config`

```json
{
  "activo": true,
  "horarioDesde": 18,
  "horarioHasta": 23,
  "diasAbiertos": [2, 3, 4, 5, 6]
}
```

- `diasAbiertos`: array de enteros donde `0` = domingo, `1` = lunes, …, `6` = sábado.
- Valor por defecto si no existe el campo: abierto los 7 días, sin restricción horaria.
- Los campos nuevos se guardan con `setDoc(..., { merge: true })` para no romper docs existentes.

---

## Lógica en `TakeAway.jsx`

Se evalúan los checks en orden. El primero que falla muestra su pantalla y corta:

| Prioridad | Condición | Pantalla |
|-----------|-----------|----------|
| 1 | `activo === false` | "No disponible" (igual que hoy) |
| 2 | día actual no está en `diasAbiertos` | "Cerrado hoy" |
| 3 | hora actual < `horarioDesde` o ≥ `horarioHasta` | "Fuera de horario" |
| 4 | todo OK | Catálogo normal |

### Estado adicional

```js
const [config, setConfig] = useState(null); // { activo, horarioDesde, horarioHasta, diasAbiertos }
```

El `useEffect` existente que leía solo `activo` pasa a leer todos los campos del doc.

### Pantalla "Cerrado hoy"

Muestra el ícono de reloj/calendario, título "Cerrado hoy", subtítulo con los días en que sí abre listados individualmente (ej: "Abrimos martes, miércoles, jueves, viernes y sábado") y botón "← Volver al inicio". Si `diasAbiertos` está vacío o no existe, no se muestra esta pantalla (sin restricción de día).

### Pantalla "Fuera de horario"

Muestra ícono de reloj, título "Fuera de horario", subtítulo "Los pedidos están disponibles de [X] a [Y] hs" y botón "← Volver al inicio". Si no hay `horarioHasta` configurado, dice "a partir de las [X] hs".

---

## Cambios en `LandingDemo.jsx`

Los dos condicionales `{takeawayActivo && <Link to="/take-away">…</Link>}` se reemplazan por el enlace directo sin condición. El botón siempre se renderiza.

El estado `takeawayActivo` y el fetch de Firebase en LandingDemo se eliminan.

---

## Cambios en `AdminTakeAway.jsx`

En el componente `AdminTakeAway` (función principal), debajo del bloque toggle Activo/Inactivo, se agrega una sección de configuración de horario y días:

### Estado nuevo

```js
const [horarioDesde, setHorarioDesde] = useState(18);
const [horarioHasta, setHorarioHasta] = useState(23);
const [diasAbiertos, setDiasAbiertos] = useState([2, 3, 4, 5, 6]);
const [guardandoConfig, setGuardandoConfig] = useState(false);
```

### UI de días

7 chips clicables `Dom Lun Mar Mié Jue Vie Sáb`. Click togglea el día en el array. Se guarda en Firebase al hacer click en "Guardar".

### UI de horario

Dos inputs numéricos (1–24) en línea: "Desde [18] hs" y "Hasta [23] hs". Botón "Guardar" único para horario + días.

### Banner de inactivo actualizado

```
El Take Away está desactivado. El botón sigue visible en la web pero no se pueden hacer pedidos.
```

---

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/LandingDemo/LandingDemo.jsx` | Quitar condicional `takeawayActivo`, eliminar fetch |
| `src/TakeAway/TakeAway.jsx` | Ampliar fetch de config, agregar 2 pantallas nuevas |
| `src/Admin/AdminTakeAway.jsx` | Agregar config de horario y días en header |

No se agregan archivos nuevos ni dependencias.
