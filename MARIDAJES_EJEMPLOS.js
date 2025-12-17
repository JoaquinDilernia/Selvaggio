// Script de ejemplo para insertar maridajes en Firebase
// Ejecutar desde la consola del navegador en /admin-maridajes

/*
EJEMPLOS DE MARIDAJES PARA COPIAR/PEGAR EN EL ADMIN:

1. Roquefort
   - Producto: Roquefort
   - Tipo: Queso
   - Vino: Late Harvest
   - Varietal: Torrontés
   - Descripción: El dulzor del vino equilibra la intensidad y salinidad del queso azul
   - Orden: 1

2. Jamón Crudo
   - Producto: Jamón Crudo
   - Tipo: Fiambre
   - Vino: Malbec Reserva
   - Varietal: Malbec
   - Descripción: Los taninos del Malbec complementan la grasa y sabor intenso del jamón
   - Orden: 2

3. Queso de Cabra
   - Producto: Queso de Cabra
   - Tipo: Queso
   - Vino: Sauvignon Blanc
   - Varietal: Sauvignon Blanc
   - Descripción: La acidez del blanco resalta la cremosidad y notas herbales del queso
   - Orden: 3

4. Parmesano
   - Producto: Parmesano Reggiano
   - Tipo: Queso
   - Vino: Cabernet Sauvignon
   - Varietal: Cabernet
   - Descripción: Maridaje clásico, la estructura del vino realza los cristales salados del queso
   - Orden: 4

5. Salame
   - Producto: Salame
   - Tipo: Fiambre
   - Vino: Bonarda
   - Varietal: Bonarda
   - Descripción: El frutado de la Bonarda equilibra las especias del salame
   - Orden: 5

6. Brie
   - Producto: Brie
   - Tipo: Queso
   - Vino: Chardonnay
   - Varietal: Chardonnay
   - Descripción: La mantecosidad del Chardonnay complementa la textura cremosa del Brie
   - Orden: 6

INSTRUCCIONES:
1. Ir a /#/admin-maridajes
2. Completar el formulario con cada ejemplo
3. Click en "Crear Maridaje"
4. Repetir para cada maridaje
5. Ver los resultados en /#/landing

COLECCIÓN FIREBASE: selvaggio_maridajes

ESTRUCTURA:
{
  producto: string (requerido),
  tipo: string (requerido) - "Queso" | "Fiambre" | "Pan" | "Conserva" | "Otro",
  vino: string (requerido),
  varietal: string (opcional),
  descripcion: string (opcional),
  orden: number (opcional, default: 0),
  fechaCreacion: timestamp
}
*/
