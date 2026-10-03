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

## Etapa B — código listo (backend en producción, landing en la rama `etapa-b-landing`)

Lo que la landing hacía desde el navegador ahora lo hace el backend
(`/api/public/*`, ver `server/src/routes/reservas.routes.js`):

| Antes (navegador → Firestore) | Ahora |
|---|---|
| Bajaba TODAS las reservas de mesa/cava para calcular cupos | `GET mesas/disponibilidad`, `GET cava/ocupadas` (solo cupos/fechas) |
| `addDoc` de la reserva + upsert de `selvaggio_clientes` | `POST reservas/mesas` (cupo revalidado en transacción) |
| Subía el comprobante a `comprobantes/` (escritura pública) y creaba la reserva de cava | `POST reservas/cava` multipart → `selvaggio/comprobantes/`, día bloqueado en transacción |
| Calculaba precios, cupón y descuento y escribía el pedido con el total que quisiera | `POST takeaway/cupon` (preview) y `POST takeaway/pedidos`: todo recalculado con el catálogo |
| Seguimiento por número (adivinable) con `onSnapshot` | `GET takeaway/seguimiento` con número + últimos 4 del teléfono |
| Admin subía a `carta/`, `galeria/`, `prensa/`, `tw_picadas/`, `eventos/` | `selvaggio/<carpeta>/` |

Siguen leyendo Firestore directo (y está bien): catálogo de take away,
carta, vinos, eventos, galería, calendario, config. El admin/caja/cocina
siguen escribiendo directo, pero ahora autenticados (claim `selvaggioRole`).

## Orden del corte (cuando se decida)

1. Mergear `etapa-b-landing` a `master`, `npm run build`, subir `dist/` a
   Hostinger. Probar: reserva de mesa, reserva de cava con comprobante,
   pedido take away con y sin cupón (MOMENTO10 está activo), seguimiento,
   y en el admin subir una imagen.
2. Publicar **`firestore-propuesta-etapa-b.rules`** (Etapa A + cierra
   cupones, reservas, take away y clientes al público). Si la landing vieja
   sigue online, publicar en su lugar `firestore-propuesta-fase2.rules`.
3. Publicar **`storage-propuesta-etapa-b.rules`**: cierra el prefijo
   `selvaggio/` (lectura pública solo de imágenes/carta, escritura solo admin,
   `comprobantes/` sin acceso desde el navegador). Las carpetas viejas de la
   raíz (`galeria/`, `comprobantes/`…) NO se tocan: pueden ser de otros
   proyectos; cuando se confirme que no, se pueden cerrar o migrar.
4. Para volver atrás: pegar los `*-live-*.rules` correspondientes.
