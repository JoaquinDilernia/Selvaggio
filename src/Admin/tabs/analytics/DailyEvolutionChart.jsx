import { useEffect, useMemo, useRef, useState } from 'react';
import { claveDiaAR, inicioDiaAR } from '../../../utils/analyticsDate';
import { CLICK_TIPOS } from './funnels';

const esClick = (e, categoria) =>
  categoria === 'todas' ? Object.values(CLICK_TIPOS).includes(e.tipo) : e.tipo === CLICK_TIPOS[categoria];

const esConversion = (e, categoria) =>
  e.tipo === 'conversion' && (categoria === 'todas' || e.categoria === categoria);

const ALTO = 200;
const PADDING = { top: 16, right: 16, bottom: 24, left: 16 };
const UN_DIA_MS = 24 * 60 * 60 * 1000;

const construirDias = (fechaDesde, fechaHasta) => {
  const dias = [];
  let cursor = inicioDiaAR(fechaDesde);
  const fin = inicioDiaAR(fechaHasta);
  while (cursor <= fin) {
    dias.push(claveDiaAR(cursor));
    cursor = new Date(cursor.getTime() + UN_DIA_MS);
  }
  return dias;
};

function DailyEvolutionChart({ eventosActuales, categoria, fechaDesde, fechaHasta }) {
  const contenedorRef = useRef(null);
  const [ancho, setAncho] = useState(600);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setAncho(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const dias = useMemo(() => construirDias(fechaDesde, fechaHasta), [fechaDesde, fechaHasta]);

  const { clicks, conversiones } = useMemo(() => {
    const clicksPorDia = Object.fromEntries(dias.map(d => [d, 0]));
    const conversionesPorDia = Object.fromEntries(dias.map(d => [d, 0]));
    eventosActuales.forEach(e => {
      const clave = claveDiaAR(e.timestamp);
      if (!(clave in clicksPorDia)) return;
      if (esClick(e, categoria)) clicksPorDia[clave]++;
      if (esConversion(e, categoria)) conversionesPorDia[clave]++;
    });
    return {
      clicks: dias.map(d => clicksPorDia[d]),
      conversiones: dias.map(d => conversionesPorDia[d]),
    };
  }, [eventosActuales, categoria, dias]);

  const max = Math.max(1, ...clicks, ...conversiones);
  const anchoUtil = Math.max(1, ancho - PADDING.left - PADDING.right);
  const altoUtil = ALTO - PADDING.top - PADDING.bottom;
  const pasoX = dias.length > 1 ? anchoUtil / (dias.length - 1) : 0;

  const x = i => PADDING.left + i * pasoX;
  const y = valor => PADDING.top + altoUtil - (valor / max) * altoUtil;
  const puntos = serie => serie.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const handleMove = e => {
    if (dias.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const posX = e.clientX - rect.left;
    const indice = Math.round((posX - PADDING.left) / (pasoX || 1));
    setHover(Math.min(dias.length - 1, Math.max(0, indice)));
  };

  const gridY = [0, 0.25, 0.5, 0.75, 1].map(f => PADDING.top + altoUtil * f);
  const formatearFecha = clave => clave.split('-').reverse().join('/');

  return (
    <div className="an-evol">
      <h3 className="an-evol__titulo">Evolución diaria</h3>
      <div className="an-evol__leyenda">
        <span className="an-evol__leyenda-item"><i className="an-evol__swatch an-evol__swatch--clicks" /> Clicks</span>
        <span className="an-evol__leyenda-item"><i className="an-evol__swatch an-evol__swatch--conversiones" /> Conversiones</span>
      </div>
      <div
        className="an-evol__contenedor"
        ref={contenedorRef}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg width={ancho} height={ALTO} className="an-evol__svg">
          {gridY.map(gy => (
            <line key={gy} x1={PADDING.left} x2={ancho - PADDING.right} y1={gy} y2={gy} className="an-evol__grid" />
          ))}
          <polyline points={puntos(clicks)} className="an-evol__linea an-evol__linea--clicks" />
          <polyline points={puntos(conversiones)} className="an-evol__linea an-evol__linea--conversiones" />
          {hover !== null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={PADDING.top} y2={ALTO - PADDING.bottom} className="an-evol__crosshair" />
              <circle cx={x(hover)} cy={y(clicks[hover])} r={3.5} className="an-evol__punto an-evol__punto--clicks" />
              <circle cx={x(hover)} cy={y(conversiones[hover])} r={3.5} className="an-evol__punto an-evol__punto--conversiones" />
            </>
          )}
        </svg>
        {hover !== null && (
          <div className="an-evol__tooltip" style={{ left: Math.min(x(hover) + 10, ancho - 130), top: 8 }}>
            <strong>{formatearFecha(dias[hover])}</strong>
            <span>Clicks: {clicks[hover]}</span>
            <span>Conversiones: {conversiones[hover]}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyEvolutionChart;
