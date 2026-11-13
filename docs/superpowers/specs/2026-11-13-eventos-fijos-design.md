# Eventos fijos (semanales) — diseño

**Por qué:** el equipo cargaba eventos recurrentes (Pintura y Vino todos los viernes) fecha por fecha; el 13/11 no lo cargaron, la KB decía "todos los viernes" y el bot le creyó a la agenda → info errónea a clientes.

**Objetivo:** cargar un evento una vez como fijo ("todos los viernes", opcional "hasta") y que aparezca solo cada semana en web, bot, calendario y reservas.
**No-objetivos:** reglas complejas (cada 2 semanas, mensual, varios días por serie). **Anti-objetivo:** romper reservas de eventos o llenar la web de repetidos.

## Enfoques
1. **Materializar (elegido):** el servidor genera documentos normales en `selvaggio_eventos` por fecha. Los 6 consumidores (landing, popup, calendario, bot agenda, reservas por eventoId, gestión) no cambian.
2. Guardar solo la regla y expandir en cada consumidor: toca 6 lugares y las reservas no tienen doc al que atarse. Descartado.

## Diseño
- Colección `selvaggio_eventos_fijos`: mismos campos que un evento (titulo, horaInicio, horaFin, descripcion, infoBot, imagen, ctaTexto, ctaLink, visible) + `diaSemana` (0=dom…6=sáb), `desde` (YYYY-MM-DD), `hasta` (opcional), `activo`.
- Generados: doc en `selvaggio_eventos` con id determinístico `fijo_<serieId>_<fecha>` (idempotente), `serieId`, `fecha`, y campos copiados.
- Horizonte: hoy (AR) → +56 días. Corre al arrancar, todos los días, y al cambiar una serie (onSnapshot en el server).
- Cambios en la serie → se actualizan los generados futuros salvo `editadoManual: true` (el panel lo marca al editar un generado).
- Borrar/ocultar una fecha generada → queda tumba en `serie.excluidas[]` (fecha) y no se regenera. Panel: al borrar un generado, agrega la fecha a `excluidas`.
- Borrar/desactivar la serie → se borran los generados futuros no editados a mano (pasados quedan).
- Panel Eventos: selector "Se repite: no / todos los <día>" + "hasta"; sección "🔁 Eventos fijos" arriba; generados con marca "🔁".
- Landing: de cada `serieId` se muestra solo la próxima fecha.
- Popup (`esPopup`) no se copia a los generados (solo eventos sueltos).

## Decisiones del builder
Horizonte 8 semanas; ids determinísticos; generación en el server (Railway) con firebase-admin.
