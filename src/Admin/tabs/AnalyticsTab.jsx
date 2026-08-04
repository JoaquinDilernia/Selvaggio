import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { claveDiaAR, inicioDiaAR, finDiaAR } from '../../utils/analyticsDate';
import './TabsShared.css';
import './AnalyticsTab.css';

const RANGOS = [
  { id: 'hoy', label: 'Hoy', dias: 1 },
  { id: '7d', label: 'Últimos 7 días', dias: 7 },
  { id: '30d', label: 'Últimos 30 días', dias: 30 },
];

const FUNNELS = {
  cava: {
    titulo: 'La Cava',
    pasos: [
      { tipo: 'click_reservar_cava', label: "Click en 'Reservar La Cava'" },
      { tipo: 'view_content', label: 'Vio la página' },
      { tipo: 'checkout_iniciado', label: 'Inició el formulario' },
      { tipo: 'conversion', label: 'Reserva confirmada' },
    ],
  },
  mesa: {
    titulo: 'Mesa',
    pasos: [
      { tipo: 'click_reservar_mesa', label: "Click en 'Reservar Mesa'" },
      { tipo: 'view_content', label: 'Vio la página' },
      { tipo: 'checkout_iniciado', label: 'Inició el formulario' },
      { tipo: 'conversion', label: 'Reserva confirmada' },
    ],
  },
  takeaway: {
    titulo: 'Take Away',
    pasos: [
      { tipo: 'click_take_away', label: "Click en 'Take Away'" },
      { tipo: 'view_content', label: 'Vio el catálogo' },
      { tipo: 'add_to_cart', label: 'Agregó al carrito' },
      { tipo: 'checkout_iniciado', label: 'Inició el checkout' },
      { tipo: 'conversion', label: 'Pedido confirmado' },
    ],
  },
};

const hoyAR = () => claveDiaAR(new Date());

const restarDias = (claveDia, dias) => {
  const d = inicioDiaAR(claveDia);
  d.setUTCDate(d.getUTCDate() - dias);
  return claveDiaAR(d);
};

const RANGO_DEFAULT = RANGOS.find(r => r.id === '7d');

function AnalyticsTab() {
  const [preset, setPreset] = useState('7d');
  const [fechaDesde, setFechaDesde] = useState(() => restarDias(hoyAR(), RANGO_DEFAULT.dias - 1));
  const [fechaHasta, setFechaHasta] = useState(hoyAR);
  const [eventosActuales, setEventosActuales] = useState([]);
  const [eventosAnteriores, setEventosAnteriores] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, [fechaDesde, fechaHasta]);

  const cargar = async () => {
    setCargando(true);
    try {
      const inicioActual = inicioDiaAR(fechaDesde);
      const finActual = finDiaAR(fechaHasta);
      const duracionMs = finActual.getTime() - inicioActual.getTime();
      const inicioAnterior = new Date(inicioActual.getTime() - duracionMs);

      const q = query(
        collection(db, 'selvaggio_analytics_eventos'),
        where('timestamp', '>=', Timestamp.fromDate(inicioAnterior)),
        where('timestamp', '<=', Timestamp.fromDate(finActual))
      );
      const snap = await getDocs(q);
      const todos = snap.docs.map(d => d.data());
      setEventosActuales(todos.filter(e => e.timestamp.toMillis() >= inicioActual.getTime()));
      setEventosAnteriores(todos.filter(e => e.timestamp.toMillis() < inicioActual.getTime()));
    } catch (err) {
      console.error('Error cargando analytics:', err);
      setEventosActuales([]);
      setEventosAnteriores([]);
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

  const contar = (eventos, categoria, tipo) =>
    eventos.filter(e => e.categoria === categoria && e.tipo === tipo).length;

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>Analytics</h2>
        <p>Tráfico y funnel de conversión, medidos de forma nativa e independiente del pixel de Meta.</p>
      </div>

      <div className="filters-bar">
        {RANGOS.map(r => (
          <button
            key={r.id}
            className={`filter-btn${preset === r.id ? ' active' : ''}`}
            onClick={() => handlePreset(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="loading-state">Cargando…</div>
      ) : (
        <div className="an-funnels">
          {Object.entries(FUNNELS).map(([categoria, { titulo, pasos }]) => {
            const conteos = pasos.map(p => contar(eventosActuales, categoria, p.tipo));
            const max = Math.max(1, ...conteos);
            return (
              <div key={categoria} className="an-funnel">
                <h3 className="an-funnel__titulo">{titulo}</h3>
                {pasos.map((paso, i) => {
                  const valor = conteos[i];
                  const anterior = i > 0 ? conteos[i - 1] : null;
                  const caida = anterior ? Math.round(100 - (valor / Math.max(anterior, 1)) * 100) : null;
                  const pct = Math.round((valor / max) * 100);
                  return (
                    <div key={paso.tipo} className="an-funnel__paso">
                      <div className="an-funnel__paso-header">
                        <span className="an-funnel__paso-label">{paso.label}</span>
                        <span className="an-funnel__paso-valor">{valor}</span>
                      </div>
                      <div className="an-funnel__barra-track">
                        <div className="an-funnel__barra-fill" style={{ width: `${pct}%` }} />
                      </div>
                      {caida !== null && (
                        <span className="an-funnel__caida">
                          {caida > 0 ? `−${caida}% vs. paso anterior` : 'sin caída'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AnalyticsTab;
