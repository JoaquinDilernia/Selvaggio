import { Link } from 'react-router-dom';
import './PaginasLegales.css';

function Page404() {
  return (
    <div className="pagina-legal page-404">
      <div className="error-container">
        <div className="error-code">404</div>
        <h1>Página no encontrada</h1>
        <p>Lo sentimos, la página que buscás no existe o fue movida.</p>
        
        <div className="error-actions">
          <Link to="/landing" className="btn-primary">
            Volver al inicio
          </Link>
          <a 
            href="https://wa.me/5491156864692?text=Hola!%20Necesito%20ayuda" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Contactar por WhatsApp
          </a>
        </div>

        <div className="error-suggestions">
          <h3>Quizás te interese:</h3>
          <ul>
            <li><Link to="/landing#vinos">Ver nuestra cava de vinos</Link></li>
            <li><Link to="/landing#productos">Explorar productos gourmet</Link></li>
            <li><Link to="/landing#galeria">Ver galería</Link></li>
            <li><Link to="/landing#contacto">Contacto y ubicación</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Page404;
