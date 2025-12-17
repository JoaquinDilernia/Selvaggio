// EJEMPLOS DE VINOS Y PRODUCTOS PARA CARGAR EN LA BASE DE DATOS

/*
===============================================
VINOS - Colección: selvaggio_vinos
===============================================

ESTRUCTURA:
{
  nombre: string (requerido),
  categoria: string (requerido) - "Tintos" | "Blancos" | "Rosados" | "Espumantes" | "Otros",
  bodega: string (opcional),
  varietal: string (opcional),
  descripcion: string (opcional),
  precio: number (opcional),
  orden: number (opcional, default: 0),
  fechaCreacion: timestamp
}

EJEMPLOS TINTOS:
1. Catena Zapata Malbec Argentino
   - Categoría: Tintos
   - Bodega: Catena Zapata
   - Varietal: Malbec
   - Descripción: Valle de Uco, Mendoza • Robusto y elegante con notas de frutos rojos
   - Precio: 12500
   - Orden: 1

2. Luigi Bosca Cabernet Sauvignon
   - Categoría: Tintos
   - Bodega: Luigi Bosca
   - Varietal: Cabernet Sauvignon
   - Descripción: Luján de Cuyo • Taninos sedosos, paladar largo y complejo
   - Precio: 9800
   - Orden: 2

3. Zuccardi Serie A Bonarda
   - Categoría: Tintos
   - Bodega: Zuccardi
   - Varietal: Bonarda
   - Descripción: Santa Rosa • Frutal y fresco, ideal para compartir
   - Precio: 7200
   - Orden: 3

EJEMPLOS BLANCOS:
1. Rutini Chardonnay
   - Categoría: Blancos
   - Bodega: Rutini
   - Varietal: Chardonnay
   - Descripción: Valle de Uco • Fresco y mineral con paso por barrica
   - Precio: 10200
   - Orden: 1

2. Salentein Sauvignon Blanc
   - Categoría: Blancos
   - Bodega: Salentein
   - Varietal: Sauvignon Blanc
   - Descripción: Mendoza • Cítrico y aromático, perfecto aperitivo
   - Precio: 7800
   - Orden: 2

EJEMPLOS ROSADOS:
1. Rosell Boher Rosé
   - Categoría: Rosados
   - Bodega: Rosell Boher
   - Varietal: Rosé de Malbec
   - Descripción: Valle de Uco • Fresco y frutal, color salmón
   - Precio: 7500
   - Orden: 1

EJEMPLOS ESPUMANTES:
1. Chandon Extra Brut
   - Categoría: Espumantes
   - Bodega: Chandon
   - Varietal: Extra Brut
   - Descripción: Mendoza • Burbujas finas, elegante y festivo
   - Precio: 9500
   - Orden: 1

===============================================
PRODUCTOS - Colección: selvaggio_productos
===============================================

ESTRUCTURA:
{
  nombre: string (requerido),
  categoria: string (requerido) - "Quesos" | "Fiambres" | "Panes" | "Conservas" | "Otros",
  origen: string (opcional),
  descripcion: string (opcional),
  precio: number (opcional, precio por 100g),
  orden: number (opcional, default: 0),
  fechaCreacion: timestamp
}

EJEMPLOS QUESOS:
1. Parmesano Reggiano
   - Categoría: Quesos
   - Origen: Italia
   - Descripción: 24 meses de maduración. Textura granulosa, sabor intenso y umami
   - Precio: 1200
   - Orden: 1

2. Roquefort
   - Categoría: Quesos
   - Origen: Francia
   - Descripción: Queso azul cremoso con vetas verdes. Sabor intenso y salado
   - Precio: 1400
   - Orden: 2

3. Brie
   - Categoría: Quesos
   - Origen: Francia
   - Descripción: Suave y cremoso, corteza comestible. Sabor delicado y mantecoso
   - Precio: 950
   - Orden: 3

4. Queso de Cabra
   - Categoría: Quesos
   - Origen: Argentina
   - Descripción: Fresco y untable. Notas herbales y ligeramente ácidas
   - Precio: 800
   - Orden: 4

5. Gruyere
   - Categoría: Quesos
   - Origen: Suiza
   - Descripción: Semi-duro con sabor a nuez. Perfecto para fundir o en tablas
   - Precio: 1100
   - Orden: 5

EJEMPLOS FIAMBRES:
1. Jamón Crudo
   - Categoría: Fiambres
   - Origen: Italia
   - Descripción: Curado 18 meses. Sabor delicado y textura sedosa
   - Precio: 1300
   - Orden: 1

2. Salame Milán
   - Categoría: Fiambres
   - Origen: Argentina
   - Descripción: Embutido curado con especias. Sabor intenso y aromático
   - Precio: 850
   - Orden: 2

3. Mortadela con Pistachos
   - Categoría: Fiambres
   - Origen: Italia
   - Descripción: Suave y sedosa con pistachos enteros. Clásico italiano
   - Precio: 700
   - Orden: 3

4. Coppa
   - Categoría: Fiambres
   - Origen: Italia
   - Descripción: Cuello de cerdo curado. Sabor intenso con vetas de grasa
   - Precio: 1150
   - Orden: 4

EJEMPLOS PANES:
1. Baguette Francesa
   - Categoría: Panes
   - Origen: Francia
   - Descripción: Corteza crujiente, miga aireada. Horneado del día
   - Precio: 400
   - Orden: 1

2. Ciabatta
   - Categoría: Panes
   - Origen: Italia
   - Descripción: Pan artesanal con aceite de oliva. Ideal para tablas
   - Precio: 450
   - Orden: 2

3. Pan de Campo
   - Categoría: Panes
   - Origen: Argentina
   - Descripción: Rústico con semillas. Miga densa y sabor intenso
   - Precio: 500
   - Orden: 3

EJEMPLOS CONSERVAS:
1. Aceitunas Verdes
   - Categoría: Conservas
   - Origen: España
   - Descripción: Manzanilla con pimiento. Sabor suave y aromático
   - Precio: 600
   - Orden: 1

2. Tomates Secos
   - Categoría: Conservas
   - Origen: Italia
   - Descripción: En aceite de oliva con hierbas. Sabor concentrado
   - Precio: 700
   - Orden: 2

===============================================
INSTRUCCIONES DE USO:
===============================================

1. Para VINOS: Ir a /#/admin-vinos
2. Para PRODUCTOS: Ir a /#/admin-productos
3. Completar el formulario con los datos de cada ejemplo
4. Click en "Crear Vino" o "Crear Producto"
5. Los items aparecerán automáticamente en la landing

NOTAS:
- El campo "Orden" determina la posición dentro de cada categoría
- Los precios son opcionales pero recomendados
- Las descripciones ayudan a que el cliente tome decisiones
- Podés editar o eliminar items en cualquier momento

*/
