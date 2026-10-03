// Solo para pruebas locales: con SELVAGGIO_TEST_WRITES=1 las ALTAS públicas
// (pedidos de take away, reservas de cava/mesa de la web, clientes) se
// escriben en `bot-selvaggio_test_<colección>` en vez de las colecciones que
// ve la web (Cocina escucha los pedidos en tiempo real). Las lecturas de
// catálogo, agenda y cupones siguen siendo las reales. Nunca setear en Railway.
export function colEscritura(nombre) {
  return process.env.SELVAGGIO_TEST_WRITES === '1' ? `bot-selvaggio_test_${nombre}` : nombre;
}
