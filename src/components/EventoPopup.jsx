import { useState, useEffect } from 'react';
import './EventoPopup.css';

function EventoPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificar si el popup ya se mostró en esta sesión
    const popupShown = sessionStorage.getItem('eventoPopupShown');
    
    if (!popupShown) {
      // Mostrar el popup después de un pequeño delay para mejor UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('eventoPopupShown', 'true');
  };

  const handleComprar = () => {
    window.open('https://astrovinito.com/event/59342-edicion-aire-selvaggio-wine-san-isidro?eventDateId=106760', '_blank');
  };

  if (!isVisible) return null;

  return (
    <div className="evento-popup-overlay" onClick={handleClose}>
      <div className="evento-popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="evento-popup-close" onClick={handleClose} aria-label="Cerrar">
          ✕
        </button>
        <div className="evento-popup-image-container">
          <img 
            src="/evento.jpeg" 
            alt="Edición Aire - Evento especial en Selvaggio Wine"
            className="evento-popup-image"
          />
        </div>
        <button className="evento-popup-cta" onClick={handleComprar}>
          🎟️ Comprar Entrada
        </button>
      </div>
    </div>
  );
}

export default EventoPopup;
