import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import './EventoPopup.css';

function EventoPopup({ evento: eventoProp, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [evento, setEvento] = useState(null);

  // Mode 1: manual trigger via prop
  useEffect(() => {
    if (eventoProp) {
      setEvento(eventoProp);
      setIsVisible(true);
    }
  }, [eventoProp]);

  // Mode 2: auto popup on page load
  useEffect(() => {
    if (eventoProp) return; // skip auto if manual
    const popupShown = sessionStorage.getItem('eventoPopupShown');
    if (popupShown) return;

    const cargar = async () => {
      try {
        const snap = await getDocs(collection(db, 'selvaggio_eventos'));
        const popupEvento = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .find(e => e.esPopup);
        
        if (!popupEvento) return;
        
        setEvento(popupEvento);
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 800);
        return () => clearTimeout(timer);
      } catch (err) {
        console.error('Error cargando popup:', err);
      }
    };
    cargar();
  }, [eventoProp]);

  const handleClose = () => {
    setIsVisible(false);
    if (!eventoProp) sessionStorage.setItem('eventoPopupShown', 'true');
    if (onClose) onClose();
  };

  if (!isVisible || !evento) return null;

  const imagenPopup = evento.popupImagen || evento.imagen;
  const ctaTexto = evento.ctaTexto || 'Reservar mesa';
  const ctaLink = evento.ctaLink || '/reserva-mesas';

  if (!imagenPopup) return null;

  return (
    <div className="evento-popup-overlay" onClick={handleClose}>
      <div className="evento-popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="evento-popup-close" onClick={handleClose} aria-label="Cerrar">
          ✕
        </button>
        <div className="evento-popup-image-container">
          <img 
            src={imagenPopup} 
            alt={evento.titulo || 'Evento Selvaggio Wine'}
            className="evento-popup-image"
          />
        </div>
        {ctaLink && (
          <Link to={ctaLink} className="evento-popup-cta" onClick={handleClose}>
            {ctaTexto}
          </Link>
        )}
      </div>
    </div>
  );
}

export default EventoPopup;
