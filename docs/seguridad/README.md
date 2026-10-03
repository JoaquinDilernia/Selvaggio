# Seguridad de datos — Selvaggio (Fase 2)

Firestore y Storage viven en el proyecto **compartido** `pedidos-lett-2` (ALMA,
bots, Gineza, WinBiz, etc.). Las reglas son UNA sola para todo el proyecto.

## Estado al 2026-10-02

- Las reglas vivas (`firestore-live-*.rules`) se pegaron desde la consola el
  18/9. **`ALMA/firestore.rules` está desactualizado** (agosto, sin la parte de
  bots): si alguien hace `firebase deploy --only firestore:rules` desde ALMA,
  pisa todo y reabre las colecciones de los bots.
- El comodín final deja **lectura y escritura públicas** a todo lo que no esté
  listado → hoy cualquiera con la config pública de Firebase (está en el JS de
  la landing) puede leer/borrar `selvaggio_clientes`, reservas, comandas,
  invitaciones, etc.
- Las colecciones del bot usan `bot-selvaggio_*`, que el comodín ya trata
  como server-only (sin acceso desde el navegador).

## Etapa A — `firestore-propuesta-fase2.rules`

Es el ruleset vivo + un bloque SELVAGGIO + `isSelvaggio()` excluida del comodín
(si no se excluye, el comodín sigue abriéndolas: en reglas alcanza con que UN
match permita). Cambia solamente colecciones `selvaggio_*`; el resto queda
idéntico.

| Colecciones | Público | Staff |
|---|---|---|
| Contenido (carta, vinos, productos, eventos, galería, prensa, calendario, tw_*…) | leer | admin escribe |
| contacto, postulaciones, newsletter, analytics | solo crear | admin lee/gestiona |
| invitaciones | — | admin |
| pedidos (comandas) | — | admin, caja, cocina |
| cupones | consultar uno por código, sumar uso | admin lista/edita |
| reservas mesas/cava, takeaway_pedidos, clientes | **siguen legibles** (Etapa B) | admin/staff edita y borra |

**Antes de publicar:** la landing nueva (login con usuarios del panel) tiene
que estar subida a Hostinger. Si se publican las reglas con la landing vieja,
el admin/caja/cocina viejos (contraseña única, sin Firebase Auth) se quedan
sin poder escribir.

**Cómo publicar:** consola de Firebase → Firestore → Reglas → pegar el archivo
completo → "Publicar" (la consola lo compila antes). Para volver atrás, pegar
`firestore-live-*.rules`.

**Probar después:** reservar mesa, reservar cava con comprobante, pedido take
away con y sin cupón, seguimiento de pedido, formulario de contacto y
"trabajá con nosotros", y en el staff: admin (cada tab), caja carga, cocina
cambia estado/borra.

## Etapa B — pendiente

Las 4 colecciones que todavía se leen desde el navegador:
- **Disponibilidad de reservas** (`getDocs` de TODAS las reservas para ver qué
  días/horarios quedan) → endpoint del backend que devuelva solo fechas/cupos.
- **Alta de reservas y upsert de `selvaggio_clientes`** → endpoint del backend.
- **Seguimiento de take away** (busca por `numeroPedido`, que es adivinable) →
  endpoint que devuelva solo estado/horario.
- **Total del pedido y cupón** se calculan en el navegador → validar en backend.

## Storage — pendiente

`galeria/`, `prensa/`, `carta/`, `eventos/`, `tw_picadas/`, `comprobantes/`
están en la raíz del bucket compartido y hoy aceptan escritura pública (en
`comprobantes/` hay archivos que no son comprobantes). `galeria/` tiene al
menos un archivo que parece de otro proyecto, así que no se pueden cerrar por
nombre de carpeta sin riesgo: el plan es mover las subidas de Selvaggio a
`selvaggio/<carpeta>/` y cerrar ese prefijo.
