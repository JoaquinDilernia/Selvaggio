# 📊 Plantilla para Importación Masiva de Productos

## Formato del Excel

El archivo Excel (.xlsx o .xls) debe tener las siguientes columnas en la primera fila:

| nombre | categoria | origen | descripcion | precio | orden | visible |
|--------|-----------|--------|-------------|--------|-------|---------|
| Parmesano Reggiano | Quesos | Italia | Queso italiano de textura granulada, sabor intenso y notas dulces | 1200 | 1 | true |
| Jamón Crudo | Fiambres | España | Jamón curado artesanalmente, sabor suave y delicado | 950 | 1 | true |
| Pan de Campo | Panes | Argentina | Pan rústico de masa madre, corteza crocante | 450 | 1 | true |

## Columnas

### Obligatorias
- **nombre**: Nombre del producto (texto)
- **categoria**: Una de estas opciones: Quesos, Fiambres, Panes, Conservas, Otros

### Opcionales
- **origen**: País o región de origen (texto)
- **descripcion**: Descripción del producto (texto)
- **precio**: Precio por 100g (número, sin símbolos)
- **orden**: Número de orden para visualización (número entero)
- **visible**: true para mostrar en la web, false para ocultar (true/false)

## Ejemplo de datos

```
nombre,categoria,origen,descripcion,precio,orden,visible
Parmesano Reggiano,Quesos,Italia,Queso italiano de textura granulada,1200,1,true
Gorgonzola,Quesos,Italia,Queso azul cremoso de sabor intenso,1100,2,true
Manchego,Quesos,España,Queso semicurado de leche de oveja,980,3,true
Jamón Crudo,Fiambres,España,Jamón curado artesanalmente,950,1,true
Salame Milano,Fiambres,Italia,Salame italiano de grano fino,850,2,true
Prosciutto,Fiambres,Italia,Jamón italiano curado,1050,3,true
Pan de Campo,Panes,Argentina,Pan rústico de masa madre,450,1,true
Focaccia,Panes,Italia,Pan plano con aceite de oliva,520,2,true
Aceitunas Kalamata,Conservas,Grecia,Aceitunas negras en salmuera,680,1,true
```

## Instrucciones

1. Abre Excel o Google Sheets
2. Crea una nueva hoja con las columnas indicadas
3. Rellena los datos de tus productos
4. Guarda el archivo como .xlsx o .xls
5. En el panel de admin, usa el botón "Seleccionar Excel" para importar

## Notas
- Puedes importar cientos de productos a la vez
- Si una fila no tiene nombre o categoría, se saltará
- Los productos se crearán automáticamente en Firebase
- Después de importar, puedes editar cada producto individualmente
