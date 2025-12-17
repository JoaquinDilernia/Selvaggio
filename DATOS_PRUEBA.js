// Script para cargar datos de prueba en Firebase
// Ejecutar desde la consola del navegador en cualquier página con Firebase inicializado

const VINOS_PRUEBA = [
  // Tintos
  {
    nombre: "Luigi Bosca Malbec",
    categoria: "Tintos",
    bodega: "Luigi Bosca",
    varietal: "Malbec",
    descripcion: "Intenso y frutado con notas a ciruelas y especias. Ideal para carnes rojas y quesos maduros.",
    precio: 12500,
    orden: 1
  },
  {
    nombre: "Catena Zapata Malbec",
    categoria: "Tintos",
    bodega: "Catena Zapata",
    varietal: "Malbec",
    descripcion: "Elegante y complejo, con taninos suaves y final largo. Perfecto para quesos azules.",
    precio: 18900,
    orden: 2
  },
  {
    nombre: "Trapiche Medalla Cabernet Sauvignon",
    categoria: "Tintos",
    bodega: "Trapiche",
    varietal: "Cabernet Sauvignon",
    descripcion: "Robusto y estructurado con notas a frutos negros. Excelente con fiambres curados.",
    precio: 8200,
    orden: 3
  },
  {
    nombre: "Norton Reserva Merlot",
    categoria: "Tintos",
    bodega: "Norton",
    varietal: "Merlot",
    descripcion: "Suave y aterciopelado con aromas a frutas rojas maduras. Ideal para quesos semi-duros.",
    precio: 9500,
    orden: 4
  },
  
  // Blancos
  {
    nombre: "Trumpeter Torrontés",
    categoria: "Blancos",
    bodega: "Trumpeter",
    varietal: "Torrontés",
    descripcion: "Fresco y aromático con notas florales. Perfecto para quesos de cabra y fiambres suaves.",
    precio: 6800,
    orden: 5
  },
  {
    nombre: "Rutini Chardonnay",
    categoria: "Blancos",
    bodega: "Rutini Wines",
    varietal: "Chardonnay",
    descripcion: "Elegante con paso por madera, notas a vainilla y frutas tropicales. Excelente con quesos cremosos.",
    precio: 11200,
    orden: 6
  },
  {
    nombre: "Familia Cassone Sauvignon Blanc",
    categoria: "Blancos",
    bodega: "Familia Cassone",
    varietal: "Sauvignon Blanc",
    descripcion: "Fresco y cítrico con buena acidez. Ideal para quesos frescos y conservas.",
    precio: 7500,
    orden: 7
  },

  // Rosados
  {
    nombre: "Santa Julia Rosé",
    categoria: "Rosados",
    bodega: "Santa Julia",
    varietal: "Malbec Rosé",
    descripcion: "Fresco y frutal con notas a frutillas. Perfecto para tablas de fiambres y quesos suaves.",
    precio: 5900,
    orden: 8
  },
  {
    nombre: "Esmeralda Rosado",
    categoria: "Rosados",
    bodega: "Finca Las Moras",
    varietal: "Rosé de Malbec",
    descripcion: "Delicado y aromático con final refrescante. Ideal para picadas al aire libre.",
    precio: 6200,
    orden: 9
  },

  // Espumantes
  {
    nombre: "Nieto Senetiner Brut Nature",
    categoria: "Espumantes",
    bodega: "Nieto Senetiner",
    varietal: "Espumante Brut Nature",
    descripcion: "Burbujas finas y elegantes, ideal para celebrar. Perfecto con quesos azules y frutos secos.",
    precio: 8900,
    orden: 10
  },
  {
    nombre: "Cruzat Extra Brut",
    categoria: "Espumantes",
    bodega: "Cruzat",
    varietal: "Espumante Extra Brut",
    descripcion: "Sofisticado método champenoise, burbujas cremosas. Excelente con jamón crudo.",
    precio: 14500,
    orden: 11
  }
];

const PRODUCTOS_PRUEBA = [
  // Quesos
  {
    nombre: "Parmesano Reggiano",
    categoria: "Quesos",
    origen: "Italia",
    descripcion: "Queso duro italiano de textura granulosa y sabor intenso. 24 meses de maduración.",
    precio: 3500,
    orden: 1
  },
  {
    nombre: "Roquefort",
    categoria: "Quesos",
    origen: "Francia",
    descripcion: "Queso azul francés cremoso con vetas de moho azul-verdoso. Sabor intenso y salado.",
    precio: 4200,
    orden: 2
  },
  {
    nombre: "Brie",
    categoria: "Quesos",
    origen: "Francia",
    descripcion: "Queso cremoso de pasta blanda con corteza blanca aterciopelada. Suave y mantecoso.",
    precio: 3800,
    orden: 3
  },
  {
    nombre: "Manchego",
    categoria: "Quesos",
    origen: "España",
    descripcion: "Queso español de oveja, semi-duro con sabor ligeramente picante. 6 meses de curación.",
    precio: 3200,
    orden: 4
  },
  {
    nombre: "Gruyère",
    categoria: "Quesos",
    origen: "Suiza",
    descripcion: "Queso suizo de textura firme y sabor ligeramente dulce con notas a nuez.",
    precio: 3600,
    orden: 5
  },
  {
    nombre: "Camembert",
    categoria: "Quesos",
    origen: "Francia",
    descripcion: "Queso cremoso de Normandía con corteza blanca florida. Sabor delicado y mantecoso.",
    precio: 3400,
    orden: 6
  },
  {
    nombre: "Gorgonzola",
    categoria: "Quesos",
    origen: "Italia",
    descripcion: "Queso azul italiano cremoso con sabor fuerte y picante. Perfecto para untar.",
    precio: 3900,
    orden: 7
  },
  {
    nombre: "Provolone",
    categoria: "Quesos",
    origen: "Italia",
    descripcion: "Queso semi-duro italiano de sabor suave a ligeramente picante según maduración.",
    precio: 2800,
    orden: 8
  },

  // Fiambres
  {
    nombre: "Jamón Crudo",
    categoria: "Fiambres",
    origen: "Italia (estilo Parma)",
    descripcion: "Jamón curado artesanalmente, cortado finamente. Sabor delicado y textura sedosa.",
    precio: 4500,
    orden: 9
  },
  {
    nombre: "Jamón Serrano",
    categoria: "Fiambres",
    origen: "España",
    descripcion: "Jamón curado español de sabor intenso y textura firme. 18 meses de curación.",
    precio: 5200,
    orden: 10
  },
  {
    nombre: "Salame Milano",
    categoria: "Fiambres",
    origen: "Italia",
    descripcion: "Salame italiano finamente picado, sabor delicado con un toque de ajo.",
    precio: 3200,
    orden: 11
  },
  {
    nombre: "Bondiola",
    categoria: "Fiambres",
    origen: "Argentina",
    descripcion: "Carne de cerdo curada y especiada, jugosa y llena de sabor.",
    precio: 2900,
    orden: 12
  },
  {
    nombre: "Chorizo Español",
    categoria: "Fiambres",
    origen: "España",
    descripcion: "Embutido curado de cerdo con pimentón. Sabor intenso y ligeramente picante.",
    precio: 2700,
    orden: 13
  },
  {
    nombre: "Mortadela Artesanal",
    categoria: "Fiambres",
    origen: "Italia",
    descripcion: "Mortadela italiana con pistachos, suave y aromática.",
    precio: 2500,
    orden: 14
  },
  {
    nombre: "Coppa",
    categoria: "Fiambres",
    origen: "Italia",
    descripcion: "Lomo de cerdo curado con especias, marmoleado y jugoso.",
    precio: 4800,
    orden: 15
  },

  // Panes
  {
    nombre: "Pan de Campo",
    categoria: "Panes",
    origen: "Artesanal",
    descripcion: "Pan rústico de masa madre con corteza crujiente. Perfecto para acompañar tablas.",
    precio: 1500,
    orden: 16
  },
  {
    nombre: "Grisines Caseros",
    categoria: "Panes",
    origen: "Artesanal",
    descripcion: "Palitos de pan crocantes con semillas de sésamo y romero.",
    precio: 800,
    orden: 17
  },
  {
    nombre: "Focaccia de Olivas",
    categoria: "Panes",
    origen: "Italia",
    descripcion: "Pan italiano esponjoso con aceitunas negras y aceite de oliva.",
    precio: 1800,
    orden: 18
  },

  // Conservas
  {
    nombre: "Aceitunas Negras Griegas",
    categoria: "Conservas",
    origen: "Grecia",
    descripcion: "Aceitunas Kalamata en aceite de oliva con hierbas mediterráneas.",
    precio: 1200,
    orden: 19
  },
  {
    nombre: "Tomates Secos",
    categoria: "Conservas",
    origen: "Italia",
    descripcion: "Tomates deshidratados en aceite de oliva con albahaca.",
    precio: 1400,
    orden: 20
  },
  {
    nombre: "Mix de Frutos Secos",
    categoria: "Conservas",
    origen: "Nacional",
    descripcion: "Nueces, almendras, avellanas y castañas de cajú tostadas.",
    precio: 1600,
    orden: 21
  },
  {
    nombre: "Mermelada de Higos",
    categoria: "Conservas",
    origen: "Artesanal",
    descripcion: "Mermelada casera de higos negros. Ideal para combinar con quesos.",
    precio: 1100,
    orden: 22
  }
];

const MARIDAJES_PRUEBA = [
  {
    producto: "Roquefort",
    tipo: "Queso",
    vino: "Catena Zapata Malbec",
    varietal: "Malbec",
    descripcion: "El dulzor del Malbec equilibra perfectamente la intensidad salada del Roquefort. Un maridaje clásico.",
    orden: 1
  },
  {
    producto: "Jamón Crudo",
    tipo: "Fiambre",
    vino: "Cruzat Extra Brut",
    varietal: "Espumante Extra Brut",
    descripcion: "Las burbujas limpian el paladar entre cada bocado de jamón, realzando su delicadeza.",
    orden: 2
  },
  {
    producto: "Brie",
    tipo: "Queso",
    vino: "Rutini Chardonnay",
    varietal: "Chardonnay",
    descripcion: "La cremosidad del Brie se complementa con las notas mantecosas del Chardonnay.",
    orden: 3
  },
  {
    producto: "Salame Milano",
    tipo: "Fiambre",
    vino: "Trapiche Medalla Cabernet Sauvignon",
    varietal: "Cabernet Sauvignon",
    descripcion: "Los taninos del Cabernet cortan la grasa del salame, creando un balance perfecto.",
    orden: 4
  },
  {
    producto: "Manchego",
    tipo: "Queso",
    vino: "Luigi Bosca Malbec",
    varietal: "Malbec",
    descripcion: "El sabor intenso del Manchego curado se potencia con las notas especiadas del Malbec.",
    orden: 5
  },
  {
    producto: "Parmesano Reggiano",
    tipo: "Queso",
    vino: "Norton Reserva Merlot",
    varietal: "Merlot",
    descripcion: "La complejidad del Parmesano encuentra su par en el Merlot suave y frutal.",
    orden: 6
  }
];

// Función para cargar en Firebase (ejecutar en consola del navegador)
async function cargarDatosPrueba() {
  // Importar Firebase desde el script global
  const { collection, addDoc, serverTimestamp } = window.firebaseFirestore;
  const db = window.firebaseDb;

  try {
    console.log('🍷 Cargando vinos...');
    for (const vino of VINOS_PRUEBA) {
      await addDoc(collection(db, 'selvaggio_vinos'), {
        ...vino,
        fechaCreacion: serverTimestamp()
      });
    }
    console.log(`✅ ${VINOS_PRUEBA.length} vinos cargados`);

    console.log('🧀 Cargando productos...');
    for (const producto of PRODUCTOS_PRUEBA) {
      await addDoc(collection(db, 'selvaggio_productos'), {
        ...producto,
        fechaCreacion: serverTimestamp()
      });
    }
    console.log(`✅ ${PRODUCTOS_PRUEBA.length} productos cargados`);

    console.log('✨ Cargando maridajes...');
    for (const maridaje of MARIDAJES_PRUEBA) {
      await addDoc(collection(db, 'selvaggio_maridajes'), {
        ...maridaje,
        fechaCreacion: serverTimestamp()
      });
    }
    console.log(`✅ ${MARIDAJES_PRUEBA.length} maridajes cargados`);

    console.log('🎉 ¡Todos los datos de prueba fueron cargados exitosamente!');
  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
  }
}

// Instrucciones para ejecutar:
console.log(`
📋 INSTRUCCIONES PARA CARGAR DATOS DE PRUEBA:

1. Abre el sitio en el navegador (http://localhost:5173)
2. Abre la consola del navegador (F12)
3. Copia y pega este archivo completo en la consola
4. Ejecuta: cargarDatosPrueba()
5. Espera a que termine (verás mensajes de progreso)

Los datos incluyen:
- ${VINOS_PRUEBA.length} vinos (tintos, blancos, rosados, espumantes)
- ${PRODUCTOS_PRUEBA.length} productos (quesos, fiambres, panes, conservas)
- ${MARIDAJES_PRUEBA.length} maridajes recomendados

¡Listo para probar! 🍷🧀
`);
