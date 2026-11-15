import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GenIntro from '../sections/gen/GenIntro.jsx';
import GenInicio from '../sections/gen/GenInicio.jsx';
import GenComo from '../sections/gen/GenComo.jsx';
import GenCava from '../sections/gen/GenCava.jsx';
import GenReservar from '../sections/gen/GenReservar.jsx';
import GenEspacio from '../sections/gen/GenEspacio.jsx';
import GenPlatos from '../sections/gen/GenPlatos.jsx';
import GenTakeaway from '../sections/gen/GenTakeaway.jsx';
import GenPrensa from '../sections/gen/GenPrensa.jsx';
import GenMaridaje from '../sections/gen/GenMaridaje.jsx';
import GenTrabaja from '../sections/gen/GenTrabaja.jsx';
import GenPresuModal from '../sections/gen/GenPresuModal.jsx';
import GenFooter from '../sections/gen/GenFooter15.jsx';
import { initMaridaje, initPresupuesto } from '../legacy/disenoScripts.js';

// Reservas: hasta que se conecte el formulario nuevo (fase 2), cada botón
// lleva al formulario que ya funciona en la web actual.
const RESERVA_ACTUAL = {
  mesa: 'https://selvaggio.com.ar/#/reserva-mesas',
  cava: 'https://selvaggio.com.ar/#/reserva-cava',
  evento: 'https://selvaggio.com.ar/#/reserva-mesas',
};

// La bienvenida se muestra una vez por sesión.
function introYaVista() {
  try { return sessionStorage.getItem('v2-intro') === '1'; } catch { return false; }
}

export default function Home() {
  const navigate = useNavigate();
  const raiz = useRef(null);
  const [intro, setIntro] = useState(() => !introYaVista());

  // Bienvenida animada: se va sola (5,3 s) o con "Saltear".
  useEffect(() => {
    if (!intro) return undefined;
    document.body.style.overflow = 'hidden';
    let reducido = false;
    try { reducido = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* sin matchMedia */ }
    const t = setTimeout(() => setIntro(false), reducido ? 2500 : 5300);
    return () => { clearTimeout(t); document.body.style.overflow = ''; };
  }, [intro]);
  useEffect(() => {
    if (!intro) { try { sessionStorage.setItem('v2-intro', '1'); } catch { /* modo privado */ } }
  }, [intro]);

  // Scripts del diseño (maridaje y presupuesto) + video del banner.
  useEffect(() => {
    const el = raiz.current;
    if (!el || el.dataset.listo) return;
    el.dataset.listo = '1';
    initMaridaje();
    initPresupuesto();
    const v = el.querySelector('video');
    if (v) { v.muted = true; v.play()?.catch(() => {}); }
  }, []);

  // Clicks del diseño que ahora van a la app.
  function onClick(e) {
    if (e.target.closest('#skip')) { setIntro(false); return; }
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href === '#armar') { e.preventDefault(); navigate('/take-away'); return; }
    const tipo = a.dataset.reserva;
    if (tipo && RESERVA_ACTUAL[tipo]) { e.preventDefault(); window.open(RESERVA_ACTUAL[tipo], '_blank', 'noopener'); }
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div ref={raiz} onClick={onClick} style={{ fontFamily: 'Lora, Georgia, serif', color: '#3A2A33', background: '#EFECE2', width: '100%', overflowX: 'hidden' }}>
      {intro && <GenIntro />}
      <GenInicio />
      <GenComo />
      <GenCava />
      <GenReservar />
      <GenEspacio />
      <GenPlatos />
      <GenTakeaway />
      <GenPrensa />
      <GenMaridaje />
      <GenTrabaja />
      <GenPresuModal />
      <GenFooter />
    </div>
  );
}
