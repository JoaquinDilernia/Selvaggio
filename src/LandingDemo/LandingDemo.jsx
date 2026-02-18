import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingDemo.css';

function LandingDemo() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Cargar fuente de Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Montserrat:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const handleScroll = () => {
      const elements = document.querySelectorAll('.fade-in-scroll');
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight - 100;
        if (isVisible) {
          el.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMenuOpen(false);
    }
  };

  return (
    <div className="demo-landing">
      {/* Navbar estilo Framer */}
      <nav className="demo-nav">
        <div className="demo-nav-container">
          <button 
            className="demo-menu-toggle" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className="demo-logo-script">Selvaggio</div>
          
          <div className={`demo-nav-links ${menuOpen ? 'active' : ''}`}>
            <button onClick={() => scrollToSection('vinos-picadas')}>CARTA</button>
            <button onClick={() => scrollToSection('propuesta')}>NUESTRA PROPUESTA</button>
            <Link to="/reserva-cava" className="demo-nav-link">RESERVAR LA CAVA</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Estilo Framer */}
      <section className="demo-hero">
        <div className="demo-hero-bg"></div>
        
        <div className="demo-hero-content">
          <h1 className="demo-hero-title-script">
            <span className="demo-script-line">Tu picada</span>
            <span className="demo-script-line">A tu manera</span>
          </h1>
        </div>

        {/* Cards flotantes - Estilo Framer */}
        <div className="demo-floating-cards">
          <Link to="/reserva-mesas" className="demo-float-card">
            <img src="/vinos.picada.demo.jpeg" alt="Vinos & Picadas" className="demo-card-img" />
            <div className="demo-card-content">
              <h3>VINOS & PICADAS</h3>
              <span className="demo-card-arrow">→</span>
            </div>
          </Link>
          
          <Link to="/reserva-cava" className="demo-float-card cava-destacada">
            <img src="/cava.demo.jpeg" alt="La Cava - Eventos" className="demo-card-img" />
            <div className="demo-card-content">
              <h3>LA CAVA</h3>
              <p className="demo-card-subtitle">Reservá para eventos</p>
              <span className="demo-card-arrow">→</span>
            </div>
            <div className="demo-cava-badge">EVENTOS EXCLUSIVOS</div>
          </Link>
          
          <button onClick={() => window.location.href = '/#/'} className="demo-float-card">
            <img src="/propuesta.demo.jpeg" alt="Nuestra Propuesta" className="demo-card-img" />
            <div className="demo-card-content">
              <h3>NUESTRA PROPUESTA</h3>
              <span className="demo-card-arrow">→</span>
            </div>
          </button>
        </div>

        {/* Iconos redes sociales en el hero */}
        <div className="demo-hero-social">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a href="https://wa.me/5491166864692" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Location">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/>
            </svg>
          </a>
        </div>
      </section>

      {/* Botón WhatsApp flotante */}
      <a 
        href="https://wa.me/5491166864692?text=Hola! Quiero consultar sobre Selvaggio" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="demo-whatsapp-float"
        aria-label="Contactar por WhatsApp"
      >
        <svg viewBox="0 0 32 32" className="demo-whatsapp-icon">
          <path fill="currentColor" d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 7.933-2.127c2.42 1.37 5.173 2.127 8.067 2.127 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.467c-2.482 0-4.908-0.646-7.07-1.87l-0.507-0.292-4.713 1.262 1.262-4.669-0.292-0.508c-1.207-2.100-1.847-4.507-1.847-6.923 0-7.435 6.050-13.485 13.485-13.485s13.485 6.050 13.485 13.485c0 7.435-6.050 13.485-13.485 13.485zM22.282 18.778c-0.398-0.199-2.361-1.163-2.726-1.297s-0.632-0.199-0.898 0.199c-0.265 0.398-1.029 1.297-1.261 1.563s-0.465 0.298-0.863 0.099c-0.398-0.199-1.680-0.619-3.199-1.975-1.182-1.054-1.980-2.357-2.211-2.755s-0.025-0.613 0.174-0.811c0.179-0.178 0.398-0.465 0.597-0.697s0.265-0.398 0.398-0.664c0.133-0.265 0.066-0.497-0.033-0.697s-0.898-2.164-1.230-2.963c-0.324-0.779-0.652-0.673-0.898-0.686-0.232-0.012-0.497-0.015-0.763-0.015s-0.697 0.099-1.062 0.497c-0.365 0.398-1.394 1.363-1.394 3.327s1.427 3.859 1.627 4.125c0.199 0.265 2.807 4.288 6.802 6.014 0.950 0.411 1.691 0.657 2.269 0.841 0.955 0.303 1.825 0.260 2.513 0.158 0.767-0.115 2.361-0.966 2.695-1.897s0.332-1.730 0.232-1.897c-0.099-0.166-0.365-0.265-0.763-0.465z"/>
        </svg>
      </a>
    </div>
  );
}

export default LandingDemo;
