import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SkeletonGrid } from '../components/SkeletonLoader';

function VinosSection() {
  const [vinos, setVinos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarVinos();
  }, []);

  const cargarVinos = async () => {
    try {
      const vinosRef = collection(db, 'selvaggio_vinos');
      const snapshot = await getDocs(vinosRef);
      
      const vinosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(vino => vino.visible !== false); // Solo mostrar vinos visibles

      // Ordenar manualmente
      vinosData.sort((a, b) => (a.orden || 0) - (b.orden || 0));

      // Agrupar por categoría
      const agrupadosPorCategoria = vinosData.reduce((acc, vino) => {
        const cat = vino.categoria || 'Otros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(vino);
        return acc;
      }, {});

      setVinos(agrupadosPorCategoria);
    } catch (error) {
      console.error('Error al cargar vinos:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <section id="vinos" className="vinos-section">
        <div className="section-content">
          <h2 className="section-title">Nuestra Cava de Vinos</h2>
          <SkeletonGrid count={6} />
        </div>
      </section>
    );
  }

  const categorias = Object.keys(vinos);

  if (categorias.length === 0) {
    return null; // No mostrar si no hay vinos
  }

  const categoriasOrdenadas = ['Tintos', 'Blancos', 'Rosados', 'Espumantes', 'Otros'].filter(cat => categorias.includes(cat));
  const otrasCateg = categorias.filter(cat => !categoriasOrdenadas.includes(cat));
  const todasCategorias = [...categoriasOrdenadas, ...otrasCateg];

  return (
    <section id="vinos" className="vinos-section">
      <div className="section-content">
        <h2 className="section-title animate-on-scroll">Nuestra selección de vinos</h2>
        <p className="vinos-intro animate-on-scroll">
          Esta es una muestra de nuestra carta. Explorá nuestra cava con más de 150 etiquetas cuidadosamente seleccionadas de diferentes bodegas, varietales y regiones.
        </p>

        <div className="tip-maridaje-vinos animate-on-scroll">
          <span className="tip-icon">💡</span>
          <p><strong>Tip:</strong> Nuestro staff puede recomendarte el maridaje perfecto para tu picada. Cada vino tiene su compañero ideal.</p>
        </div>
        
        <div className="vinos-categorias">
          {todasCategorias.map((categoria) => (
            <div key={categoria} className="vino-categoria animate-on-scroll">
              <h3 className="categoria-title">{categoria}</h3>
              <div className="vinos-lista">
                {vinos[categoria].map((vino) => (
                  <div key={vino.id} className="vino-item">
                    <div className="vino-header">
                      <h4>{vino.nombre}</h4>
                      {vino.precio && <span className="vino-precio">${vino.precio.toLocaleString()}</span>}
                    </div>
                    {vino.bodega && (
                      <p className="vino-bodega">{vino.bodega}</p>
                    )}
                    {vino.varietal && (
                      <p className="vino-varietal">{vino.varietal}</p>
                    )}
                    {vino.descripcion && (
                      <p className="vino-descripcion">{vino.descripcion}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default VinosSection;
