import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './LandingDemo.css';

function LandingDemo() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef(null);

  // Datos reales de Firebase
  const [galeria, setGaleria] = useState([]);
  const [reseñas, setReseñas] = useState([]);
  const [prensa, setPrensa] = useState([]);
  const [cartaUrl, setCartaUrl] = useState(null);
  const [showStickyBtn, setShowStickyBtn] = useState(false);

  useEffect(() => {
    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Fetch galería
    getDocs(collection(db, 'selvaggio_galeria')).then((snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((f) => f.visible !== false)
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setGaleria(items);
    }).catch(() => {});

    // Fetch reseñas
    getDocs(collection(db, 'selvaggio_reseñas')).then((snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.visible !== false)
        .sort((a, b) => {
          if (a.destacada && !b.destacada) return -1;
          if (!a.destacada && b.destacada) return 1;
          return (b.calificacion || 5) - (a.calificacion || 5);
        });
      setReseñas(items);
    }).catch(() => {});

    // Fetch prensa
    getDocs(collection(db, 'selvaggio_prensa')).then((snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.visible !== false)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setPrensa(items);
    }).catch(() => {});

    // Fetch carta PDF URL (stored by AdminCarta at selvaggio_configuracion/carta)
    getDoc(doc(db, 'selvaggio_configuracion', 'carta')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.url && !data.eliminada) setCartaUrl(data.url);
      }
    }).catch(() => {});

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
      setShowStickyBtn(window.scrollY > window.innerHeight * 0.75);
      const els = document.querySelectorAll('.ap-reveal');
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 60) {
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

  const renderEstrellas = (n = 5) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < n ? 'ap-star ap-star--on' : 'ap-star'}>★</span>
    ));

  const formatFecha = (str) => {
    if (!str) return '';
    return new Date(str).toLocaleDateString('es-AR', { year: 'numeric', month: 'long' });
  };

  const formatFechaLarga = (str) => {
    if (!str) return '';
    return new Date(str).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Fallback photos for gallery if Firebase is empty
  const galeriaFallback = [
    { id: 'f1', url: '/demo1.png', titulo: 'Ambiente' },
    { id: 'f2', url: '/demo2.png', titulo: 'Eventos' },
    { id: 'f3', url: '/demo3.png', titulo: 'Vinos' },
    { id: 'f4', url: '/demo4.png', titulo: 'El espacio' },
    { id: 'f5', url: '/demo5.png', titulo: 'Picadas' },
    { id: 'f6', url: '/demo6.png', titulo: 'La Cava' },
  ];
  const galeriaItems = galeria.length > 0 ? galeria : galeriaFallback;

  return (
    <div className="ap-root">

      {/* ── NAVBAR ── */}
      <header className={`ap-nav ${scrolled ? 'ap-nav--scrolled' : ''}`}>
        <div className="ap-nav__inner">
          <div className="ap-nav__logo-wrap">
            <span className="ap-nav__logo-text">Selvaggio</span>
          </div>

          <nav className={`ap-nav__links ${menuOpen ? 'ap-nav__links--open' : ''}`}>
            <button onClick={() => scrollTo('concepto')}>Concepto</button>
            <button onClick={() => scrollTo('propuesta')}>La Propuesta</button>
            <button onClick={() => scrollTo('cava')}>La Cava</button>
            {prensa.length > 0 && <button onClick={() => scrollTo('prensa')}>Prensa</button>}
            <button onClick={() => scrollTo('contacto')}>Contacto</button>
          </nav>

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

      {/* ── HERO ── */}
      <section className="ap-hero">
        <video ref={videoRef} className="ap-hero__video" autoPlay muted loop playsInline poster="/demo1.png">
          <source src="/demo-video.mp4" type="video/mp4" />
        </video>
        <div className="ap-hero__overlay" />
        <div className="ap-hero__content">
          <p className="ap-hero__eyebrow">Las Lomas de San Isidro · Wine Bar &amp; Delicatessen</p>
          <h1 className="ap-hero__title">
            Elegí tu vino.<br />
            <em>Armá tu momento.</em>
          </h1>
          <p className="ap-hero__sub">
            +150 etiquetas · Quesos importados · Fiambres artesanales<br className="ap-hero__br" />
            La primera experiencia de autoservicio premium en Buenos Aires.
          </p>
          <div className="ap-hero__actions">
            <Link to="/reserva-mesas" className="ap-btn ap-btn--pill ap-btn--white">Reservar mesa</Link>
            <Link to="/reserva-cava" className="ap-btn ap-btn--pill ap-btn--ghost-white">Reservar La Cava</Link>
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
            <span className="ap-stats__number">25</span>
            <span className="ap-stats__label">personas en La Cava</span>
          </div>
          <div className="ap-stats__divider" />
          <div className="ap-stats__item ap-reveal">
            <span className="ap-stats__number">Mar–Dom</span>
            <span className="ap-stats__label">Vie y Sáb hasta las 02:00</span>
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
              <em>A tu ritmo.</em>
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
            <button onClick={() => scrollTo('propuesta')} className="ap-link-btn">
              Ver la propuesta →
            </button>
          </div>
          <div className="ap-col ap-reveal ap-reveal--delay">
            <div className="ap-img-frame">
              <img src="/foto1.jpeg" alt="Interior Selvaggio" className="ap-img" />
            </div>
          </div>
        </div>
      </section>

      {/* ── LA PROPUESTA ── */}
      <section id="propuesta" className="ap-section ap-section--light">
        <div className="ap-section__inner ap-grid-2 ap-grid-2--reverse">
          <div className="ap-col ap-reveal">
            <p className="ap-eyebrow">La oferta</p>
            <h2 className="ap-heading">
              Todo lo que<br />
              <em>necesitás.</em>
            </h2>
            <div className="ap-features">
              <div className="ap-feature">
                <div className="ap-feature__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.02 12.02.708.707M3 12h1m16 0h1M4.927 19.073l.707-.707M18.364 5.636l.707-.707" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </div>
                <div>
                  <h4 className="ap-feature__title">+150 etiquetas de vino</h4>
                  <p className="ap-feature__text">Tintos, blancos, rosados y espumantes. Nacionales e importados, seleccionados por sommeliers.</p>
                </div>
              </div>
              <div className="ap-feature">
                <div className="ap-feature__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </div>
                <div>
                  <h4 className="ap-feature__title">Quesos &amp; fiambres artesanales</h4>
                  <p className="ap-feature__text">Selección de quesos importados y fiambres artesanales. Armá tu picada exactamente como querés.</p>
                </div>
              </div>
              <div className="ap-feature">
                <div className="ap-feature__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="ap-feature__title">Tu tiempo, tu espacio</h4>
                  <p className="ap-feature__text">Sin apuros ni presiones. El espacio está diseñado para que te quedes el tiempo que necesitás.</p>
                </div>
              </div>
            </div>
            {cartaUrl && (
              <a href={cartaUrl} target="_blank" rel="noopener noreferrer" className="ap-btn ap-btn--pill ap-btn--dark" style={{ marginTop: '32px', display: 'inline-block', textDecoration: 'none' }}>
                Ver carta
              </a>
            )}
          </div>
          <div className="ap-col ap-reveal ap-reveal--delay">
            <div className="ap-img-frame">
              <img src="/vinos.picada.demo.jpeg" alt="Vinos y picada Selvaggio" className="ap-img" />
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section id="como-funciona" className="ap-section ap-section--white">
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
                <p className="ap-step__body">Elegí fecha, horario y cantidad de personas. Online, sin llamadas, sin esperas.</p>
              </div>
            </div>
            <div className="ap-step ap-reveal ap-reveal--delay">
              <span className="ap-step__bg-num">02</span>
              <div className="ap-step__content">
                <h3 className="ap-step__title">Elegí y servite</h3>
                <p className="ap-step__body">Explorá +150 vinos en la cava autoservicio y armá tu picada con quesos y fiambres seleccionados.</p>
              </div>
            </div>
            <div className="ap-step ap-reveal ap-reveal--delay2">
              <span className="ap-step__bg-num">03</span>
              <div className="ap-step__content">
                <h3 className="ap-step__title">Disfrutá sin apuros</h3>
                <p className="ap-step__body">Tu mesa, tu ritmo, tu momento. El espacio está diseñado para que te quedes el tiempo que necesitás.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALERÍA — datos reales de Firebase ── */}
      <section className="ap-gallery">
        <div className="ap-gallery__inner">
          <div className="ap-gallery__header ap-reveal">
            <p className="ap-eyebrow ap-eyebrow--center">El espacio</p>
            <h2 className="ap-heading ap-heading--center">Viví la experiencia.</h2>
          </div>
          <div className={`ap-gallery__grid ap-gallery__grid--${Math.min(galeriaItems.length, 6) >= 4 ? '3col' : '2col'}`}>
            {galeriaItems.slice(0, 6).map((foto, i) => (
              <div key={foto.id} className={`ap-gallery__item ap-reveal${i === 0 ? '' : i % 3 === 0 ? ' ap-reveal--delay' : ' ap-reveal--delay2'}`}>
                <img src={foto.url} alt={foto.titulo} className="ap-gallery__img" loading="lazy" />
                {foto.titulo && (
                  <div className="ap-gallery__caption">{foto.titulo}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LA CAVA ── */}
      <section id="cava" className="ap-section ap-section--dark">
        <div className="ap-section__inner ap-grid-2 ap-grid-2--reverse">
          <div className="ap-col ap-reveal">
            <p className="ap-eyebrow ap-eyebrow--muted">Espacio privado</p>
            <h2 className="ap-heading ap-heading--white">La Cava.</h2>
            <p className="ap-body ap-body--muted">
              Un espacio exclusivo para hasta 25 personas. Ideal para cumpleaños,
              despedidas, reuniones corporativas o cualquier celebración que merezca
              un ambiente diferente.
            </p>
            <p className="ap-body ap-body--muted">
              Carta privada, atención personalizada y una ambientación pensada para
              hacer de cada evento algo único e irrepetible.
            </p>
            <Link to="/reserva-cava" className="ap-btn ap-btn--pill ap-btn--white" style={{ marginTop: '2rem', display: 'inline-block' }}>
              Consultar disponibilidad
            </Link>
          </div>
          <div className="ap-col ap-reveal ap-reveal--delay">
            <div className="ap-img-frame ap-img-frame--dark">
              <img src="/demo5.png" alt="La Cava Selvaggio" className="ap-img" />
            </div>
          </div>
        </div>
      </section>

      {/* ── PRENSA — datos reales de Firebase ── */}
      {prensa.length > 0 && (
        <section id="prensa" className="ap-section ap-section--light">
          <div className="ap-section__inner">
            <div className="ap-section__header ap-reveal">
              <p className="ap-eyebrow">Medios</p>
              <h2 className="ap-heading ap-heading--center">En los medios.</h2>
            </div>
            <div className="ap-prensa-grid">
              {prensa.map((nota, i) => (
                <article
                  key={nota.id}
                  className={`ap-prensa-card ap-reveal${i === 0 ? '' : i % 2 === 0 ? ' ap-reveal--delay2' : ' ap-reveal--delay'}`}
                >
                  {nota.imagen && (
                    <div className="ap-prensa-img-wrap">
                      <img src={nota.imagen} alt={nota.titulo} className="ap-prensa-img" loading="lazy" />
                    </div>
                  )}
                  <div className="ap-prensa-body">
                    <div className="ap-prensa-medio">{nota.medio}</div>
                    <h3 className="ap-prensa-titulo">{nota.titulo}</h3>
                    {nota.descripcion && (
                      <p className="ap-prensa-desc">{nota.descripcion}</p>
                    )}
                    <div className="ap-prensa-foot">
                      {nota.fecha && (
                        <span className="ap-prensa-fecha">{formatFechaLarga(nota.fecha)}</span>
                      )}
                      {nota.url && (
                        <a href={nota.url} target="_blank" rel="noopener noreferrer" className="ap-prensa-link">
                          Leer artículo →
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RESEÑAS — datos reales de Firebase ── */}
      {reseñas.length > 0 && (
        <section className="ap-section ap-section--white">
          <div className="ap-section__inner">
            <div className="ap-section__header ap-reveal">
              <p className="ap-eyebrow">Opiniones</p>
              <h2 className="ap-heading ap-heading--center">Lo que dicen.</h2>
            </div>
            <div className="ap-reviews">
              {reseñas.slice(0, 3).map((r, i) => (
                <div
                  key={r.id}
                  className={`ap-review${r.destacada ? ' ap-review--destacada' : ''} ap-reveal${i === 0 ? '' : i === 1 ? ' ap-reveal--delay' : ' ap-reveal--delay2'}`}
                >
                  <div className="ap-review__stars">{renderEstrellas(r.calificacion || 5)}</div>
                  <blockquote className="ap-review__text">"{r.comentario}"</blockquote>
                  <div className="ap-review__author">
                    <div className="ap-review__avatar">{r.nombre.charAt(0).toUpperCase()}</div>
                    <div>
                      <span className="ap-review__name">{r.nombre}</span>
                      {r.fecha && <span className="ap-review__location">{formatFecha(r.fecha)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA FULLWIDTH ── */}
      <section className="ap-cta">
        <div className="ap-cta__inner ap-reveal">
          <h2 className="ap-cta__title">¿Cuándo es tu próximo momento?</h2>
          <p className="ap-cta__sub">Mesas disponibles de martes a domingo.</p>
          <div className="ap-cta__actions">
            <Link to="/reserva-mesas" className="ap-btn ap-btn--pill ap-btn--white ap-btn--large">Reservar mesa</Link>
            <Link to="/reserva-cava" className="ap-btn ap-btn--pill ap-btn--outline ap-btn--large">Reservar La Cava</Link>
          </div>
        </div>
      </section>

      {/* ── CONTACTO ── */}
      <section id="contacto" className="ap-section ap-section--white">
        <div className="ap-section__inner">
          <div className="ap-contact-top ap-reveal">
            <p className="ap-eyebrow">Encontranos</p>
            <h2 className="ap-heading">¿Tenés alguna consulta?</h2>
          </div>
          <div className="ap-contact-grid ap-reveal">
            <div className="ap-contact-card">
              <div className="ap-contact-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <h4>Dirección</h4>
              <p>Av. Fondo de la Legua 59<br />Las Lomas de San Isidro, Buenos Aires</p>
              <a href="https://maps.google.com/?q=Av.+Fondo+de+la+Legua+59+Las+Lomas+de+San+Isidro" target="_blank" rel="noopener noreferrer" className="ap-contact-link">
                Ver en el mapa →
              </a>
            </div>
            <div className="ap-contact-card">
              <div className="ap-contact-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4>Horarios</h4>
              <div className="ap-horarios-grid">
                {[
                  { day: 'Lun', open: false },
                  { day: 'Mar', open: true,  hrs: '19:00 – 00:00' },
                  { day: 'Mié', open: true,  hrs: '19:00 – 00:00' },
                  { day: 'Jue', open: true,  hrs: '19:00 – 00:00' },
                  { day: 'Vie', open: true,  hrs: '19:00 – 02:00' },
                  { day: 'Sáb', open: true,  hrs: '19:00 – 02:00' },
                  { day: 'Dom', open: true,  hrs: '19:00 – 00:00' },
                ].map(d => (
                  <div key={d.day} className={`ap-horario-row${d.open ? ' ap-horario-row--open' : ''}`}>
                    <span className="ap-horario-day">{d.day}</span>
                    <span className="ap-horario-hrs">{d.open ? d.hrs : 'Cerrado'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="ap-contact-card">
              <div className="ap-contact-icon-wrap">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </div>
              <h4>WhatsApp</h4>
              <a href="https://wa.me/5491166864692?text=Hola!%20Quiero%20informaci%C3%B3n%20acerca%20de%20Selvaggio" target="_blank" rel="noopener noreferrer" className="ap-contact-link">
                +54 9 11 6686–4692
              </a>
            </div>
            <div className="ap-contact-card">
              <div className="ap-contact-icon-wrap">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              <h4>Instagram</h4>
              <a href="https://instagram.com/selvaggio.ba" target="_blank" rel="noopener noreferrer" className="ap-contact-link">
                @selvaggio.ba
              </a>
            </div>
          </div>
          <div className="ap-map-wrap ap-reveal">
            <iframe
              title="Selvaggio ubicación"
              src="https://maps.google.com/maps?q=Av.+Fondo+de+la+Legua+59,+Las+Lomas+de+San+Isidro,+Buenos+Aires,+Argentina&z=16&output=embed"
              width="100%"
              height="340"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
      <footer className="ap-footer">
        <div className="ap-footer__inner">
          <div className="ap-footer__brand">
            <span className="ap-footer__logo-text">Selvaggio</span>
            <p className="ap-footer__tagline">Wine Bar &amp; Delicatessen</p>
          </div>
          <nav className="ap-footer__nav">
            <button onClick={() => scrollTo('concepto')}>Concepto</button>
            <button onClick={() => scrollTo('propuesta')}>La Propuesta</button>
            <button onClick={() => scrollTo('cava')}>La Cava</button>
            {prensa.length > 0 && <button onClick={() => scrollTo('prensa')}>Prensa</button>}
            <Link to="/reserva-mesas">Reservas</Link>
          </nav>
          <div className="ap-footer__social">
            <a href="https://instagram.com/selvaggio.ba" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://wa.me/5491166864692" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          </div>
        </div>
        <div className="ap-footer__legal">
          <span>© 2025 Selvaggio. Todos los derechos reservados.</span>
          <Link to="/terminos">Términos</Link>
          <Link to="/privacidad">Privacidad</Link>
        </div>
      </footer>

      {/* Botón sticky Reservar */}
      <Link
        to="/reserva-mesas"
        className={`ap-sticky-reservar${showStickyBtn ? ' ap-sticky-reservar--visible' : ''}`}
      >
        Reservar mesa
      </Link>

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
