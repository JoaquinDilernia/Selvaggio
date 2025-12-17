import { useState } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/config';

const VINOS_PRUEBA = [
  // Tintos
  { nombre: "Luigi Bosca Malbec", categoria: "Tintos", bodega: "Luigi Bosca", varietal: "Malbec", descripcion: "Intenso y frutado con notas a ciruelas y especias. Ideal para carnes rojas y quesos maduros.", precio: 12500, orden: 1 },
  { nombre: "Catena Zapata Malbec", categoria: "Tintos", bodega: "Catena Zapata", varietal: "Malbec", descripcion: "Elegante y complejo, con taninos suaves y final largo. Perfecto para quesos azules.", precio: 18900, orden: 2 },
  { nombre: "Trapiche Medalla Cabernet Sauvignon", categoria: "Tintos", bodega: "Trapiche", varietal: "Cabernet Sauvignon", descripcion: "Robusto y estructurado con notas a frutos negros. Excelente con fiambres curados.", precio: 8200, orden: 3 },
  { nombre: "Norton Reserva Merlot", categoria: "Tintos", bodega: "Norton", varietal: "Merlot", descripcion: "Suave y aterciopelado con aromas a frutas rojas maduras. Ideal para quesos semi-duros.", precio: 9500, orden: 4 },
  
  // Blancos
  { nombre: "Trumpeter Torrontés", categoria: "Blancos", bodega: "Trumpeter", varietal: "Torrontés", descripcion: "Fresco y aromático con notas florales. Perfecto para quesos de cabra y fiambres suaves.", precio: 6800, orden: 5 },
  { nombre: "Rutini Chardonnay", categoria: "Blancos", bodega: "Rutini Wines", varietal: "Chardonnay", descripcion: "Elegante con paso por madera, notas a vainilla y frutas tropicales. Excelente con quesos cremosos.", precio: 11200, orden: 6 },
  { nombre: "Familia Cassone Sauvignon Blanc", categoria: "Blancos", bodega: "Familia Cassone", varietal: "Sauvignon Blanc", descripcion: "Fresco y cítrico con buena acidez. Ideal para quesos frescos y conservas.", precio: 7500, orden: 7 },

  // Rosados
  { nombre: "Santa Julia Rosé", categoria: "Rosados", bodega: "Santa Julia", varietal: "Malbec Rosé", descripcion: "Fresco y frutal con notas a frutillas. Perfecto para tablas de fiambres y quesos suaves.", precio: 5900, orden: 8 },
  { nombre: "Esmeralda Rosado", categoria: "Rosados", bodega: "Finca Las Moras", varietal: "Rosé de Malbec", descripcion: "Delicado y aromático con final refrescante. Ideal para picadas al aire libre.", precio: 6200, orden: 9 },

  // Espumantes
  { nombre: "Nieto Senetiner Brut Nature", categoria: "Espumantes", bodega: "Nieto Senetiner", varietal: "Espumante Brut Nature", descripcion: "Burbujas finas y elegantes, ideal para celebrar. Perfecto con quesos azules y frutos secos.", precio: 8900, orden: 10 },
  { nombre: "Cruzat Extra Brut", categoria: "Espumantes", bodega: "Cruzat", varietal: "Espumante Extra Brut", descripcion: "Sofisticado método champenoise, burbujas cremosas. Excelente con jamón crudo.", precio: 14500, orden: 11 }
];

const PRODUCTOS_PRUEBA = [
  // Quesos
  { nombre: "Parmesano Reggiano", categoria: "Quesos", origen: "Italia", descripcion: "Queso duro italiano de textura granulosa y sabor intenso. 24 meses de maduración.", precio: 3500, orden: 1 },
  { nombre: "Roquefort", categoria: "Quesos", origen: "Francia", descripcion: "Queso azul francés cremoso con vetas de moho azul-verdoso. Sabor intenso y salado.", precio: 4200, orden: 2 },
  { nombre: "Brie", categoria: "Quesos", origen: "Francia", descripcion: "Queso cremoso de pasta blanda con corteza blanca aterciopelada. Suave y mantecoso.", precio: 3800, orden: 3 },
  { nombre: "Manchego", categoria: "Quesos", origen: "España", descripcion: "Queso español de oveja, semi-duro con sabor ligeramente picante. 6 meses de curación.", precio: 3200, orden: 4 },
  { nombre: "Gruyère", categoria: "Quesos", origen: "Suiza", descripcion: "Queso suizo de textura firme y sabor ligeramente dulce con notas a nuez.", precio: 3600, orden: 5 },
  { nombre: "Camembert", categoria: "Quesos", origen: "Francia", descripcion: "Queso cremoso de Normandía con corteza blanca florida. Sabor delicado y mantecoso.", precio: 3400, orden: 6 },
  { nombre: "Gorgonzola", categoria: "Quesos", origen: "Italia", descripcion: "Queso azul italiano cremoso con sabor fuerte y picante. Perfecto para untar.", precio: 3900, orden: 7 },
  { nombre: "Provolone", categoria: "Quesos", origen: "Italia", descripcion: "Queso semi-duro italiano de sabor suave a ligeramente picante según maduración.", precio: 2800, orden: 8 },

  // Fiambres
  { nombre: "Jamón Crudo", categoria: "Fiambres", origen: "Italia (estilo Parma)", descripcion: "Jamón curado artesanalmente, cortado finamente. Sabor delicado y textura sedosa.", precio: 4500, orden: 9 },
  { nombre: "Jamón Serrano", categoria: "Fiambres", origen: "España", descripcion: "Jamón curado español de sabor intenso y textura firme. 18 meses de curación.", precio: 5200, orden: 10 },
  { nombre: "Salame Milano", categoria: "Fiambres", origen: "Italia", descripcion: "Salame italiano finamente picado, sabor delicado con un toque de ajo.", precio: 3200, orden: 11 },
  { nombre: "Bondiola", categoria: "Fiambres", origen: "Argentina", descripcion: "Carne de cerdo curada y especiada, jugosa y llena de sabor.", precio: 2900, orden: 12 },
  { nombre: "Chorizo Español", categoria: "Fiambres", origen: "España", descripcion: "Embutido curado de cerdo con pimentón. Sabor intenso y ligeramente picante.", precio: 2700, orden: 13 },
  { nombre: "Mortadela Artesanal", categoria: "Fiambres", origen: "Italia", descripcion: "Mortadela italiana con pistachos, suave y aromática.", precio: 2500, orden: 14 },
  { nombre: "Coppa", categoria: "Fiambres", origen: "Italia", descripcion: "Lomo de cerdo curado con especias, marmoleado y jugoso.", precio: 4800, orden: 15 },

  // Panes
  { nombre: "Pan de Campo", categoria: "Panes", origen: "Artesanal", descripcion: "Pan rústico de masa madre con corteza crujiente. Perfecto para acompañar tablas.", precio: 1500, orden: 16 },
  { nombre: "Grisines Caseros", categoria: "Panes", origen: "Artesanal", descripcion: "Palitos de pan crocantes con semillas de sésamo y romero.", precio: 800, orden: 17 },
  { nombre: "Focaccia de Olivas", categoria: "Panes", origen: "Italia", descripcion: "Pan italiano esponjoso con aceitunas negras y aceite de oliva.", precio: 1800, orden: 18 },

  // Conservas
  { nombre: "Aceitunas Negras Griegas", categoria: "Conservas", origen: "Grecia", descripcion: "Aceitunas Kalamata en aceite de oliva con hierbas mediterráneas.", precio: 1200, orden: 19 },
  { nombre: "Tomates Secos", categoria: "Conservas", origen: "Italia", descripcion: "Tomates deshidratados en aceite de oliva con albahaca.", precio: 1400, orden: 20 },
  { nombre: "Mix de Frutos Secos", categoria: "Conservas", origen: "Nacional", descripcion: "Nueces, almendras, avellanas y castañas de cajú tostadas.", precio: 1600, orden: 21 },
  { nombre: "Mermelada de Higos", categoria: "Conservas", origen: "Artesanal", descripcion: "Mermelada casera de higos negros. Ideal para combinar con quesos.", precio: 1100, orden: 22 }
];

const MARIDAJES_PRUEBA = [
  { producto: "Roquefort", tipo: "Queso", vino: "Catena Zapata Malbec", varietal: "Malbec", descripcion: "El dulzor del Malbec equilibra perfectamente la intensidad salada del Roquefort. Un maridaje clásico.", orden: 1 },
  { producto: "Jamón Crudo", tipo: "Fiambre", vino: "Cruzat Extra Brut", varietal: "Espumante Extra Brut", descripcion: "Las burbujas limpian el paladar entre cada bocado de jamón, realzando su delicadeza.", orden: 2 },
  { producto: "Brie", tipo: "Queso", vino: "Rutini Chardonnay", varietal: "Chardonnay", descripcion: "La cremosidad del Brie se complementa con las notas mantecosas del Chardonnay.", orden: 3 },
  { producto: "Salame Milano", tipo: "Fiambre", vino: "Trapiche Medalla Cabernet Sauvignon", varietal: "Cabernet Sauvignon", descripcion: "Los taninos del Cabernet cortan la grasa del salame, creando un balance perfecto.", orden: 4 },
  { producto: "Manchego", tipo: "Queso", vino: "Luigi Bosca Malbec", varietal: "Malbec", descripcion: "El sabor intenso del Manchego curado se potencia con las notas especiadas del Malbec.", orden: 5 },
  { producto: "Parmesano Reggiano", tipo: "Queso", vino: "Norton Reserva Merlot", varietal: "Merlot", descripcion: "La complejidad del Parmesano encuentra su par en el Merlot suave y frutal.", orden: 6 }
];

const GALERIA_PRUEBA = [
  { url: "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800", titulo: "Tabla de Quesos Premium", categoria: "Productos", descripcion: "Selección de quesos artesanales con frutos secos", orden: 1, visible: true },
  { url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800", titulo: "Picada Completa", categoria: "Productos", descripcion: "Tabla de fiambres, quesos y acompañamientos", orden: 2, visible: true },
  { url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800", titulo: "Ambiente Acogedor", categoria: "Ambiente", descripcion: "Nuestro espacio diseñado para disfrutar", orden: 3, visible: true },
  { url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800", titulo: "Selección de Vinos", categoria: "Productos", descripcion: "Nuestra cava de vinos argentinos e internacionales", orden: 4, visible: true },
  { url: "https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=800", titulo: "Copa de Vino Tinto", categoria: "Productos", descripcion: "Malbec servido en copa", orden: 5, visible: true },
  { url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800", titulo: "Evento Privado", categoria: "Eventos", descripcion: "Cata de vinos para grupos", orden: 6, visible: true }
];

const RESEÑAS_PRUEBA = [
  { nombre: "María González", comentario: "Increíble experiencia! Los quesos son de altísima calidad y la recomendación de maridaje fue perfecta. El ambiente es súper acogedor.", calificacion: 5, fecha: "2024-11-15", destacada: true, orden: 1, visible: true },
  { nombre: "Lucas Fernández", comentario: "Excelente atención y productos de primera. El Roquefort con Malbec que nos recomendaron fue una combinación espectacular.", calificacion: 5, fecha: "2024-11-20", destacada: true, orden: 2, visible: true },
  { nombre: "Ana Martínez", comentario: "Muy linda propuesta! Los fiambres son deliciosos y tienen muy buena variedad de vinos. Ideal para ir con amigos.", calificacion: 5, fecha: "2024-11-25", destacada: false, orden: 3, visible: true },
  { nombre: "Javier Rodríguez", comentario: "Me encantó la cava privada! Perfecta para celebrar ocasiones especiales. La tabla de jamón crudo estaba increíble.", calificacion: 5, fecha: "2024-11-28", destacada: true, orden: 4, visible: true },
  { nombre: "Carolina Pérez", comentario: "Lugar hermoso y muy buena onda. Los quesos franceses son un espectáculo. Volveremos seguro!", calificacion: 4, fecha: "2024-12-01", destacada: false, orden: 5, visible: true }
];

const PRENSA_PRUEBA = [
  { medio: "La Nación", titulo: "Los mejores wine bars de Buenos Aires para disfrutar del otoño", url: "https://ejemplo.com/lanacion", fecha: "2024-04-15", descripcion: "Selvaggio se destaca por su cuidada selección de quesos importados y vinos de alta gama, creando una experiencia única en el barrio.", imagen: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600", orden: 1, visible: true },
  { medio: "Clarín", titulo: "Picadas gourmet: los nuevos espacios que combinan tradición y modernidad", url: "https://ejemplo.com/clarin", fecha: "2024-06-20", descripcion: "Con un enfoque en el maridaje perfecto, este local se posiciona como referente en experiencias gastronómicas.", imagen: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600", orden: 2, visible: true },
  { medio: "Revista Vinos", titulo: "Las cavas privadas más exclusivas de la ciudad", url: "https://ejemplo.com/revistavinos", fecha: "2024-08-10", descripcion: "Selvaggio ofrece una experiencia inmersiva con su cava privada, ideal para catas y eventos corporativos.", imagen: "", orden: 3, visible: true },
  { medio: "Infobae", titulo: "Dónde comer las mejores tablas de quesos y fiambres", url: "https://ejemplo.com/infobae", fecha: "2024-10-05", descripcion: "La atención personalizada y el conocimiento del equipo sobre maridajes hace la diferencia en cada visita.", imagen: "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=600", orden: 4, visible: true }
];

function CargarDatosPrueba() {
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [completado, setCompletado] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    setProgreso('');
    setCompletado(false);

    try {
      // Verificar si ya hay datos
      setProgreso('🔍 Verificando datos existentes...');
      const vinosSnapshot = await getDocs(collection(db, 'selvaggio_vinos'));
      
      if (vinosSnapshot.size > 0) {
        const confirmar = window.confirm(
          `Ya hay ${vinosSnapshot.size} vinos cargados en la base de datos.\n\n` +
          `¿Querés cargar los datos de prueba de todas formas? Esto agregará items duplicados.\n\n` +
          `Si querés empezar de cero, primero borrá los datos desde Firebase Console.`
        );
        
        if (!confirmar) {
          setCargando(false);
          setProgreso('❌ Carga cancelada');
          return;
        }
      }

      // Cargar vinos
      setProgreso('🍷 Cargando vinos...');
      for (const vino of VINOS_PRUEBA) {
        await addDoc(collection(db, 'selvaggio_vinos'), {
          ...vino,
          visible: true,
          fechaCreacion: serverTimestamp()
        });
      }
      setProgreso(`✅ ${VINOS_PRUEBA.length} vinos cargados`);
      await new Promise(r => setTimeout(r, 500));

      // Cargar productos
      setProgreso('🧀 Cargando productos...');
      for (const producto of PRODUCTOS_PRUEBA) {
        await addDoc(collection(db, 'selvaggio_productos'), {
          ...producto,
          visible: true,
          fechaCreacion: serverTimestamp()
        });
      }
      setProgreso(`✅ ${PRODUCTOS_PRUEBA.length} productos cargados`);
      await new Promise(r => setTimeout(r, 500));

      // Cargar maridajes
      setProgreso('✨ Cargando maridajes...');
      for (const maridaje of MARIDAJES_PRUEBA) {
        await addDoc(collection(db, 'selvaggio_maridajes'), {
          ...maridaje,
          fechaCreacion: serverTimestamp()
        });
      }
      setProgreso(`✅ ${MARIDAJES_PRUEBA.length} maridajes cargados`);
      await new Promise(r => setTimeout(r, 500));

      // Cargar galería
      setProgreso('📸 Cargando galería...');
      for (const foto of GALERIA_PRUEBA) {
        await addDoc(collection(db, 'selvaggio_galeria'), {
          ...foto,
          fechaCreacion: serverTimestamp()
        });
      }
      setProgreso(`✅ ${GALERIA_PRUEBA.length} fotos cargadas`);
      await new Promise(r => setTimeout(r, 500));

      // Cargar reseñas
      setProgreso('⭐ Cargando reseñas...');
      for (const reseña of RESEÑAS_PRUEBA) {
        await addDoc(collection(db, 'selvaggio_reseñas'), {
          ...reseña,
          fechaCreacion: serverTimestamp()
        });
      }
      setProgreso(`✅ ${RESEÑAS_PRUEBA.length} reseñas cargadas`);
      await new Promise(r => setTimeout(r, 500));

      // Cargar prensa
      setProgreso('📰 Cargando prensa...');
      for (const nota of PRENSA_PRUEBA) {
        await addDoc(collection(db, 'selvaggio_prensa'), {
          ...nota,
          fechaCreacion: serverTimestamp()
        });
      }
      setProgreso(`✅ ${PRENSA_PRUEBA.length} notas de prensa cargadas`);
      
      setCompletado(true);
      setProgreso('🎉 ¡Todos los datos fueron cargados exitosamente!');
    } catch (error) {
      console.error('Error:', error);
      setProgreso(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '50px auto',
      padding: '30px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      fontFamily: 'system-ui'
    }}>
      <h1 style={{ color: '#430a33', marginBottom: '20px' }}>
        Cargar Datos de Prueba
      </h1>
      
      <div style={{ marginBottom: '25px', color: '#666', lineHeight: '1.6' }}>
        <p><strong>Se cargarán:</strong></p>
        <ul>
          <li>{VINOS_PRUEBA.length} vinos (tintos, blancos, rosados, espumantes)</li>
          <li>{PRODUCTOS_PRUEBA.length} productos (quesos, fiambres, panes, conservas)</li>
          <li>{MARIDAJES_PRUEBA.length} maridajes recomendados</li>
          <li>{GALERIA_PRUEBA.length} fotos para galería</li>
          <li>{RESEÑAS_PRUEBA.length} reseñas de clientes</li>
          <li>{PRENSA_PRUEBA.length} notas de prensa</li>
        </ul>
      </div>

      <button
        onClick={cargarDatos}
        disabled={cargando || completado}
        style={{
          width: '100%',
          padding: '15px',
          background: completado ? '#4caf50' : (cargando ? '#999' : 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)'),
          color: completado ? 'white' : '#1a1a2e',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: cargando || completado ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {cargando ? 'Cargando...' : (completado ? '✓ Datos Cargados' : 'Cargar Datos en Firebase')}
      </button>

      {progreso && (
        <div style={{
          padding: '15px',
          background: completado ? '#e8f5e9' : '#f5f5f5',
          borderRadius: '8px',
          color: completado ? '#2e7d32' : '#333',
          whiteSpace: 'pre-line'
        }}>
          {progreso}
        </div>
      )}

      {completado && (
        <p style={{ marginTop: '20px', color: '#666', textAlign: 'center' }}>
          Ya podés ir a la landing o a los admin panels para ver los datos cargados!
        </p>
      )}
    </div>
  );
}

export default CargarDatosPrueba;
