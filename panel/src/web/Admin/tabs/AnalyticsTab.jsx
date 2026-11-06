import { useState, useEffect } from 'react';
import { authFetch, BASE_URL } from '../../../lib/api';
import { claveDiaAR, inicioDiaAR } from '../../utils/analyticsDate';
import FiltersBar from './analytics/FiltersBar';
import { RANGOS } from './analytics/rangos';
import FunnelsSection from './analytics/FunnelsSection';
import DayOfWeekChart from './analytics/DayOfWeekChart';
import DailyEvolutionChart from './analytics/DailyEvolutionChart';
import CavaSection, { variacion, fechaCorta } from './analytics/CavaSection';
import { descargarCsv } from './analytics/exportCsv';
import './TabsShared.css';
import './AnalyticsTab.css';

const hoyAR = () => claveDiaAR(new Date());

const restarDias = (claveDia, dias) => {
  const d = inicioDiaAR(claveDia);
  d.setUTCDate(d.getUTCDate() - dias);
  return claveDiaAR(d);
};

const RANGO_DEFAULT = RANGOS.find(r => r.id === '7d');

// Panorama general del período fuera de La Cava (el chat entero y la web).
function Panorama({ actual, anterior }) {
  const items = [
    { label: 'Conversaciones del chat', valor: actual.conversaciones, previo: anterior.conversaciones, sub: `${actual.conversacionesNuevas} nuevas` },
    { label: 'Visitas a la página de La Cava', valor: actual.visitasCava, previo: anterior.visitasCava },
    { label: "Toques en 'Reservar La Cava'", valor: actual.toquesCava, previo: anterior.toquesCava, sub: 'botón de la web' },
  ];
  return (
    <div className="an-panorama">
      {items.map(i => {
        const badge = variacion(i.valor, i.previo);
        return (
          <div key={i.label} className="an-panorama__item">
            <span className="an-kpi__label">{i.label}</span>
            <span className="an-panorama__valor">{i.valor.toLocaleString('es-AR')}</span>
            <span className="an-kpi__pie">
              {badge && <span className={`an-badge an-badge--${badge.tono}`}>{badge.texto}</span>}
              {i.sub && <span className="an-kpi__sub">{i.sub}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsTab() {
  const [preset, setPreset] = useState('7d');
  const [fechaDesde, setFechaDesde] = useState(() => restarDias(hoyAR(), RANGO_DEFAULT.dias - 1));
  const [fechaHasta, setFechaHasta] = useState(hoyAR);
  const [categoria, setCategoria] = useState('todas');
  const [eventosActuales, setEventosActuales] = useState([]);
  const [eventosAnteriores, setEventosAnteriores] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, [fechaDesde, fechaHasta]);

  // Lo trae el backend: las reglas de Firestore solo dejan leer analytics al
  // rol admin (al resto le daba todo 0) y las conversaciones del bot no se
  // pueden leer desde el navegador.
  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const r = await authFetch(`${BASE_URL}/api/gestion/analytics?desde=${fechaDesde}&hasta=${fechaHasta}`);
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.error || `Error ${r.status}`);
      const todos = json.eventos.map(e => ({ ...e, timestamp: new Date(e.t) }));
      setEventosActuales(todos.filter(e => e.t >= json.inicioActualMs));
      setEventosAnteriores(todos.filter(e => e.t < json.inicioActualMs));
      setData(json);
    } catch (err) {
      console.error('Error cargando analytics:', err);
      setError(err.message || 'No se pudieron cargar los datos');
      setEventosActuales([]);
      setEventosAnteriores([]);
      setData(null);
    } finally {
      setCargando(false);
    }
  };

  const handlePreset = (id) => {
    const r = RANGOS.find(x => x.id === id);
    setPreset(id);
    setFechaHasta(hoyAR());
    setFechaDesde(restarDias(hoyAR(), r.dias - 1));
  };

  const handleFechaDesde = (valor) => {
    setPreset(null);
    setFechaDesde(valor);
    if (valor > fechaHasta) setFechaHasta(valor);
  };

  const handleFechaHasta = (valor) => {
    setPreset(null);
    const hoy = hoyAR();
    const clamped = valor > hoy ? hoy : valor;
    setFechaHasta(clamped);
    if (clamped < fechaDesde) setFechaDesde(clamped);
  };

  return (
    <div className="tab-inner an-root">
      <div className="tab-header an-header">
        <div>
          <h2>Analytics</h2>
          <p>
            La Cava, el chat y la web, del {fechaCorta(fechaDesde)} al {fechaCorta(fechaHasta)}.
            Medido de forma propia, independiente del pixel de Meta.
          </p>
        </div>
        <button
          type="button"
          className="an-export"
          disabled={!data}
          onClick={() => data && descargarCsv(data)}
        >
          Exportar CSV
        </button>
      </div>

      <FiltersBar
        preset={preset}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        categoria={categoria}
        onPreset={handlePreset}
        onFechaDesde={handleFechaDesde}
        onFechaHasta={handleFechaHasta}
        onCategoria={setCategoria}
      />

      {cargando ? (
        <div className="an-skeleton" aria-label="Cargando">
          {[0, 1, 2, 3, 4, 5].map(i => <span key={i} />)}
        </div>
      ) : error ? (
        <div className="loading-state">No se pudieron cargar los datos: {error}</div>
      ) : (
        <>
          <CavaSection data={data} />

          <section className="an-seccion">
            <div className="an-seccion__head">
              <h3 className="an-seccion__titulo">Panorama</h3>
            </div>
            <Panorama actual={data.resumen.actual} anterior={data.resumen.anterior} />
          </section>

          <section className="an-seccion">
            <div className="an-seccion__head">
              <h3 className="an-seccion__titulo">Embudos de la web</h3>
              <span className="an-card__nota">del botón a la reserva o el pedido confirmado</span>
            </div>
            <FunnelsSection
              eventosActuales={eventosActuales}
              eventosAnteriores={eventosAnteriores}
              categoria={categoria}
            />
            <div className="an-grid-2 an-grid-2--parejo">
              <DayOfWeekChart eventosActuales={eventosActuales} categoria={categoria} />
              <DailyEvolutionChart
                eventosActuales={eventosActuales}
                categoria={categoria}
                fechaDesde={fechaDesde}
                fechaHasta={fechaHasta}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default AnalyticsTab;
