import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

function CartaSection() {
  const [cartaUrl, setCartaUrl] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarCarta();
  }, []);

  const cargarCarta = async () => {
    try {
      const cartaRef = doc(db, 'selvaggio_configuracion', 'carta');
      const cartaDoc = await getDoc(cartaRef);
      
      if (cartaDoc.exists() && cartaDoc.data().url && !cartaDoc.data().eliminada) {
        setCartaUrl(cartaDoc.data().url);
      }
    } catch (error) {
      console.error('Error al cargar carta:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <section id="carta" className="vinos-section">
        <div className="section-content">
          <div className="section-header">
            <h2>Nuestra Carta</h2>
            <p className="section-description">Cargando...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!cartaUrl) {
    return (
      <section id="carta" className="vinos-section" style={{ background: '#0a0a0a', padding: '80px 20px' }}>
        <div className="section-content" style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div className="section-header">
            <h2 style={{ color: '#b794c7', fontSize: '3rem', marginBottom: '15px' }}>Nuestra Carta</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem' }}>
              📄 Carta próximamente disponible
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="carta" className="vinos-section" style={{ background: '#0a0a0a', padding: '80px 20px' }}>
      <div className="section-content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ color: '#b794c7', fontSize: '3rem', marginBottom: '15px' }}>Nuestra Carta</h2>
          <p className="section-description" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem' }}>
            Descubrí nuestra selección de vinos, quesos y fiambres premium
          </p>
        </div>

        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '20px', 
          padding: '30px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
        }}>
          {/* Botón para ver en pantalla completa */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '15px',
            marginBottom: '20px' 
          }}>
            <a 
              href={cartaUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                padding: '12px 30px',
                background: 'linear-gradient(135deg, #b794c7 0%, #916faa 100%)',
                color: '#1a1a1a',
                textDecoration: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'transform 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              📄 Ver Carta Completa
            </a>
            <a 
              href={cartaUrl}
              download="Carta-Selvaggio.pdf"
              style={{
                padding: '12px 30px',
                background: 'rgba(255,255,255,0.1)',
                color: '#b794c7',
                textDecoration: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                border: '2px solid #b794c7',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(212,175,55,0.2)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ⬇️ Descargar PDF
            </a>
          </div>

          {/* Visor del PDF */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '800px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid rgba(212,175,55,0.3)'
          }}>
            <iframe
              src={`${cartaUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              title="Carta Selvaggio"
            />
          </div>

          {/* Nota para móviles */}
          <div style={{ 
            marginTop: '20px', 
            textAlign: 'center',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem'
          }}>
            <p style={{ margin: 0 }}>
              📱 En dispositivos móviles, tocá "Ver Carta Completa" para una mejor experiencia
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CartaSection;
