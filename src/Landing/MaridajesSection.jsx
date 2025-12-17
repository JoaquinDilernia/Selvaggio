import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

function MaridajesSection() {
  const [maridajes, setMaridajes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarMaridajes();
  }, []);

  const cargarMaridajes = async () => {
    try {
      const maridajesRef = collection(db, 'selvaggio_maridajes');
      const snapshot = await getDocs(maridajesRef);
      
      const maridajesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Ordenar manualmente por orden si existe, sino por fecha
      maridajesData.sort((a, b) => {
        if (a.orden !== undefined && b.orden !== undefined) {
          return a.orden - b.orden;
        }
        return 0;
      });

      setMaridajes(maridajesData);
    } catch (error) {
      console.error('Error al cargar maridajes:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <section className="maridajes-section">
        <div className="section-content">
          <h2 className="section-title">Cargando maridajes...</h2>
        </div>
      </section>
    );
  }

  if (maridajes.length === 0) {
    return null; // No mostrar la sección si no hay maridajes
  }

  return (
    <section id="maridajes" className="maridajes-section">
      <div className="section-content">
        <h2 className="section-title animate-on-scroll">Maridajes Perfectos</h2>
        <p className="maridajes-intro animate-on-scroll">
          Combinaciones pensadas para potenciar sabores. Dejate guiar por nuestras recomendaciones.
        </p>
        
        <div className="maridajes-grid">
          {maridajes.map((maridaje) => (
            <div key={maridaje.id} className="maridaje-card animate-on-scroll">
              <div className="maridaje-header">
                <h3 className="maridaje-producto">{maridaje.producto}</h3>
                <span className="maridaje-tipo">{maridaje.tipo}</span>
              </div>
              
              <div className="maridaje-pairing">
                <span className="pairing-icon">🍷</span>
                <div className="pairing-info">
                  <h4>{maridaje.vino}</h4>
                  {maridaje.varietal && (
                    <span className="varietal">{maridaje.varietal}</span>
                  )}
                </div>
              </div>
              
              {maridaje.descripcion && (
                <p className="maridaje-descripcion">{maridaje.descripcion}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MaridajesSection;
