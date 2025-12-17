import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PaginasLegales.css';

function Gracias() {
  const navigate = useNavigate();

  useEffect(() => {
    // Volver al inicio después de 5 segundos
    const timer = setTimeout(() => {
      navigate('/landing');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="pagina-legal pagina-gracias">
      <div className="gracias-container">
        <div className="gracias-icon">✓</div>
        <h1>¡Gracias por contactarnos!</h1>
        <p className="gracias-mensaje">
          Recibimos tu mensaje correctamente. Nos pondremos en contacto con vos 
          a la brevedad.
        </p>

        <div className="gracias-info">
          <h3>También podés contactarnos por:</h3>
          <div className="contacto-opciones">
            <a 
              href="https://wa.me/5491156864692?text=Hola!%20Quiero%20consultar" 
              target="_blank" 
              rel="noopener noreferrer"
              className="contacto-item"
            >
              <span className="contacto-icon">📱</span>
              <div>
                <strong>WhatsApp</strong>
                <p>Respuesta inmediata</p>
              </div>
            </a>

            <a 
              href="https://www.instagram.com/selvaggio.ba?igsh=MW1lbnVkcjdzcWUyeQ==" 
              target="_blank" 
              rel="noopener noreferrer"
              className="contacto-item"
            >
              <span className="contacto-icon">📸</span>
              <div>
                <strong>Instagram</strong>
                <p>@selvaggio.ba</p>
              </div>
            </a>
          </div>
        </div>

        <div className="gracias-actions">
          <a href="/landing" className="btn-primary">
            Volver al inicio
          </a>
          <a href="/landing#vinos" className="btn-secondary">
            Ver nuestra cava
          </a>
        </div>

        <p className="auto-redirect">
          Serás redirigido automáticamente en unos segundos...
        </p>
      </div>
    </div>
  );
}

export default Gracias;
