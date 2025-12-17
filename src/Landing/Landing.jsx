import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { updateAllSEO } from '../utils/seo';
import ContactForm from './ContactForm';
import MaridajesSection from './MaridajesSection';
import VinosSection from './VinosSection';
import ProductosSection from './ProductosSection';
import GaleriaSection from './GaleriaSection';
import ReseñasSection from './ReseñasSection';
import PrensaSection from './PrensaSection';
import NewsletterSection from './NewsletterSection';
import TrabajaForm from './TrabajaForm';
import './Landing.css';
import './LandingDark.css';
import './MaridajesSection.css';
import './CatalogSections.css';
import './GaleriaSection.css';
import './ReseñasSection.css';
import './PrensaSection.css';
import './NewsletterSection.css';
import './TrabajaForm.css';

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Actualizar SEO al montar el componente
    updateAllSEO({
      title: 'Wine Bar & Delicatessen',
      description: 'Elegí tu vino, armá tu picada y creá tu momento en Selvaggio. Primera experiencia de autoservicio premium con +150 etiquetas, quesos importados y fiambres artesanales en Las Lomas de San Isidro, Buenos Aires.',
      image: 'https://selvaggio.com.ar/Hero.jpeg',
      url: 'https://selvaggio.com.ar/'
    });

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      // Animaciones al scroll
      const elements = document.querySelectorAll('.animate-on-scroll');
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight - 100;
        if (isVisible) {
          el.classList.add('animated');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleNavClick = (e, target) => {
    e.preventDefault();
    closeMenu();
    const element = document.querySelector(target);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      {/* Header / Navbar */}
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-content">
          <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="nav-logo" loading="lazy" />
          
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav className={`nav-links ${menuOpen ? 'active' : ''}`}>
            <a href="#como-funciona" onClick={(e) => handleNavClick(e, '#como-funciona')}>Cómo funciona</a>
            <a href="#cava" onClick={(e) => handleNavClick(e, '#cava')}>La Cava</a>
            <a href="#vinos" onClick={(e) => handleNavClick(e, '#vinos')}>Vinos</a>
            <a href="#galeria" onClick={(e) => handleNavClick(e, '#galeria')}>Galería</a>
            <a href="#trabaja-con-nosotros" onClick={(e) => handleNavClick(e, '#trabaja-con-nosotros')}>Trabajá con nosotros</a>
            <a href="#contacto" onClick={(e) => handleNavClick(e, '#contacto')}>Contacto</a>
          </nav>
        </div>
      </header>

      {/* Botón flotante WhatsApp */}
      <a 
        href="https://wa.me/5491166864692?text=Hola!%20Quiero%20consultar%20sobre%20Selvaggio" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="whatsapp-float"
        aria-label="Contactar por WhatsApp"
      >
        <svg viewBox="0 0 32 32" className="whatsapp-icon">
          <path fill="currentColor" d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 7.933-2.127c2.42 1.37 5.173 2.127 8.067 2.127 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.467c-2.482 0-4.908-0.646-7.07-1.87l-0.507-0.292-4.713 1.262 1.262-4.669-0.292-0.508c-1.207-2.100-1.847-4.507-1.847-6.923 0-7.435 6.050-13.485 13.485-13.485s13.485 6.050 13.485 13.485c0 7.435-6.050 13.485-13.485 13.485zM22.282 18.778c-0.398-0.199-2.361-1.163-2.726-1.297s-0.632-0.199-0.898 0.199c-0.265 0.398-1.029 1.297-1.261 1.563s-0.465 0.298-0.863 0.099c-0.398-0.199-1.680-0.619-3.199-1.975-1.182-1.054-1.980-2.357-2.211-2.755s-0.025-0.613 0.174-0.811c0.179-0.178 0.398-0.465 0.597-0.697s0.265-0.398 0.398-0.664c0.133-0.265 0.066-0.497-0.033-0.697s-0.898-2.164-1.230-2.963c-0.324-0.779-0.652-0.673-0.898-0.686-0.232-0.012-0.497-0.015-0.763-0.015s-0.697 0.099-1.062 0.497c-0.365 0.398-1.394 1.363-1.394 3.327s1.427 3.859 1.627 4.125c0.199 0.265 2.807 4.288 6.802 6.014 0.950 0.411 1.691 0.657 2.269 0.841 0.955 0.303 1.825 0.260 2.513 0.158 0.767-0.115 2.361-0.966 2.695-1.897s0.332-1.730 0.232-1.897c-0.099-0.166-0.365-0.265-0.763-0.465z"/>
        </svg>
      </a>

      {/* Hero Section */}
      <section className="hero parallax">
        <div className="hero-overlay"></div>
        <div className="hero-content animate-on-scroll">
          <div className="hero-badge">San Isidro. Buenos Aires</div>
          <h1 className="hero-title">Elegí tu vino.<br/>Armá tu picada.<br/>Creá tu momento.</h1>
          <p className="hero-subtitle">La primera experiencia de autoservicio premium de vinos y picadas artesanales</p>
          <div className="hero-features">
            <span className="hero-feature">+150 etiquetas seleccionadas</span>
            <span className="hero-feature">Quesos y fiambres premium</span>
            <span className="hero-feature">Ambiente bohemio único</span>
          </div>
          <div className="hero-buttons">
            <a href="#cava" className="btn-primary" onClick={(e) => handleNavClick(e, '#cava')}>Reservar La Cava</a>
            <a href="#como-funciona" className="btn-secondary" onClick={(e) => handleNavClick(e, '#como-funciona')}>Cómo funciona</a>
          </div>
        </div>
      </section>

      {/* Presentación */}
      <section className="presentacion-section">
        <div className="presentacion-content animate-on-scroll">
          <p className="text-intro">
            En Selvaggio la experiencia la creás vos. Elegís tu vino, armás tu propia picada y 
            disfrutás de un momento auténtico y libre. Un espacio pensado para compartir sin prisa, 
            sin reglas y a tu manera.
          </p>
        </div>
      </section>

      {/* Info Bar - Sin reservas */}
      <section className="disclaimer-bar animate-on-scroll">
        <div className="disclaimer-content">
          <p><strong>No tomamos reservas para mesas.</strong> La experiencia funciona por orden de llegada.</p>
        </div>
      </section>

      {/* Cómo Funciona */}
      <section id="como-funciona" className="como-funciona-section">
        <div className="section-content">
          <h2 className="section-title animate-on-scroll">Cómo funciona</h2>
          <div className="pasos-grid">
            <div className="paso-card animate-on-scroll">
              <div className="paso-numero">1</div>
              <h3>Elegí tu vino</h3>
              <p>Amplia cava con etiquetas seleccionadas. Llevalo a tu mesa y disfrutá.</p>
            </div>
            <div className="paso-card animate-on-scroll">
              <div className="paso-numero">2</div>
              <h3>Armá tu propia picada</h3>
              <p>Autoservicio premium: elegís quesos, fiambres, panes y acompañamientos. La idea es armar la tabla a tu gusto.</p>
            </div>
            <div className="paso-card animate-on-scroll">
              <div className="paso-numero">3</div>
              <h3>Disfrutá tu momento</h3>
              <p>Ambiente cálido, bohemio, libre. Mesas, luces bajas, música suave. Un refugio para compartir sin prisa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Concepto */}
      <section className="concepto-section animate-on-scroll">
        <div className="concepto-content">
          <h2>Nuestro concepto</h2>
          <p>
            Somos un wine bar de autoservicio con una selección de vinos y productos premium. 
            Acá vos decidís qué tomar, qué comer y cómo vivir tu noche.
          </p>
        </div>
      </section>

      {/* La Cava / Espacio Privado */}
      <section id="cava" className="cava-section">
        <div className="section-content">
          <div className="cava-grid">
            <div className="cava-image animate-on-scroll">
              <img src="/cava2.jpeg" alt="La Cava Selvaggio" className="cava-photo" loading="lazy" />
            </div>
            <div className="cava-text animate-on-scroll">
              <h2 className="section-title-left">La Cava</h2>
              <p className="text-large">
                Espacio privado exclusivo al fondo del local. Ideal para eventos íntimos, 
                degustaciones corporativas, cumpleaños o celebraciones especiales.
              </p>
              <p>
                Reservalo para tu grupo (hasta 25 personas) y viví una experiencia única 
                rodeados de vinos premium en un ambiente de diseño exclusivo.
              </p>
              <div className="cava-cta">
                <a href="https://wa.me/5491156864692?text=Hola!%20Quiero%20reservar%20la%20cava%20para%20un%20evento" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="btn-reservar-cava">
                  Reservar la cava
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Maridajes Perfectos - Administrable desde Firebase */}
      <MaridajesSection />

      {/* Vinos - Administrable desde Firebase */}
      <VinosSection />

      {/* Quesos y Fiambres - Administrable desde Firebase */}
      <ProductosSection />

      {/* Galería - Administrable desde Firebase */}
      <GaleriaSection />

      {/* Prensa - Administrable desde Firebase */}
      <PrensaSection />

      {/* Reseñas de Clientes - Administrable desde Firebase */}
      <ReseñasSection />

      {/* Proof Social / Por qué elegirnos */}
      <section className="proof-section">
        <div className="section-content">
          <h2 className="section-title animate-on-scroll">Por qué Selvaggio</h2>
          <div className="proof-grid">
            <div className="proof-card animate-on-scroll">
              <div className="proof-number">+150</div>
              <p className="proof-label">Etiquetas seleccionadas de Argentina y el mundo</p>
            </div>
            <div className="proof-card animate-on-scroll">
              <div className="proof-number">100%</div>
              <p className="proof-label">Autoservicio premium - vos decidís tu experiencia</p>
            </div>
            <div className="proof-card animate-on-scroll">
              <div className="proof-number">25</div>
              <p className="proof-label">Personas en La Cava - ideal para eventos privados</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ubicación y Contacto */}
      <section id="contacto" className="ubicacion-section">
        <div className="section-content">
          <h2 className="section-title animate-on-scroll">Encontranos</h2>
          <div className="ubicacion-grid">
            <div className="ubicacion-info animate-on-scroll">
              <h3>Dirección</h3>
              <p className="direccion-text">Av. Fondo de la Legua 59<br/>Las Lomas de San Isidro<br/>Provincia de Buenos Aires</p>
              
              <h3>Horarios</h3>
              <p>Miércoles a Domingo<br/>19:00 - 02:00 hs</p>
              
              <h3>Contacto</h3>
              <div className="contacto-buttons">
                <a href="https://wa.me/5491166864692" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                  WhatsApp
                </a>
                <a href="https://www.instagram.com/selvaggio.ba?igsh=MW1lbnVkcjdzcWUyeQ==" target="_blank" rel="noopener noreferrer" className="btn-instagram">
                  Instagram
                </a>
                <a href="https://share.google/rIt9wQZcOADUj5LSJ" target="_blank" rel="noopener noreferrer" className="btn-google-reviews">
                  ⭐ Dejanos tu Reseña
                </a>
              </div>
            </div>
            
            <div className="ubicacion-mapa animate-on-scroll">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d602.6709172988616!2d-58.55017203372157!3d-34.49503954986952!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcb13eaece2c37%3A0x380e14c52f570f4c!2sSelvaggio%20Wine!5e0!3m2!1ses!2sar!4v1765803366842!5m2!1ses!2sar" 
                width="100%" 
                height="450" 
                style={{border: 0}} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación Selvaggio - Av. Fondo de la Legua 59"
              ></iframe>
            </div>
          </div>

          {/* Formulario de Contacto */}
          <div className="contacto-form-container animate-on-scroll">
            <h3 className="form-title">Envianos tu consulta</h3>
            <p className="form-subtitle">¿Querés reservar la cava o hacer una consulta? Dejanos tus datos</p>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSection />

      {/* Trabajá con nosotros */}
      <TrabajaForm />

      {/* Feedback Section */}
      <section className="feedback-section animate-on-scroll">
        <div className="feedback-content">
          <h2>¿Ya nos visitaste?</h2>
          <p>Tu opinión nos ayuda a mejorar tu experiencia</p>
          <Link to="/formulario" className="btn-feedback">
            Dejanos tu feedback
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <img src="/logotipo-sin-fondo-violeta.png" alt="Selvaggio" className="footer-logo" loading="lazy" />
          <div className="footer-links">
            <a href="https://www.instagram.com/selvaggio.ba?igsh=MW1lbnVkcjdzcWUyeQ==" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://wa.me/5491166864692" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a href="#trabaja-con-nosotros" onClick={(e) => handleNavClick(e, '#trabaja-con-nosotros')}>Trabajá con nosotros</a>
            <a href="#contacto" onClick={(e) => handleNavClick(e, '#contacto')}>Contacto</a>
          </div>
          <p className="footer-copy">© 2025 Selvaggio Wine Bar. Elegí tu vino, armá tu picada, creá tu momento.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
