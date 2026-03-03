import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './LandingDemo.css';

function LandingDemo() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Cargar Inter + Cormorant Garant desde Google Fonts
    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);

      // Animaciones de entrada al scroll
      const els = document.querySelectorAll('.ap-reveal');
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 80) {
          el.classList.add('ap-revealed');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div className="ap-root">

      {/* ── NAVBAR ── */}
      <header className={`ap-nav ${scrolled ? 'ap-nav--scrolled' : ''}`}>
        <div className="ap-nav__inner">
          {/* Logo */}
          <div className="ap-nav__logo">Selvaggio</div>

          {/* Links centrados */}
          <nav className={`ap-nav__links ${menuOpen ? 'ap-nav__links--open' : ''}`}>
            <button onClick={() => scrollTo('concepto')}>Concepto</button>
            <button onClick={() => scrollTo('cava')}>La Cava</button>
            <button onClick={() => scrollTo('como-funciona')}>Cómo funciona</button>
            <button onClick={() => scrollTo('contacto')}>Contacto</button>
          </nav>

          {/* CTA derecha + hamburger */}
          <div className="ap-nav__right">
            <Link to="/reserva-mesas" className="ap-btn ap-btn--pill ap-btn--dark">
              Reservar
            </Link>
            <button
              className="ap-nav__hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menú"
            >
              <span className={menuOpen ? 'open' : ''}></span>
              <span className={menuOpen ? 'open' : ''}></span>
              <span className={menuOpen ? 'open' : ''}></span>
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO con video ── */}
      <section className="ap-hero">
        {/* Video de fondo — cuando el cliente mande el video, descomentá el source */}
        <video
          ref={videoRef}
          className="ap-hero__video"
          autoPlay
          muted
          loop
          playsInline
          poster="/Hero.jpeg"
        >
          {/* <source src="/hero-video.mp4" type="video/mp4" /> */}
        </video>
        <div className="ap-hero__overlay" />

        <div className="ap-hero__content">
          <p className="ap-hero__eyebrow">Las Lomas de San Isidro — Wine Bar &amp; Delicatessen</p>
          <h1 className="ap-hero__title">
            Elegí tu vino.<br />
            <em>Armá tu momento.</em>
          </h1>
          <p className="ap-hero__sub">
            +150 etiquetas · Quesos importados · Fiambres artesanales<br className="ap-hero__br" />
            La primera experiencia de autoservicio premium en Buenos Aires.
          </p>
          <div className="ap-hero__actions">
            <Link to="/reserva-mesas" className="ap-btn ap-btn--pill ap-btn--white">
              Reservar mesa
            </Link>
            <Link to="/reserva-cava" className="ap-btn ap-btn--pill ap-btn--ghost-white">
              Reservar La Cava
            </Link>
          </div>
        </div>

        <button className="ap-hero__scroll-hint" onClick={() => scrollTo('stats')} aria-label="Ir abajo">
          <span />
        </button>
      </section>

      {/* ── STATS STRIP ── */}
      <section id="stats" className="ap-stats">
        <div className="ap-stats__inner">
          <div className="ap-stats__item ap-reveal">
            <span className="ap-stats__number">+150</span>
            <span className="ap-stats__label">etiquetas de vino</span>
          </div>
          <div className="ap-stats__divider" />
          <div className="ap-stats__item ap-reveal">
            <span className="ap-stats__number">100%</span>
            <span className="ap-stats__label">autoservicio premium</span>
          </div>
          <div className="ap-stats__divider" />
          <div className="ap-stats__item ap-reveal">
            <span className="ap-stats__number">2</span>
            <span className="ap-stats__label">espacios únicos</span>
          </div>
          <div className="ap-stats__divider" />
          <div className="ap-stats__item ap-reveal">
            <span className="ap-stats__number">Mié–Dom</span>
            <span className="ap-stats__label">19:00 – 02:00 hs</span>
          </div>
        </div>
      </section>

      {/* ── CONCEPTO ── */}
      <section id="concepto" className="ap-section ap-section--white">
        <div className="ap-section__inner ap-grid-2">
          <div className="ap-col ap-reveal">
            <p className="ap-eyebrow">El concepto</p>
            <h2 className="ap-heading">
              Una experiencia nueva.<br />
              A tu ritmo.
            </h2>
            <p className="ap-body">
              Selvaggio es la primera experiencia de autoservicio premium de vinos y
              picadas en Buenos Aires. Llegás, elegís lo que querés de nuestra selección
              curada, lo combinás a tu gusto y disfrutás sin apuros.
            </p>
            <p className="ap-body">
              Sin mozos que te presionen. Sin carta fija. Un espacio diseñado para que
              el encuentro sea el protagonista.
            </p>
            <button onClick={() => scrollTo('como-funciona')} className="ap-link-btn">
              Ver cómo funciona →
            </button>
          </div>
          <div className="ap-col ap-reveal ap-reveal--delay">
            <div className="ap-img-frame">
              <img src="/Hero.jpeg" alt="Concepto Selvaggio" className="ap-img" />
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section id="como-funciona" className="ap-section ap-section--light">
        <div className="ap-section__inner">
          <div className="ap-section__header ap-reveal">
            <p className="ap-eyebrow">El proceso</p>
            <h2 className="ap-heading ap-heading--center">Así de simple.</h2>
          </div>
          <div className="ap-steps">
            <div className="ap-step ap-reveal">
              <span className="ap-step__bg-num">01</span>
              <div className="ap-step__content">
                <h3 className="ap-step__title">Reservá tu lugar</h3>
                <p className="ap-step__body">
                  Elegí fecha, horario y cantidad de personas. Online, sin llamadas, sin esperas.
                </p>
              </div>
            </div>
            <div className="ap-step ap-reveal ap-reveal--delay">
              <span className="ap-step__bg-num">02</span>
              <div className="ap-step__content">
                <h3 className="ap-step__title">Elegí y servite</h3>
                <p className="ap-step__body">
                  Explorá +150 vinos en la cava autoservicio y armá tu picada con
                  quesos y fiambres seleccionados.
                </p>
              </div>
            </div>
            <div className="ap-step ap-reveal ap-reveal--delay2">
              <span className="ap-step__bg-num">03</span>
              <div className="ap-step__content">
                <h3 className="ap-step__title">Disfrutá sin apuros</h3>
                <p className="ap-step__body">
                  Tu mesa, tu ritmo, tu momento. El espacio está diseñado para que
                  te quedes el tiempo que necesitás.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LA CAVA ── */}
      <section id="cava" className="ap-section ap-section--dark">
        <div className="ap-section__inner ap-grid-2 ap-grid-2--reverse">
          <div className="ap-col ap-reveal">
            <p className="ap-eyebrow ap-eyebrow--muted">Espacio privado</p>
            <h2 className="ap-heading ap-heading--white">
              La Cava.
            </h2>
            <p className="ap-body ap-body--muted">
              Un espacio exclusivo para hasta 25 personas. Ideal para cumpleaños,
              despedidas, reuniones corporativas o cualquier celebración que merezca
              un ambiente diferente.
            </p>
            <p className="ap-body ap-body--muted">
              Carta privada, atención personalizada y una ambientación que lo hace único.
            </p>
            <Link
              to="/reserva-cava"
              className="ap-btn ap-btn--pill ap-btn--white"
              style={{ marginTop: '2rem', display: 'inline-block' }}
            >
              Consultar disponibilidad
            </Link>
          </div>
          <div className="ap-col ap-reveal ap-reveal--delay">
            <div className="ap-img-frame ap-img-frame--dark">
              <img src="/Hero.jpeg" alt="La Cava Selvaggio" className="ap-img" />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FULLWIDTH ── */}
      <section className="ap-cta">
        <div className="ap-cta__inner ap-reveal">
          <h2 className="ap-cta__title">¿Cuándo es tu próximo momento?</h2>
          <p className="ap-cta__sub">Mesas disponibles de miércoles a domingo.</p>
          <div className="ap-cta__actions">
            <Link to="/reserva-mesas" className="ap-btn ap-btn--pill ap-btn--dark ap-btn--large">
              Reservar mesa
            </Link>
            <Link to="/reserva-cava" className="ap-btn ap-btn--pill ap-btn--outline ap-btn--large">
              Reservar La Cava
            </Link>
          </div>
        </div>
      </section>

      {/* ── CONTACTO ── */}
      <section id="contacto" className="ap-section ap-section--white">
        <div className="ap-section__inner ap-reveal">
          <p className="ap-eyebrow">Hablemos</p>
          <h2 className="ap-heading">¿Tenés alguna consulta?</h2>
          <div className="ap-contact-grid">
            <div className="ap-contact-card">
              <span className="ap-contact-icon">📍</span>
              <h4>Dirección</h4>
              <p>Av. Fondo de la Legua 59<br />Las Lomas de San Isidro, Buenos Aires</p>
            </div>
            <div className="ap-contact-card">
              <span className="ap-contact-icon">🕐</span>
              <h4>Horarios</h4>
              <p>Miércoles a Domingo<br />19:00 – 02:00 hs</p>
            </div>
            <div className="ap-contact-card">
              <span className="ap-contact-icon">💬</span>
              <h4>WhatsApp</h4>
              <a href="https://wa.me/5491166864692" target="_blank" rel="noopener noreferrer">
                +54 9 11 6686–4692
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="ap-footer">
        <div className="ap-footer__inner">
          <div className="ap-footer__brand">
            <span className="ap-footer__logo">Selvaggio</span>
            <p className="ap-footer__tagline">Wine Bar &amp; Delicatessen</p>
          </div>
          <nav className="ap-footer__nav">
            <button onClick={() => scrollTo('concepto')}>Concepto</button>
            <button onClick={() => scrollTo('cava')}>La Cava</button>
            <button onClick={() => scrollTo('como-funciona')}>Cómo funciona</button>
            <Link to="/reserva-mesas">Reservas</Link>
          </nav>
          <div className="ap-footer__social">
            <a href="https://instagram.com/selvaggio.ba" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href="https://wa.me/5491166864692" target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
        <div className="ap-footer__legal">
          <span>© 2025 Selvaggio. Todos los derechos reservados.</span>
          <Link to="/terminos">Términos</Link>
          <Link to="/privacidad">Privacidad</Link>
        </div>
      </footer>

      {/* WhatsApp flotante */}
      <a
        href="https://wa.me/5491166864692?text=Hola!%20Quiero%20informaci%C3%B3n%20acerca%20de%20Selvaggio"
        target="_blank"
        rel="noopener noreferrer"
        className="ap-wa-float"
        aria-label="WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </a>

    </div>
  );
}

export default LandingDemo;
