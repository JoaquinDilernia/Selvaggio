import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GenIntro from '../sections/gen/GenIntro.jsx';
import GenInicio from '../sections/gen/GenInicio.jsx';
import GenCava from '../sections/gen/GenCava.jsx';
import GenReservar from '../sections/gen/GenReservar.jsx';
import GenPlatos from '../sections/gen/GenPlatos.jsx';
import GenTakeaway from '../sections/gen/GenTakeaway.jsx';
import GenMaridaje from '../sections/gen/GenMaridaje.jsx';
import GenPresuModal from '../sections/gen/GenPresuModal.jsx';
import GenFooter from '../sections/gen/GenFooter15.jsx';
import { initMaridaje, initPresupuesto } from '../legacy/disenoScripts.js';
import ReservaModal from '../reservas/ReservaModal.jsx';
// Propuesta A (web actual): Cómo funciona, Galería, Prensa y Trabajá con nosotros.
import ComoA from '../sections/a/ComoA.jsx';
import GaleriaA from '../sections/a/GaleriaA.jsx';
import PrensaA from '../sections/a/PrensaA.jsx';
import TrabajaA from '../sections/a/TrabajaA.jsx';
import '../styles/seccionesA.css';

const TIPOS_RESERVA = new Set(['mesa', 'evento', 'cava']);

// La bienvenida se muestra una vez por sesión.
function introYaVista() {
  try { return sessionStorage.getItem('v2-intro') === '1'; } catch { return false; }
}

export default function Home() {
  const navigate = useNavigate();
  const raiz = useRef(null);
  const [intro, setIntro] = useState(() => !introYaVista());
  const [reserva, setReserva] = useState(null); // 'mesa' | 'evento' | 'cava' | null

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

  const cerrarReserva = useCallback(() => setReserva(null), []);

  // Clicks del diseño que ahora van a la app.
  function onClick(e) {
    if (e.target.closest('#skip')) { setIntro(false); return; }
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href === '#armar') { e.preventDefault(); navigate('/take-away'); return; }
    const tipo = a.dataset.reserva;
    if (TIPOS_RESERVA.has(tipo)) { e.preventDefault(); setReserva(tipo); }
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div ref={raiz} onClick={onClick} style={{ fontFamily: 'Lora, Georgia, serif', color: '#3A2A33', background: '#EFECE2', width: '100%', overflowX: 'hidden' }}>
      {intro && <GenIntro />}
      <GenInicio />
      <ComoA />
      <GenCava />
      <GenReservar />
      <GaleriaA />
      <GenPlatos />
      <GenTakeaway />
      <PrensaA />
      <GenMaridaje />
      <TrabajaA />
      <GenPresuModal />
      <GenFooter />
      {reserva && <ReservaModal tipo={reserva} onClose={cerrarReserva} />}
    </div>
  );
}
